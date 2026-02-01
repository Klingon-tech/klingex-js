import type {
  WebSocketChannel,
  WebSocketMessage,
  WebSocketOptions,
  Orderbook,
  Order,
  Balance,
  Ticker,
} from './types';

type MessageHandler<T = unknown> = (data: T) => void;
type ErrorHandler = (error: Error) => void;

interface Subscription {
  channel: WebSocketChannel;
  symbol?: string;
  handler: MessageHandler;
}

export class KlingExWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private apiKey?: string;
  private jwt?: string;
  private options: Required<WebSocketOptions>;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private errorHandler?: ErrorHandler;

  constructor(
    url: string,
    auth: { apiKey?: string; jwt?: string },
    options: WebSocketOptions = {}
  ) {
    this.url = url;
    this.apiKey = auth.apiKey;
    this.jwt = auth.jwt;
    this.options = {
      reconnect: options.reconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 5000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL with auth
        const wsUrl = new URL(this.url);
        if (this.apiKey) {
          wsUrl.searchParams.set('apiKey', this.apiKey);
        } else if (this.jwt) {
          wsUrl.searchParams.set('token', this.jwt);
        }

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.resubscribeAll();
          resolve();
        };

        this.ws.onclose = (event) => {
          this.isConnecting = false;
          this.stopPingInterval();

          if (this.options.reconnect && !event.wasClean) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.isConnecting = false;
          const err = new Error('WebSocket error');
          this.errorHandler?.(err);
          reject(err);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.options.reconnect = false;
    this.stopPingInterval();

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
   * Set error handler
   */
  onError(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * Subscribe to orderbook updates
   * @param symbol - Trading pair symbol
   * @param handler - Callback for orderbook updates
   */
  orderbook(symbol: string, handler: MessageHandler<Orderbook>): () => void {
    return this.subscribe('orderbook', symbol, handler);
  }

  /**
   * Subscribe to trade updates
   * @param symbol - Trading pair symbol
   * @param handler - Callback for trade updates
   */
  trades(
    symbol: string,
    handler: MessageHandler<{
      id: string;
      price: string;
      quantity: string;
      side: 'buy' | 'sell';
      timestamp: string;
    }>
  ): () => void {
    return this.subscribe('trades', symbol, handler);
  }

  /**
   * Subscribe to ticker updates
   * @param symbol - Trading pair symbol
   * @param handler - Callback for ticker updates
   */
  ticker(symbol: string, handler: MessageHandler<Ticker>): () => void {
    return this.subscribe('ticker', symbol, handler);
  }

  /**
   * Subscribe to user order updates (requires auth)
   * @param handler - Callback for order updates
   */
  userOrders(handler: MessageHandler<Order>): () => void {
    return this.subscribe('user.orders', undefined, handler);
  }

  /**
   * Subscribe to user balance updates (requires auth)
   * @param handler - Callback for balance updates
   */
  userBalances(handler: MessageHandler<Balance>): () => void {
    return this.subscribe('user.balances', undefined, handler);
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  private subscribe<T>(
    channel: WebSocketChannel,
    symbol: string | undefined,
    handler: MessageHandler<T>
  ): () => void {
    const key = symbol ? `${channel}:${symbol}` : channel;

    this.subscriptions.set(key, {
      channel,
      symbol,
      handler: handler as MessageHandler,
    });

    // Send subscribe message if connected
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(channel, symbol);
    }

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(key);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendUnsubscribe(channel, symbol);
      }
    };
  }

  private sendSubscribe(channel: WebSocketChannel, symbol?: string): void {
    this.send({
      action: 'subscribe',
      channel,
      symbol,
    });
  }

  private sendUnsubscribe(channel: WebSocketChannel, symbol?: string): void {
    this.send({
      action: 'unsubscribe',
      channel,
      symbol,
    });
  }

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;

      // Handle pong
      if ((message as unknown as { type: string }).type === 'pong') {
        return;
      }

      // Find matching subscription
      const key = message.data && typeof message.data === 'object' && 'symbol' in message.data
        ? `${message.channel}:${(message.data as { symbol: string }).symbol}`
        : message.channel;

      const subscription = this.subscriptions.get(key) || this.subscriptions.get(message.channel);

      if (subscription) {
        subscription.handler(message.data);
      }
    } catch (error) {
      this.errorHandler?.(error instanceof Error ? error : new Error('Failed to parse message'));
    }
  }

  private resubscribeAll(): void {
    for (const [, subscription] of this.subscriptions) {
      this.sendSubscribe(subscription.channel, subscription.symbol);
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
      this.send({ type: 'ping' });
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
