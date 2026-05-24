// Main client
export { KlingEx, KlingEx as default } from './client';

// WebSocket client
export { KlingExWebSocket } from './websocket';

// Endpoint classes (for advanced usage)
export { MarketsEndpoint } from './endpoints/markets';
export { OrdersEndpoint } from './endpoints/orders';
export { WalletEndpoint } from './endpoints/wallet';
export { WalletsEndpoint } from './endpoints/wallets';
export type {
  WalletsStatus,
  WalletsStatusCounts,
  WalletAssetSync,
  WalletChainGroup,
  WalletAssetStatusDetail,
  WalletSyncInfo,
} from './endpoints/wallets';
export { InvoicesEndpoint } from './endpoints/invoices';
export { WithdrawalsEndpoint } from './endpoints/withdrawals';
export type {
  SubmitWithdrawalParams,
  SubmitWithdrawalResponse,
} from './endpoints/withdrawals';
export { PoolsEndpoint } from './endpoints/pools';
export type {
  PoolListItem,
  PoolDetail,
  UserPosition,
  PositionHistorySnapshot,
  PositionHistoryResponse,
  AddLiquidityParams,
  AddLiquidityResult,
  RemoveLiquidityParams,
  RemoveLiquidityResult,
} from './endpoints/pools';
export { MiningPoolEndpoint } from './endpoints/miningPool';
export type {
  PoolConfig,
  PoolBlock,
  PoolBlocksResponse,
  PoolStats,
  PoolStatsCurrent,
  PoolStatsSnapshot,
  PoolStatsPeriod,
  PoolLeaderboard,
  PoolLeaderboardEntry,
  PoolWorker,
  PoolWorkersResponse,
  PoolReward,
  PoolRewardsResponse,
  PoolPayout,
  PoolPayoutsResponse,
  PoolListParams,
} from './endpoints/miningPool';
export { GiftCodesEndpoint } from './endpoints/giftCodes';
export type {
  CreateGiftCodeParams,
  BulkCreateGiftCodeParams,
  CreateGiftCodeResponse,
  BulkCreateGiftCodeResponse,
} from './endpoints/giftCodes';

// Types
export type {
  // Config
  KlingExConfig,
  WebSocketOptions,

  // Common
  ApiResponse,
  PaginatedResponse,

  // Assets
  Asset,
  AssetsResponse,
  AssetInfo,

  // Markets
  Market,
  MarketInfo,
  MarketSparklinesResponse,
  SparklinePoint,
  Ticker,
  Orderbook,
  OrderbookRaw,
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
  UserOrdersResponse,
  OrdersHistoryParams,
  OrdersHistoryResponse,
  OrderHistoryEntry,
  CancelAllOrdersResult,

  // Wallet
  Balance,
  DepositAddress,

  // Invoices
  Invoice,
  InvoiceSummary,
  InvoiceStatus,
  InvoiceDenomination,
  InvoicePaymentOption,
  InvoicePayment,
  CreateInvoiceParams,
  CreateInvoiceDenomination,
  InvoiceListParams,
  InvoiceListResponse,
  InvoiceStatusResponse,
  InvoiceFeeStats,
  PublicInvoice,

  // WebSocket
  UserChannel,
  WsOrderResult,
  WsCancelResult,
  WsPlaceOrderParams,
  WsCancelOrderParams,
} from './types';

// Error classes
export {
  KlingExError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  InsufficientFundsError,
} from './types';
