// Main client
export { KlingEx, KlingEx as default } from './client';

// WebSocket client
export { KlingExWebSocket } from './websocket';

// Endpoint classes (for advanced usage)
export { MarketsEndpoint } from './endpoints/markets';
export { OrdersEndpoint } from './endpoints/orders';
export { WalletEndpoint } from './endpoints/wallet';
export { InvoicesEndpoint } from './endpoints/invoices';

// Types
export type {
  // Config
  KlingExConfig,
  WebSocketOptions,

  // Common
  ApiResponse,
  PaginatedResponse,

  // Markets
  Market,
  Ticker,
  Orderbook,
  OrderbookEntry,
  OHLCV,
  Timeframe,

  // Orders
  Order,
  OrderSide,
  OrderStatus,
  OrderType,
  SubmitOrderParams,
  SubmitOrderResponse,
  CancelOrderParams,
  CancelOrderResponse,
  GetOrdersParams,

  // Wallet
  Balance,
  DepositAddress,
  WithdrawParams,
  WithdrawResponse,

  // Invoices
  Invoice,
  InvoiceStatus,
  CreateInvoiceParams,
  InvoiceFees,

  // WebSocket
  WebSocketChannel,
  WebSocketMessage,
} from './types';

// Error classes
export {
  KlingExError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  InsufficientFundsError,
} from './types';
