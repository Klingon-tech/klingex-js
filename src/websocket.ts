import type {
  WebSocketOptions,
  WsOrderResult,
  WsCancelResult,
  WsPlaceOrderParams,
  WsCancelOrderParams,
  UserChannel,
  Timeframe,
} from './types';

type MessageHandler<T = unknown> = (data: T) => void;
type ErrorHandler = (error: Error) => void;

interface MarketSubscription {
  kind: 'market';
  /** "BTC-USDT", or "markets" for the markets list. */
  market: string;
  /** Optional filter: only invoke if incoming message `type` matches one of these. */
  types?: Set<string>;
  handler: MessageHandler;
}

interface UserSubscription {
  kind: 'user';
  channel: UserChannel;
  handler: MessageHandler;
}

interface OhlcvSubscription {
  kind: 'ohlcv';
  marketId: number;
  timeframe: string;
  handler: MessageHandler;
}

interface InvoiceSubscription {
  kind: 'invoice';
  invoiceId: string;
  handler: MessageHandler;
}

interface QrSubscription {
  kind: 'qr';
  sessionToken: string;
  handler: MessageHandler;
}

type Subscription =
  | MarketSubscription
  | UserSubscription
  | OhlcvSubscription
  | InvoiceSubscription
  | QrSubscription;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Server `type` field -> SDK user-channel name. Unknown user-typed events
 * (payload has `user_id` but `type` is not in this map) are dropped
 * silently; if the exchange ships a brand-new user event type, extend
 * this table.
 */
const USER_TYPE_TO_CHANNEL: Record<string, string> = {
  // balance
  balance_update: 'balance',
  balance_updated: 'balance',
  // orders
  order_created: 'orders',
  order_updated: 'orders',
  order_placed: 'orders',
  order_partial: 'orders',
  order_filled: 'orders',
  order_cancelled: 'orders',
  order_rejected: 'orders',
  // transfer
  transfer_updated: 'transfer',
  // deposits
  deposit_created: 'deposits',
  deposit_confirming: 'deposits',
  deposit_completed: 'deposits',
  deposit_rejected: 'deposits',
  deposit_updated: 'deposits',
  // withdrawals
  withdrawal_pending: 'withdrawals',
  withdrawal_processing: 'withdrawals',
  withdrawal_completed: 'withdrawals',
  withdrawal_failed: 'withdrawals',
  withdrawal_updated: 'withdrawals',
  // user trades
  user_trade: 'trades',
  trade_filled: 'trades',
  // notifications + account
  new_notification: 'notifications',
  account_event: 'account',
};

function inferUserChannel(msgType: string | undefined): string | null {
  if (!msgType) return null;
  return USER_TYPE_TO_CHANNEL[msgType] ?? null;
}

/**
 * KlingEx WebSocket client. Implements the real on-wire protocol:
 *   - Market data: `{action:"subscribe", market:"BTC-USDT"}` — one subscription
 *     receives ticker, orderbook, and trades for that pair. Filter on the
 *     `type` field of each incoming message.
 *   - Markets list: `{action:"subscribe", market:"markets"}`.
 *   - User channels: `{action:"subscribe", type:"<channel>"}` where channel is
 *     one of `balance|orders|transfer|deposits|withdrawals|notifications|trades|account`.
 *     Requires API-key auth (sent post-connect as `{type:"auth", apiKey:"..."}`)
 *     and waits for `{type:"auth_result", success:true}` before subscribing.
 *   - OHLCV: `{action:"subscribe_ohlcv", market_id, timeframe}`.
 *   - Invoice: `{action:"subscribe_invoice", invoice_id}`.
 *   - QR: `{action:"subscribe_qr", session_token}`.
 *   - Ping: `{action:"ping"}` -> server replies `{type:"pong"}`.
 *
 * JWT is intentionally not supported.
 */
