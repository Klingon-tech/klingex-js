import { HttpClient } from '../http';
import type {
  Order,
  SubmitOrderParams,
  SubmitOrderResponse,
  CancelOrderParams,
  CancelOrderResponse,
  GetOrdersParams,
  UserOrdersResponse,
  OrdersHistoryParams,
  OrdersHistoryResponse,
  CancelAllOrdersResult,
} from '../types';

export class OrdersEndpoint {
  private humanReadableDefault: boolean;

  constructor(private http: HttpClient, humanReadableDefault = true) {
    this.humanReadableDefault = humanReadableDefault;
  }

  /**
   * Submit a new order.
   *
   * @example
   * // Limit buy 0.5 BTC at $50,000 (human-readable values by default).
   * const order = await client.orders.submit({
   *   symbol: 'BTC-USDT',
   *   tradingPairId: 1,
   *   side: 'BUY',
   *   quantity: '0.5',
   *   price: '50000.00'
   * });
   *
   * @example
   * // Market order — pass "0" for price. The matching engine uses a
   * // fixed 5% slippage tolerance; there is no client-tunable slippage.
   * const order = await client.orders.submit({
   *   symbol: 'BTC-USDT',
   *   tradingPairId: 1,
   *   side: 'BUY',
   *   quantity: '0.1',
   *   price: '0'
   * });
   */
  async submit(params: SubmitOrderParams): Promise<SubmitOrderResponse> {
    const rawValues = params.rawValues ?? !this.humanReadableDefault;

    return this.http.post<SubmitOrderResponse>('/api/submit-order', {
      symbol: params.symbol,
      tradingPairId: params.tradingPairId,
      side: params.side.toUpperCase(),
      quantity: params.quantity,
      price: params.price,
      rawValues,
    });
  }

  /**
   * Cancel an existing order. `tradingPairId` is required because the
   * `orders` table is LIST-partitioned by trading pair on the backend.
   */
  async cancel(params: CancelOrderParams): Promise<CancelOrderResponse> {
    return this.http.post<CancelOrderResponse>('/api/cancel-order', {
      orderId: params.orderId,
      tradingPairId: params.tradingPairId,
    });
  }

  /**
   * Cancel all open orders for a given trading pair.
   */
  async cancelAll(tradingPairId: number): Promise<CancelAllOrdersResult> {
    return this.http.post<CancelAllOrdersResult>('/api/cancel-all-orders', {
      tradingPairId,
    });
  }

  /**
   * Get your currently open orders.
   */
  async list(params: GetOrdersParams = {}): Promise<Order[]> {
    const response = await this.http.get<UserOrdersResponse>('/api/user-orders', {
      tradingPairId: params.tradingPairId,
      status: params.status,
      limit: params.limit ?? 50,
    });
    return response.orders || [];
  }

  /**
   * Get order history (open, filled, partially filled, cancelled, rejected).
   * Supports the full filter set the backend understands.
   */
  async history(params: OrdersHistoryParams = {}): Promise<OrdersHistoryResponse> {
    return this.http.get<OrdersHistoryResponse>('/api/orders-history', {
      tradingPairId: params.tradingPairId,
      status: params.status,
      market: params.market,
      side: params.side ? params.side.toLowerCase() : undefined,
      type: params.type,
      search: params.search,
      from: params.from,
      to: params.to,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    });
  }

  /**
   * Get a specific order by ID. Searches open orders first; falls back to the
   * order history endpoint to find filled/cancelled orders.
   */
  async get(orderId: string): Promise<Order | undefined> {
    const open = await this.list({ limit: 100 });
    const hit = open.find((o) => o.id === orderId);
    if (hit) return hit;

    // Fall back to history (matches by ID — backend supports an order-ID search).
    const history = await this.history({ search: orderId, limit: 50 });
    const fromHistory = history.orders.find((o) => o.id === orderId);
    if (!fromHistory) return undefined;
    // Coerce history entry into the Order shape (nullable price is the main diff).
    return {
      id: fromHistory.id,
      trading_pair_id: fromHistory.trading_pair_id,
      side: fromHistory.side,
      type: fromHistory.type,
      price: fromHistory.price ?? '0',
      amount: fromHistory.amount,
      filled_amount: fromHistory.filled_amount,
      status: fromHistory.status,
      created_at: fromHistory.created_at,
      updated_at: fromHistory.updated_at,
      human_price: fromHistory.human_price,
      human_amount: fromHistory.human_amount,
      human_filled_amount: fromHistory.human_filled_amount,
      human_remaining: fromHistory.human_remaining,
      human_total: fromHistory.human_total,
    };
  }

  // =========================================================================
  // Convenience helpers
  // =========================================================================

  async limitBuy(
    symbol: string,
    tradingPairId: number,
    quantity: string,
    price: string
  ): Promise<SubmitOrderResponse> {
    return this.submit({ symbol, tradingPairId, side: 'BUY', quantity, price });
  }

  async limitSell(
    symbol: string,
    tradingPairId: number,
    quantity: string,
    price: string
  ): Promise<SubmitOrderResponse> {
    return this.submit({ symbol, tradingPairId, side: 'SELL', quantity, price });
  }

  /**
   * Place a market buy. The matching engine applies a fixed 5% slippage cap.
   */
  async marketBuy(
    symbol: string,
    tradingPairId: number,
    quantity: string
  ): Promise<SubmitOrderResponse> {
    return this.submit({
      symbol,
      tradingPairId,
      side: 'BUY',
      quantity,
      price: '0',
    });
  }

  /**
   * Place a market sell. The matching engine applies a fixed 5% slippage cap.
   */
  async marketSell(
    symbol: string,
    tradingPairId: number,
    quantity: string
  ): Promise<SubmitOrderResponse> {
    return this.submit({
      symbol,
      tradingPairId,
      side: 'SELL',
      quantity,
      price: '0',
    });
  }
}
