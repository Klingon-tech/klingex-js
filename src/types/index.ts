// ============================================================================
// Client Configuration
// ============================================================================

export interface KlingExConfig {
  /** API key for authentication. Required for any non-public endpoint. */
  apiKey: string;
  /** Base URL for the REST API (default: https://api.klingex.io) */
  baseUrl?: string;
  /** WebSocket URL (default: wss://ws.klingex.io/ws) */
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
  /** Nullable on the backend (`*decimal.Decimal`). */
  max_trade_amount: string | null;
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
  /** Nullable on the backend. */
  volume_24h: string | null;
  /** Nullable on the backend (camelCase to match API). */
  priceChange24h: string | null;
  /** Nullable on the backend. */
  last_price: string | null;
  base_decimals: number;
  quote_decimals: number;
  /** Nullable on the backend. */
  volume_24h_human: string | null;
}

export interface MarketInfo {
  trading_pair_id: number;
  base_symbol: string;
  base_decimals: number;
  quote_symbol: string;
  quote_decimals: number;
  min_trade_amount: string;
  max_trade_amount: string | null;
  tick_size: string;
  step_size: string;
  maker_fee_rate: string;
  taker_fee_rate: string;
  price_decimals: number;
}

export interface AssetInfo {
  id: number;
  symbol: string;
  name: string;
  decimals: number;
  is_active?: boolean;
  chain_type?: string | null;
  contract_address?: string | null;
  chain_id?: number | null;
  parent_asset_id?: number | null;
  min_deposit?: string;
  min_withdrawal?: string;
  withdrawal_fee?: string;
  deposits_enabled?: boolean;
  withdrawal_enabled?: boolean;
  [key: string]: unknown;
}

export interface SparklinePoint {
  time_bucket: string;
  price: string;
}