export class KlingExWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private apiKey: string;
  private options: Required<WebSocketOptions>;
  /** Subscription state keyed by a deterministic string. */
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private errorHandler?: ErrorHandler;
  private pendingRequests = new Map<string, PendingRequest>();
  /** Resolved once the server confirms API-key auth (success). */
  private authResolved: Promise<void> | null = null;
  private resolveAuth: (() => void) | null = null;
  private rejectAuth: ((err: Error) => void) | null = null;
  private authTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    url: string,
    auth: { apiKey: string },
    options: WebSocketOptions = {}
  ) {
    this.url = url;
    this.apiKey = auth.apiKey;
    this.options = {
      reconnect: options.reconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 5000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      authTimeout: options.authTimeout ?? 10000,
    };
  }

  /**
   * Connect to WebSocket server. If an API key is configured, the connect
   * promise also waits for the server's `auth_result` reply, so callers can
   * subscribe to user channels immediately after `await connect()` resolves.
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      // Already connected/connecting — if auth is pending, await it.
      if (this.authResolved) {
        await this.authResolved;
      }
      return;
    }

    this.isConnecting = true;
    this.primeAuthGate();

    await new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          // Send auth message before resubscribing.
          if (this.apiKey) {
            this.sendRaw({ type: 'auth', apiKey: this.apiKey });
          } else {
            // No API key — resolve the auth gate immediately.
            this.markAuthResolved();
          }
          resolve();
        };

        this.ws.onclose = (event) => {
          this.isConnecting = false;
          this.stopPingInterval();
          this.failAuthGate(new Error('Connection closed before auth completed'));
          this.rejectAllPending('Connection closed');

          if (this.options.reconnect && !event.wasClean) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (_event) => {
          this.isConnecting = false;
          const err = new Error('WebSocket error');
          this.errorHandler?.(err);
          reject(err);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data as string);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });

    // Wait for auth_result if we sent an auth message.
    if (this.authResolved) {
      await this.authResolved;
    }

    // Resubscribe (after auth, so user-channel resubs succeed).
    this.resubscribeAll();
  }

  /**
   * Disconnect from WebSocket server.
   */
  disconnect(): void {
    this.options.reconnect = false;
    this.stopPingInterval();
    this.failAuthGate(new Error('Client disconnected'));
    this.rejectAllPending('Client disconnected');

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.subscriptions.clear();
  }

  /**
   * Register an error handler.
   */
  onError(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  // =========================================================================
  // Trading (request/response over WS)
  // =========================================================================

  async placeOrder(params: WsPlaceOrderParams): Promise<WsOrderResult> {
    const result = (await this.sendRequest('place_order', {
      symbol: params.symbol,
      tradingPairId: params.tradingPairId,
      side: params.side,
      quantity: params.quantity,
      price: params.price,
      rawValues: params.rawValues,
    })) as WsOrderResult;
    if (!result.success) {
      throw new Error(result.error || 'Order failed');
    }
    return result;
  }

  async cancelOrder(params: WsCancelOrderParams): Promise<WsCancelResult> {
    const result = (await this.sendRequest('cancel_order', {
      orderId: params.orderId,
      tradingPairId: params.tradingPairId,
    })) as WsCancelResult;
    if (!result.success) {
      throw new Error(result.error || 'Cancel failed');
    }
    return result;
  }

  // =========================================================================
  // Market data subscriptions (public)
  // =========================================================================

  /**
   * Subscribe to a market and receive ticker/orderbook/trades updates for it.
   * The handler is invoked for every message tagged with this market. Filter
   * by `message.type` (e.g. `"orderbook"`, `"ticker"`, `"trade"`).
   */
  subscribeMarket(market: string, handler: MessageHandler): () => void {
    const key = `market:${market}`;
    const sub: MarketSubscription = { kind: 'market', market, handler };
    this.subscriptions.set(key, sub);
    if (this.isOpen()) {
      this.sendRaw({ action: 'subscribe', market });
    }
    return () => {
      this.subscriptions.delete(key);
      if (this.isOpen()) {
        this.sendRaw({ action: 'unsubscribe', market });
      }
    };
  }

  /**
   * Convenience: subscribe to a market and filter to orderbook updates.
   * Returned unsubscribe also tears down the underlying market subscription.
   * Backend emits `orderbook_snapshot` frames (legacy `orderbook` is also
   * accepted for forward-compat).
   */
  orderbook(market: string, handler: MessageHandler): () => void {
    return this.subscribeMarketWithFilter(market, ['orderbook_snapshot', 'orderbook'], handler);
  }

  /**
   * Convenience: subscribe to a market and filter to trade events.
   * Backend emits `trade_update` (legacy `trade`/`trades` also accepted).
   */
  trades(market: string, handler: MessageHandler): () => void {
    return this.subscribeMarketWithFilter(market, ['trade_update', 'trade', 'trades'], handler);
  }

  /**
   * Convenience: subscribe to a market and filter to ticker updates.
   * Backend emits `ticker_update` (legacy `ticker` also accepted).
   */
  ticker(market: string, handler: MessageHandler): () => void {
    return this.subscribeMarketWithFilter(market, ['ticker_update', 'ticker'], handler);
  }

  /**
   * Subscribe to the global markets list channel.
   */
  marketsList(handler: MessageHandler): () => void {
    return this.subscribeMarket('markets', handler);
  }

  /**
   * Subscribe to OHLCV updates for a market + timeframe.
   */
  subscribeOhlcv(
    marketId: number,
    timeframe: Timeframe | string,
    handler: MessageHandler
  ): () => void {
    const key = `ohlcv:${marketId}:${timeframe}`;
    const sub: OhlcvSubscription = { kind: 'ohlcv', marketId, timeframe, handler };
    this.subscriptions.set(key, sub);
    if (this.isOpen()) {
      this.sendRaw({
        action: 'subscribe_ohlcv',
        market_id: marketId,
        timeframe,
      });
    }
    return () => {
      this.subscriptions.delete(key);
      if (this.isOpen()) {
        this.sendRaw({
          action: 'unsubscribe_ohlcv',
          market_id: marketId,
          timeframe,
        });
      }
    };
  }

  /**
   * Subscribe to invoice payment updates for a specific invoice ID. Public
   * channel — no auth required.
   */
  subscribeInvoice(invoiceId: string, handler: MessageHandler): () => void {
    const key = `invoice:${invoiceId}`;
    const sub: InvoiceSubscription = { kind: 'invoice', invoiceId, handler };
    this.subscriptions.set(key, sub);
    if (this.isOpen()) {
      this.sendRaw({ action: 'subscribe_invoice', invoice_id: invoiceId });
    }
    return () => {
      this.subscriptions.delete(key);
      if (this.isOpen()) {
        this.sendRaw({ action: 'unsubscribe_invoice', invoice_id: invoiceId });
      }
    };
  }

  /**
   * Subscribe to QR-login status updates for a session token. Public channel.
   */
  subscribeQR(sessionToken: string, handler: MessageHandler): () => void {
    const key = `qr:${sessionToken}`;
    const sub: QrSubscription = { kind: 'qr', sessionToken, handler };
    this.subscriptions.set(key, sub);
    if (this.isOpen()) {
      this.sendRaw({ action: 'subscribe_qr', session_token: sessionToken });
    }
    return () => {
      this.subscriptions.delete(key);
      if (this.isOpen()) {
        this.sendRaw({ action: 'unsubscribe_qr', session_token: sessionToken });
      }
    };
  }

  // =========================================================================
  // User channel subscriptions (require API-key auth)
  // =========================================================================

  subscribeUser(channel: UserChannel, handler: MessageHandler): () => void {
    const key = `user:${channel}`;
    const sub: UserSubscription = { kind: 'user', channel, handler };
    this.subscriptions.set(key, sub);
    if (this.isOpen()) {
      this.sendRaw({ action: 'subscribe', type: channel });
    }
    return () => {
      this.subscriptions.delete(key);
      if (this.isOpen()) {
        this.sendRaw({ action: 'unsubscribe', type: channel });
      }
    };
  }

  userOrders(handler: MessageHandler): () => void {
    return this.subscribeUser('orders', handler);
  }

  userBalances(handler: MessageHandler): () => void {
    return this.subscribeUser('balance', handler);
  }

  userTrades(handler: MessageHandler): () => void {
    return this.subscribeUser('trades', handler);
  }

  userDeposits(handler: MessageHandler): () => void {
    return this.subscribeUser('deposits', handler);
  }

  userWithdrawals(handler: MessageHandler): () => void {
    return this.subscribeUser('withdrawals', handler);
  }

  userTransfers(handler: MessageHandler): () => void {
    return this.subscribeUser('transfer', handler);
  }

  userNotifications(handler: MessageHandler): () => void {
    return this.subscribeUser('notifications', handler);
  }

  accountEvents(handler: MessageHandler): () => void {
    return this.subscribeUser('account', handler);
  }

  // =========================================================================
  // Internal
  // =========================================================================

  private subscribeMarketWithFilter(
    market: string,
    typeFilter: string[],
    handler: MessageHandler
  ): () => void {
    // We allow multiple filtered subscriptions per market by keying on (market, types).
    // Internally they're all separate entries that all match the same incoming
    // messages from the server; the server only needs one subscribe per market.
    const key = `market:${market}:${typeFilter.join(',')}`;
    const sub: MarketSubscription = {
      kind: 'market',
      market,
      types: new Set(typeFilter),
      handler,
    };
    this.subscriptions.set(key, sub);

    const sendIfNeeded = () => {
      // If no other subscription for this market exists, send subscribe.
      if (!this.hasOtherMarketSub(market, key) && this.isOpen()) {
        this.sendRaw({ action: 'subscribe', market });
      }
    };
    sendIfNeeded();

    return () => {
      this.subscriptions.delete(key);
      if (!this.hasOtherMarketSub(market, key) && this.isOpen()) {
        this.sendRaw({ action: 'unsubscribe', market });
      }
    };
  }

  private hasOtherMarketSub(market: string, excludeKey: string): boolean {
    for (const [k, sub] of this.subscriptions) {
      if (k === excludeKey) continue;
      if (sub.kind === 'market' && sub.market === market) return true;
    }
    return false;
  }

  private isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private primeAuthGate(): void {
    if (!this.apiKey) {
      this.authResolved = Promise.resolve();
      this.resolveAuth = null;
      this.rejectAuth = null;
      return;
    }
    this.authResolved = new Promise<void>((resolve, reject) => {
      this.resolveAuth = resolve;
      this.rejectAuth = reject;
    });
    if (this.authTimer) clearTimeout(this.authTimer);
    this.authTimer = setTimeout(() => {
      this.failAuthGate(new Error('Timed out waiting for auth_result'));
    }, this.options.authTimeout);
    // Don't let a rejected auth gate become an unhandled rejection: callers
    // that don't `await connect()` shouldn't crash the process.
    this.authResolved.catch(() => {
      /* swallowed — surfaced via onError + thrown by awaiting callers */
    });
  }

  private markAuthResolved(): void {
    if (this.authTimer) {
      clearTimeout(this.authTimer);
      this.authTimer = null;
    }
    this.resolveAuth?.();
    this.resolveAuth = null;
    this.rejectAuth = null;
  }

  private failAuthGate(err: Error): void {
    if (this.authTimer) {
      clearTimeout(this.authTimer);
      this.authTimer = null;
    }
    if (this.rejectAuth) {
      this.rejectAuth(err);
      this.resolveAuth = null;
      this.rejectAuth = null;
      this.errorHandler?.(err);
    }
  }

  private sendRequest(
    action: string,
    data: Record<string, unknown>,
    timeout = 10000
  ): Promise<unknown> {
    const requestId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
        timer,
      });

      this.sendRaw({ action, requestId, ...data });
    });
  }

  private rejectAllPending(reason: string): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pendingRequests.clear();
  }

  private sendRaw(data: unknown): void {
    if (this.isOpen()) {
      this.ws!.send(JSON.stringify(data));
    }
  }

  private handleMessage(raw: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw) as Record<string, unknown>;
    } catch (error) {
      this.errorHandler?.(error instanceof Error ? error : new Error('Failed to parse message'));
      return;
    }

    const msgType = message.type as string | undefined;

    // 1) Server-level frames.
    if (msgType === 'pong') {
      return;
    }
    if (msgType === 'auth_result') {
      if (message.success) {
        this.markAuthResolved();
      } else {
        this.failAuthGate(new Error(String(message.error ?? 'Auth failed')));
      }
      return;
    }
    if (msgType === 'subscribed') {
      // Acknowledgement; nothing to dispatch.
      return;
    }
    if (msgType === 'error') {
      this.errorHandler?.(new Error(String(message.message ?? 'WebSocket error')));
      return;
    }

    // 2) Request/response correlation for trading frames.
    if (msgType === 'order_result' || msgType === 'cancel_result') {
      const requestId = message.requestId as string | undefined;
      if (requestId && this.pendingRequests.has(requestId)) {
        const pending = this.pendingRequests.get(requestId)!;
        this.pendingRequests.delete(requestId);
        pending.resolve(message);
        return;
      }
    }

    // 3) Dispatch to subscriptions.
    this.dispatchToSubscriptions(message, msgType);
  }

  private dispatchToSubscriptions(
    message: Record<string, unknown>,
    msgType: string | undefined
  ): void {
    const market = message.market as string | undefined;
    const invoiceId = message.invoice_id as string | undefined;
    const sessionToken = message.session_token as string | undefined;
    const ohlcvMarketId =
      typeof message.market_id === 'number' ? (message.market_id as number) : undefined;
    const ohlcvTimeframe = message.timeframe as string | undefined;
    const userId = message.user_id as string | undefined;

    // Discriminate user vs public events on `user_id`: backend private
    // OrderUpdate / UserTradeUpdate payloads carry both `user_id` AND
    // `market`, so we cannot use the absence of `market` to identify
    // user frames, nor the absence of `user_id` to identify public ones.
    const userChannel = inferUserChannel(msgType);
    const isUserEvent = !!userId || userChannel !== null;
    const isPublicMarketEvent = !!market && !isUserEvent;

    for (const sub of this.subscriptions.values()) {
      switch (sub.kind) {
        case 'market': {
          if (!isPublicMarketEvent) break;
          if (market !== sub.market) break;
          if (sub.types && msgType && !sub.types.has(msgType)) break;
          sub.handler(message);
          break;
        }
        case 'user': {
          if (!isUserEvent) break;
          if (invoiceId) break;
          if (sessionToken) break;
          if (ohlcvMarketId !== undefined && ohlcvTimeframe) break;
          // Unknown user-typed events (no map entry) are dropped: the
          // server-side broadcast `client_count` and similar global frames
          // have no `user_id`, so they won't get here; but if a brand-new
          // user event type ships server-side without an SDK update, we
          // prefer silent-drop to spamming every handler.
          if (userChannel === sub.channel) {
            sub.handler(message);
          }
          break;
        }
        case 'ohlcv': {
          if (ohlcvMarketId === sub.marketId && ohlcvTimeframe === sub.timeframe) {
            sub.handler(message);
          }
          break;
        }
        case 'invoice': {
          if (invoiceId === sub.invoiceId) {
            sub.handler(message);
          }
          break;
        }
        case 'qr': {
          if (sessionToken === sub.sessionToken) {
            sub.handler(message);
          }
          break;
        }
      }
    }
  }

  private resubscribeAll(): void {
    // De-dup market subscribes so we only send one subscribe per market.
    const sentMarkets = new Set<string>();
    for (const sub of this.subscriptions.values()) {
      switch (sub.kind) {
        case 'market':
          if (!sentMarkets.has(sub.market)) {
            this.sendRaw({ action: 'subscribe', market: sub.market });
            sentMarkets.add(sub.market);
          }
          break;
        case 'user':
          this.sendRaw({ action: 'subscribe', type: sub.channel });
          break;
        case 'ohlcv':
          this.sendRaw({
            action: 'subscribe_ohlcv',
            market_id: sub.marketId,
            timeframe: sub.timeframe,
          });
          break;
        case 'invoice':
          this.sendRaw({ action: 'subscribe_invoice', invoice_id: sub.invoiceId });
          break;
        case 'qr':
          this.sendRaw({ action: 'subscribe_qr', session_token: sub.sessionToken });
          break;
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.errorHandler?.(new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        this.errorHandler?.(error instanceof Error ? error : new Error('Reconnection failed'));
      });
    }, delay);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.sendRaw({ action: 'ping' });
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
