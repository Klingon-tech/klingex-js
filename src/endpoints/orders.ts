import { HttpClient } from '../http';
import type {
  Order,
  SubmitOrderParams,
  SubmitOrderResponse,
  CancelOrderParams,
  CancelOrderResponse,
  GetOrdersParams,
  ApiResponse,
} from '../types';

export class OrdersEndpoint {
  private humanReadableDefault: boolean;

  constructor(private http: HttpClient, humanReadableDefault = true) {
    this.humanReadableDefault = humanReadableDefault;
  }

  /**
   * Submit a new order
   * @param params - Order parameters
   * @example
   * // Buy 1.5 BTC at $50,000 (human-readable values)
   * const order = await client.orders.submit({
   *   symbol: 'BTC-USDT',
   *   tradingPairId: 1,
   *   side: 'buy',
   *   quantity: '1.5',
   *   price: '50000.00'
   * });
   *
   * @example
   * // Market order (price = 0)
   * const order = await client.orders.submit({
   *   symbol: 'BTC-USDT',
   *   tradingPairId: 1,
   *   side: 'buy',
   *   quantity: '1.0',
   *   price: '0',
   *   slippage: 0.01  // 1% slippage tolerance
   * });
   */
  async submit(params: SubmitOrderParams): Promise<SubmitOrderResponse> {
    const rawValues = params.rawValues ?? !this.humanReadableDefault;

    const response = await this.http.post<SubmitOrderResponse>('/api/submit-order', {
      symbol: params.symbol,
      tradingPairId: params.tradingPairId,
      side: params.side.toUpperCase(),
      quantity: params.quantity,
      price: params.price,
      rawValues,
      slippage: params.slippage,
    });

    return response;
  }

  /**
   * Cancel an existing order
   * @param params - Order ID and trading pair ID
   * @example
   * await client.orders.cancel({
   *   orderId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
   *   tradingPairId: 1
   * });
   */
  async cancel(params: CancelOrderParams): Promise<CancelOrderResponse> {
    return this.http.post<CancelOrderResponse>('/api/cancel-order', {
      orderId: params.orderId,
      tradingPairId: params.tradingPairId,
    });
  }

  /**
   * Cancel all open orders for a trading pair
   * @param tradingPairId - Trading pair ID
   * @example
   * const result = await client.orders.cancelAll(1);
   * console.log(`Cancelled ${result.cancelledCount} orders`);
   */
  async cancelAll(tradingPairId: number): Promise<{
    message: string;
    cancelledCount: number;
    totalOrders: number;
    cancelledOrderIds: string[];
    totalReleasedBalance: string;
  }> {
    return this.http.post('/api/cancel-all-orders', { tradingPairId });
  }

  /**
   * Get your open orders
   * @param params - Filter parameters
   * @example
   * // Get all open orders
   * const orders = await client.orders.list();
   *
   * // Get orders for specific trading pair
   * const orders = await client.orders.list({ tradingPairId: 1 });
   */
  async list(params: GetOrdersParams = {}): Promise<Order[]> {
    const response = await this.http.get<{ orders: Order[] }>('/api/user-orders', {
      tradingPairId: params.tradingPairId,
      status: params.status,
      limit: params.limit || 50,
    });
    return response.orders || [];
  }

  /**
   * Get order history (including filled/cancelled orders)
   * @param params - Filter and pagination parameters
   */
  async history(params: {
    tradingPairId?: number;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    orders: Order[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.http.get('/api/orders-history', {
      tradingPairId: params.tradingPairId,
      status: params.status,
      limit: params.limit || 50,
      offset: params.offset || 0,
    });
  }

  /**
   * Get a specific order by ID
   * @param orderId - Order UUID
   */
  async get(orderId: string): Promise<Order> {
    const response = await this.http.get<ApiResponse<Order>>(`/api/orders/${orderId}`);
    if (!response.data) {
      throw new Error('Order not found');
    }
    return response.data;
  }

  // =========================================================================
  // Convenience methods for common order types
  // =========================================================================

  /**
   * Place a limit buy order (human-readable values)
   * @param symbol - Trading pair symbol
   * @param tradingPairId - Trading pair ID
   * @param quantity - Amount to buy
   * @param price - Price per unit
   */
  async limitBuy(
    symbol: string,
    tradingPairId: number,
    quantity: string,
    price: string
  ): Promise<SubmitOrderResponse> {
    return this.submit({
      symbol,
      tradingPairId,
      side: 'buy',
      quantity,
      price,
    });
  }

  /**
   * Place a limit sell order (human-readable values)
   * @param symbol - Trading pair symbol
   * @param tradingPairId - Trading pair ID
   * @param quantity - Amount to sell
   * @param price - Price per unit
   */
  async limitSell(
    symbol: string,
    tradingPairId: number,
    quantity: string,
    price: string
  ): Promise<SubmitOrderResponse> {
    return this.submit({
      symbol,
      tradingPairId,
      side: 'sell',
      quantity,
      price,
    });
  }

  /**
   * Place a market buy order
   * @param symbol - Trading pair symbol
   * @param tradingPairId - Trading pair ID
   * @param quantity - Amount to buy
   * @param slippage - Slippage tolerance (0-1, e.g., 0.01 for 1%)
   */
  async marketBuy(
    symbol: string,
    tradingPairId: number,
    quantity: string,
    slippage = 0.01
  ): Promise<SubmitOrderResponse> {
    return this.submit({
      symbol,
      tradingPairId,
      side: 'buy',
      quantity,
      price: '0',
      slippage,
    });
  }

  /**
   * Place a market sell order
   * @param symbol - Trading pair symbol
   * @param tradingPairId - Trading pair ID
   * @param quantity - Amount to sell
   * @param slippage - Slippage tolerance (0-1, e.g., 0.01 for 1%)
   */
  async marketSell(
    symbol: string,
    tradingPairId: number,
    quantity: string,
    slippage = 0.01
  ): Promise<SubmitOrderResponse> {
    return this.submit({
      symbol,
      tradingPairId,
      side: 'sell',
      quantity,
      price: '0',
      slippage,
    });
  }
}
