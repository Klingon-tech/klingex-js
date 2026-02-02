// ============================================================================
// Client Configuration
// ============================================================================

export interface KlingExConfig {
  /** API key for authentication */
  apiKey?: string;
  /** JWT token for authentication (alternative to apiKey) */
  jwt?: string;
  /** Base URL for the API (default: https://api.klingex.io) */
  baseUrl?: string;
  /** WebSocket URL (default: wss://api.klingex.io) */
  wsUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Use human-readable values for orders by default (default: true) */
  humanReadable?: boolean;
}

// ============================================================================
// Common Types
// ============================================================================

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================================
// Asset Types
// ============================================================================

export interface Asset {
  id: number;
  symbol: string;
  name: string;
  decimals: number;
  min_deposit: string;
  min_withdrawal: string;
  withdrawal_fee: string;
  is_active?: boolean;
}

export interface AssetsResponse {
  assets: Asset[];
}

// ============================================================================
// Market Types
// ============================================================================

export interface Market {
  id: number;
  base_asset_id: number;
  quote_asset_id: number;
  min_trade_amount: string;
  max_trade_amount: string;
  tick_size: string;
  step_size: string;
  maker_fee_rate: string;
  taker_fee_rate: string;
  price_decimals: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  base_asset_symbol: string;
  base_asset_name: string;
  quote_asset_symbol: string;
  quote_asset_name: string;
  volume_24h: string;
  priceChange24h: string;
  last_price: string;
  base_decimals: number;
  quote_decimals: number;
  volume_24h_human: string;
}

export interface Ticker {
  ticker_id: string;
  base_currency: string;
  target_currency: string;
  last_price: string;
  base_volume: string;
  target_volume: string;
  bid: string;
  ask: string;
  high: string;
  low: string;
}

export interface OrderbookEntry {
  price: string;
  quantity: string;
}

export interface Orderbook {
  trading_pair_id: number;
  base_symbol: string;
  quote_symbol: string;
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
}

export interface OrderbookRaw {
  trading_pair_id: number;
  base_symbol: string;
  quote_symbol: string;
  bids: string[][];
  asks: string[][];
}

export interface OHLCV {
  time_bucket: string;
  open_price: string;
  high_price: string;
  low_price: string;
  close_price: string;
  volume: string;
  number_of_trades: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

// ============================================================================
// Order Types
// ============================================================================

export type OrderSide = 'buy' | 'sell' | 'BUY' | 'SELL';
export type OrderStatus = 'pending' | 'partial' | 'filled' | 'cancelled' | 'rejected';
export type OrderType = 'limit' | 'market';

export interface SubmitOrderParams {
  /** Trading pair symbol (e.g., "BTC-USDT") */
  symbol: string;
  /** Trading pair ID */
  tradingPairId: number;
  /** Order side */
  side: OrderSide;
  /** Order quantity (human-readable by default, e.g., "1.5") */
  quantity: string;
  /** Order price (human-readable by default, e.g., "50000.00"). Use "0" for market orders */
  price: string;
  /** If true, quantity/price are in base units. If false (default), human-readable */
  rawValues?: boolean;
  /** Slippage tolerance for market orders (0-1) */
  slippage?: number;
}

export interface Order {
  id: string;
  trading_pair_id: number;
  side: 'buy' | 'sell';
  type: OrderType;
  price: string;
  amount: string;
  filled_amount: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  // Human-readable values (computed by SDK)
  human_price?: string;
  human_amount?: string;
  human_filled_amount?: string;
  human_remaining?: string;
  human_total?: string;
}

export interface UserOrdersResponse {
  orders: Order[];
}

export interface SubmitOrderResponse {
  message: string;
  order_id: string;
}

export interface CancelOrderParams {
  orderId: string;
  tradingPairId: number;
}

export interface CancelOrderResponse {
  message: string;
  released_balance: string;
}

export interface GetOrdersParams {
  tradingPairId?: number;
  status?: OrderStatus;
  limit?: number;
}

// ============================================================================
// Wallet Types
// ============================================================================

export interface Balance {
  balance: string;
  locked_balance: string;
  wallet_id: string;
  deposit_address: string;
  id: number;
  symbol: string;
  name: string;
  decimals: number;
  min_deposit: string;
  min_withdrawal: string;
  withdrawal_fee: string;
  // Computed by SDK
  available_balance?: string;
  human_balance?: string;
  human_locked?: string;
  human_available?: string;
}

export interface DepositAddress {
  address: string;
  memo?: string;
  network?: string;
}

export interface WithdrawParams {
  assetId: number;
  symbol: string;
  address: string;
  amount: string;
  memo?: string;
}

export interface WithdrawResponse {
  message: string;
  withdrawal_id?: string;
  requires_2fa?: boolean;
  session_token?: string;
}

// ============================================================================
// Invoice Types
// ============================================================================

export type InvoiceStatus = 'pending' | 'paid' | 'expired' | 'cancelled' | 'overpaid' | 'underpaid';

export interface CreateInvoiceParams {
  /** Amount in the specified asset */
  amount: string;
  /** Asset symbol (e.g., "USDT") */
  asset: string;
  /** Optional description */
  description?: string;
  /** External reference ID */
  external_id?: string;
  /** Webhook URL for payment notifications */
  webhook_url?: string;
  /** Redirect URL after payment */
  redirect_url?: string;
  /** Expiration time in minutes (default: 60) */
  expires_in?: number;
}

export interface Invoice {
  id: string;
  amount: string;
  asset: string;
  status: InvoiceStatus;
  description?: string;
  external_id?: string;
  payment_address: string;
  payment_amount?: string;
  paid_at?: string;
  expires_at: string;
  created_at: string;
  webhook_url?: string;
  redirect_url?: string;
}

export interface InvoiceFees {
  network_fee: string;
  service_fee: string;
  total_fee: string;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export type WebSocketChannel =
  | 'orderbook'
  | 'trades'
  | 'ticker'
  | 'user.orders'
  | 'user.balances';

export interface WebSocketMessage<T = unknown> {
  channel: WebSocketChannel;
  event: string;
  data: T;
  timestamp: string;
}

export interface WebSocketOptions {
  /** Reconnect automatically on disconnect (default: true) */
  reconnect?: boolean;
  /** Reconnect interval in milliseconds (default: 5000) */
  reconnectInterval?: number;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export class KlingExError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'KlingExError';
  }
}

export class AuthenticationError extends KlingExError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends KlingExError {
  constructor(message = 'Rate limit exceeded', public retryAfter?: number) {
    super(message, 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends KlingExError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class InsufficientFundsError extends KlingExError {
  constructor(message = 'Insufficient funds') {
    super(message, 'INSUFFICIENT_FUNDS', 400);
    this.name = 'InsufficientFundsError';
  }
}
