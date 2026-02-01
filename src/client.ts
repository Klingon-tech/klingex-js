import { HttpClient } from './http';
import { KlingExWebSocket } from './websocket';
import { MarketsEndpoint } from './endpoints/markets';
import { OrdersEndpoint } from './endpoints/orders';
import { WalletEndpoint } from './endpoints/wallet';
import { InvoicesEndpoint } from './endpoints/invoices';
import type { KlingExConfig, WebSocketOptions } from './types';

const DEFAULT_BASE_URL = 'https://api.klingex.io';
const DEFAULT_WS_URL = 'wss://api.klingex.io/ws';
const DEFAULT_TIMEOUT = 30000;

/**
 * KlingEx API Client
 *
 * @example
 * // Initialize with API key
 * const client = new KlingEx({
 *   apiKey: 'your-api-key-here'
 * });
 *
 * // Get markets
 * const markets = await client.markets.list();
 *
 * // Place an order (human-readable values)
 * const order = await client.orders.submit({
 *   symbol: 'BTC-USDT',
 *   tradingPairId: 1,
 *   side: 'buy',
 *   quantity: '1.5',
 *   price: '50000.00'
 * });
 *
 * // Subscribe to real-time orderbook
 * await client.ws.connect();
 * client.ws.orderbook('BTC-USDT', (data) => {
 *   console.log('Orderbook update:', data);
 * });
 */
export class KlingEx {
  private http: HttpClient;
  private _ws: KlingExWebSocket | null = null;
  private config: Required<Omit<KlingExConfig, 'apiKey' | 'jwt'>> & Pick<KlingExConfig, 'apiKey' | 'jwt'>;

  /** Market data endpoints */
  public readonly markets: MarketsEndpoint;
  /** Order management endpoints */
  public readonly orders: OrdersEndpoint;
  /** Wallet/balance endpoints */
  public readonly wallet: WalletEndpoint;
  /** Invoice/payment endpoints */
  public readonly invoices: InvoicesEndpoint;

  constructor(config: KlingExConfig = {}) {
    this.config = {
      apiKey: config.apiKey,
      jwt: config.jwt,
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
      wsUrl: config.wsUrl || DEFAULT_WS_URL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      humanReadable: config.humanReadable ?? true,
    };

    // Initialize HTTP client
    this.http = new HttpClient({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      jwt: this.config.jwt,
      timeout: this.config.timeout,
    });

    // Initialize endpoint modules
    this.markets = new MarketsEndpoint(this.http);
    this.orders = new OrdersEndpoint(this.http, this.config.humanReadable);
    this.wallet = new WalletEndpoint(this.http);
    this.invoices = new InvoicesEndpoint(this.http);
  }

  /**
   * WebSocket client for real-time data
   * Note: Call ws.connect() before subscribing to channels
   */
  get ws(): KlingExWebSocket {
    if (!this._ws) {
      this._ws = new KlingExWebSocket(
        this.config.wsUrl,
        { apiKey: this.config.apiKey, jwt: this.config.jwt }
      );
    }
    return this._ws;
  }

  /**
   * Create WebSocket connection with custom options
   */
  createWebSocket(options?: WebSocketOptions): KlingExWebSocket {
    return new KlingExWebSocket(
      this.config.wsUrl,
      { apiKey: this.config.apiKey, jwt: this.config.jwt },
      options
    );
  }

  /**
   * Update authentication credentials
   */
  setAuth(auth: { apiKey?: string; jwt?: string }): void {
    if (auth.apiKey) this.config.apiKey = auth.apiKey;
    if (auth.jwt) this.config.jwt = auth.jwt;
    this.http.setAuth(auth);
  }

  /**
   * Check if client has authentication configured
   */
  get isAuthenticated(): boolean {
    return !!(this.config.apiKey || this.config.jwt);
  }

  /**
   * Get the configured base URL
   */
  get baseUrl(): string {
    return this.config.baseUrl;
  }

  // =========================================================================
  // Account endpoints (directly on client for convenience)
  // =========================================================================

  /**
   * Get current user profile
   */
  async getProfile(): Promise<{
    id: string;
    email: string;
    created_at: string;
    two_fa_enabled: boolean;
  }> {
    return this.http.get('/api/profile');
  }

  /**
   * Get current user info
   */
  async getUser(): Promise<{
    id: string;
    email: string;
    is_active: boolean;
    is_email_verified: boolean;
    created_at: string;
  }> {
    return this.http.get('/api/user');
  }

  /**
   * Get API key statistics
   */
  async getApiKeyStats(): Promise<{
    total_keys: number;
    active_keys: number;
    last_used_at?: string;
  }> {
    return this.http.get('/api/api-keys/stats');
  }
}

// Also export as default
export default KlingEx;
