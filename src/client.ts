import { HttpClient } from './http';
import { KlingExWebSocket } from './websocket';
import { MarketsEndpoint } from './endpoints/markets';
import { OrdersEndpoint } from './endpoints/orders';
import { WalletEndpoint } from './endpoints/wallet';
import { WalletsEndpoint } from './endpoints/wallets';
import { InvoicesEndpoint } from './endpoints/invoices';
import { WithdrawalsEndpoint } from './endpoints/withdrawals';
import { PoolsEndpoint } from './endpoints/pools';
import { MiningPoolEndpoint } from './endpoints/miningPool';
import { GiftCodesEndpoint } from './endpoints/giftCodes';
import type { KlingExConfig, WebSocketOptions } from './types';

const DEFAULT_BASE_URL = 'https://api.klingex.io';
const DEFAULT_WS_URL = 'wss://ws.klingex.io/ws';
const DEFAULT_TIMEOUT = 30000;

/**
 * KlingEx API Client.
 *
 * Authentication is API-key-only: pass `apiKey` to the constructor. The SDK
 * deliberately does not support JWT auth — JWT-only backend routes are not
 * exposed.
 *
 * @example
 * const client = new KlingEx({ apiKey: 'your-api-key' });
 *
 * const markets = await client.markets.list();
 * const order = await client.orders.submit({
 *   symbol: 'BTC-USDT',
 *   tradingPairId: 1,
 *   side: 'buy',
 *   quantity: '0.5',
 *   price: '50000.00'
 * });
 */
export class KlingEx {
  private http: HttpClient;
  private _ws: KlingExWebSocket | null = null;
  private config: Required<KlingExConfig>;

  /** Market data endpoints (public). */
  public readonly markets: MarketsEndpoint;
  /** Order management endpoints. */
  public readonly orders: OrdersEndpoint;
  /** Wallet/balance endpoints. */
  public readonly wallet: WalletEndpoint;
  /** Public wallet/sync status endpoints. */
  public readonly wallets: WalletsEndpoint;
  /** Merchant invoice endpoints. */
  public readonly invoices: InvoicesEndpoint;
  /** On-chain withdrawal submission (requires API key with `withdraw` scope). */
  public readonly withdrawals: WithdrawalsEndpoint;
  /** AMM liquidity pool data and LP operations. */
  public readonly pools: PoolsEndpoint;
  /** Mining pool endpoints (public stats + authed worker/payout views). */
  public readonly miningPool: MiningPoolEndpoint;
  /** Gift code creation (requires API key with `trade` scope). */
  public readonly giftCodes: GiftCodesEndpoint;

  constructor(config: KlingExConfig) {
    if (!config?.apiKey) {
      throw new Error('KlingEx: apiKey is required (the SDK only supports API-key auth)');
    }
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
      wsUrl: config.wsUrl || DEFAULT_WS_URL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      humanReadable: config.humanReadable ?? true,
    };

    this.http = new HttpClient({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
    });

    this.markets = new MarketsEndpoint(this.http);
    this.orders = new OrdersEndpoint(this.http, this.config.humanReadable);
    this.wallet = new WalletEndpoint(this.http);
    this.wallets = new WalletsEndpoint(this.http);
    this.invoices = new InvoicesEndpoint(this.http);
    this.withdrawals = new WithdrawalsEndpoint(this.http);
    this.pools = new PoolsEndpoint(this.http);
    this.miningPool = new MiningPoolEndpoint(this.http);
    this.giftCodes = new GiftCodesEndpoint(this.http);
  }

  /**
   * Lazily-created WebSocket client for real-time data.
   * Note: `await ws.connect()` before subscribing to user channels — the
   * connect promise waits for the server's `auth_result` reply.
   */
  get ws(): KlingExWebSocket {
    if (!this._ws) {
      this._ws = new KlingExWebSocket(this.config.wsUrl, { apiKey: this.config.apiKey });
    }
    return this._ws;
  }

  /**
   * Create a fresh WebSocket connection with custom options (e.g. to override
   * reconnect/auth timeout behavior). The returned client is independent of
   * `client.ws`.
   */
  createWebSocket(options?: WebSocketOptions): KlingExWebSocket {
    return new KlingExWebSocket(
      this.config.wsUrl,
      { apiKey: this.config.apiKey },
      options
    );
  }

  /**
   * Rotate the API key in place (e.g. after the user generates a new key).
   * Existing WebSocket connections are not re-authenticated — disconnect and
   * reconnect if you need the new key to apply to streaming data.
   */
  setApiKey(apiKey: string): void {
    if (!apiKey) {
      throw new Error('KlingEx.setApiKey: apiKey is required');
    }
    this.config.apiKey = apiKey;
    this.http.setApiKey(apiKey);
  }

  /** Always true for this SDK — `apiKey` is mandatory at construction time. */
  get isAuthenticated(): boolean {
    return !!this.config.apiKey;
  }

  /** Configured REST base URL. */
  get baseUrl(): string {
    return this.config.baseUrl;
  }
}

export default KlingEx;