export interface MarketSparklinesResponse {
  timeframe: string;
  limit: number;
  /** map of "BASE-QUOTE" -> sparkline points. */
  sparklines: Record<string, SparklinePoint[]>;
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
  /** Postgres timestamp serialized as ISO string. */
  time_bucket: string;
  /** Nullable on the backend (`*decimal.Decimal`). */
  open_price: string | null;
  high_price: string | null;
  low_price: string | null;
  close_price: string | null;
  volume: string | null;
  /** Nullable on the backend (`*int64`). */
  number_of_trades: number | null;
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
  /** If true, quantity/price are in base units. If false (default), human-readable. */
  rawValues?: boolean;
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
  // Human-readable values (computed by SDK or returned by orders-history)
  human_price?: string | null;
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

export interface OrdersHistoryParams {
  tradingPairId?: number;
  status?: OrderStatus;
  /** "BASE-QUOTE" or "BASE/QUOTE" */
  market?: string;
  side?: OrderSide;
  type?: OrderType;
  /** Free-text search */
  search?: string;
  /** YYYY-MM-DD inclusive */
  from?: string;
  /** YYYY-MM-DD inclusive (end-of-day) */
  to?: string;
  /** 1..100 */
  limit?: number;
  offset?: number;
}

export interface OrderHistoryEntry {
  id: string;
  trading_pair_id: number;
  base_symbol: string;
  quote_symbol: string;
  type: OrderType;
  side: 'buy' | 'sell';
  status: OrderStatus;
  price: string | null;
  amount: string;
  filled_amount: string;
  created_at: string;
  updated_at: string;
  human_price: string | null;
  human_amount: string;
  human_filled_amount: string;
  human_remaining: string;
  human_total: string;
}

export interface OrdersHistoryResponse {
  orders: OrderHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface CancelAllOrdersResult {
  message: string;
  cancelledCount: number;
  totalOrders: number;
  cancelledOrderIds: string[];
  totalReleasedBalance: string;
}

// ============================================================================
// Wallet Types
// ============================================================================

export interface Balance {
  balance: string;
  locked_balance: string;
  /** Nullable on the backend. */
  wallet_id: string | null;
  /** Nullable on the backend. */
  deposit_address: string | null;
  /** Optional. Set for assets with integrated/payment-id semantics (e.g. XPARA). */
  payment_id?: string | null;
  id: number;
  symbol: string;
  name: string;
  is_crypto: boolean;
  /** Nullable on the backend. */
  chain_type: string | null;
  decimals: number;
  min_deposit: string;
  min_withdrawal: string;
  withdrawal_fee: string;
  deposit_fee: string;
  deposit_fee_threshold: string;
  deposit_confirms_required: number;
  /** Nullable on the backend. */
  contract_address: string | null;
  /** Nullable on the backend. */
  chain_id: number | null;
  /** Nullable on the backend. */
  evm_network: string | null;
  /** Nullable on the backend. */
  parent_asset_id: number | null;
  /** Value of this balance in USDT. */
  usdt_value: string;
  deposits_enabled: boolean;
  withdrawal_enabled: boolean;
  supports_shielded: boolean;
  shielded_address_mode: string;
  shielded_deposit_address?: string | null;
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

// ============================================================================
// Invoice Types
// ============================================================================

export type InvoiceStatus =
  | 'pending'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'overpaid'
  | 'underpaid';

export interface CreateInvoiceDenomination {
  /** Always "crypto"; defaults to crypto on the server. */
  type?: 'crypto';
  /** Asset symbol used as the denomination (e.g. "USDT", "BTC"). */
  currency: string;
  /** Human-readable amount string, e.g. "100.00". */
  amount: string;
}

export interface CreateInvoiceParams {
  /** Required: how the invoice is priced. */
  denomination: CreateInvoiceDenomination;
  /** Required: list of asset symbols the buyer may pay in. */
  accepted_coins: string[];
  /** External merchant reference for tracking. */
  external_id?: string;
  /** Invoice TTL in minutes (5..1440; default 30). */
  expires_in_minutes?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  buyer_email?: string;
  /** 90..100; default 100 = exact amount. */
  payment_tolerance?: number;
}

export interface InvoiceDenomination {
  type: string;
  currency: string;
  amount: string;
  decimals: number;
}

export interface InvoicePaymentOption {
  asset_id: number;
  symbol: string;
  name: string;
  chain_type?: string;
  chain_id?: number | null;
  network?: string;
  address: string;
  shielded_address?: string | null;
  expected_amount: string;
  exchange_rate?: string | null;
  qr_code_data?: string;
}

export interface InvoicePayment {
  id: string;
  asset_id: number;
  symbol: string;
  amount: string;
  tx_hash: string;
  from_address?: string | null;
  status: string;
  confirmations: number;
  confirmations_required: number;
  denomination_value?: string | null;
  exchange_rate_used?: string | null;
  confirmed_at?: string | null;
  created_at: string;
}

/** Full invoice as returned by create/get. */
export interface Invoice {
  id: string;
  external_id?: string | null;
  status: InvoiceStatus;
  denomination: InvoiceDenomination;
  payment_options?: InvoicePaymentOption[];
  payments?: InvoicePayment[];
  description?: string | null;
  metadata?: Record<string, unknown>;
  buyer_email?: string | null;
  fee_rate_bps: number;
  fee_rate_percent: string;
  total_received?: string;
  fee_amount?: string;
  net_amount?: string;
  expires_at: string;
  paid_at?: string | null;
  created_at: string;
  payment_page_url?: string;
}

/** Flat summary returned by the list endpoint. */
export interface InvoiceSummary {
  id: string;
  external_id?: string | null;
  status: InvoiceStatus;
  denomination_type: string;
  denomination_currency: string;
  amount: string;
  total_received: string;
  fee_amount: string;
  net_amount: string;
  expires_at: string;
  paid_at?: string | null;
  created_at: string;
}

export interface InvoiceListParams {
  status?: InvoiceStatus;
  external_id?: string;
  /** 1-indexed. */
  page?: number;
  /** 1..100; default 20. */
  page_size?: number;
}

export interface InvoiceListResponse {
  invoices: InvoiceSummary[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface InvoiceStatusResponse {
  invoice_id: string;
  status: InvoiceStatus;
  total_paid_percent: number;
  payments?: InvoicePayment[];
  paid_at?: string | null;
  time_remaining_ms: number;
}

/** Aggregate fee stats returned by GET /api/invoices/fees. */
export interface InvoiceFeeStats {
  total_fees_collected: string;
  total_net_amount: string;
  paid_invoice_count: number;
  current_fee_rate_bps: number;
  current_fee_rate_percent: string;
}

export interface PublicInvoice {
  invoice_id: string;
  status: InvoiceStatus;
  denomination: InvoiceDenomination;
  description?: string | null;
  merchant_name: string;
  expires_at: string;
  time_remaining_ms: number;
  payment_options: InvoicePaymentOption[];
  payments_received?: InvoicePayment[];
  total_paid_percent: number;
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * Valid user channel names recognized by the server. Public market data
 * (`ticker`, `orderbook`, `trades`) is fed by a single market subscription
 * — see `subscribeMarket` — not by these channels.
 */
export type UserChannel =
  | 'balance'
  | 'orders'
  | 'transfer'
  | 'deposits'
  | 'withdrawals'
  | 'notifications'
  | 'trades'
  | 'account';

export interface WsOrderResult {
  type: 'order_result';
  success: boolean;
  orderId?: string;
  error?: string;
  requestId: string;
}

export interface WsCancelResult {
  type: 'cancel_result';
  success: boolean;
  error?: string;
  requestId: string;
}

export interface WsPlaceOrderParams {
  symbol: string;
  tradingPairId: number;
  side: string;
  quantity: string;
  price: string;
  rawValues?: boolean;
}

export interface WsCancelOrderParams {
  orderId: string;
  tradingPairId: number;
}

export interface WebSocketOptions {
  /** Reconnect automatically on disconnect (default: true) */
  reconnect?: boolean;
  /** Reconnect interval in milliseconds (default: 5000) */
  reconnectInterval?: number;
  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Auth timeout in ms — how long to wait for auth_result after sending the auth message (default: 10000) */
  authTimeout?: number;
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
