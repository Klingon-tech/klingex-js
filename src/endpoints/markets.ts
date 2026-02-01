import { HttpClient } from '../http';
import type {
  Market,
  Ticker,
  Orderbook,
  OHLCV,
  Timeframe,
  ApiResponse,
} from '../types';

export class MarketsEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Get all available markets/trading pairs
   * @example
   * const markets = await client.markets.list();
   */
  async list(): Promise<Market[]> {
    const response = await this.http.get<ApiResponse<Market[]>>('/api/markets');
    return response.data || [];
  }

  /**
   * Get a specific market by ID
   * @param marketId - The market/trading pair ID
   */
  async get(marketId: number): Promise<Market> {
    const response = await this.http.get<ApiResponse<Market>>(`/api/markets/${marketId}`);
    if (!response.data) {
      throw new Error('Market not found');
    }
    return response.data;
  }

  /**
   * Get all tickers with 24h price data
   * @example
   * const tickers = await client.markets.tickers();
   */
  async tickers(): Promise<Ticker[]> {
    const response = await this.http.get<ApiResponse<Ticker[]>>('/api/tickers');
    return response.data || [];
  }

  /**
   * Get ticker for a specific symbol
   * @param symbol - Trading pair symbol (e.g., "BTC-USDT")
   */
  async ticker(symbol: string): Promise<Ticker | undefined> {
    const tickers = await this.tickers();
    return tickers.find(t => t.symbol === symbol);
  }

  /**
   * Get orderbook for a trading pair
   * @param symbol - Trading pair symbol (e.g., "BTC-USDT")
   * @param limit - Number of levels to return (default: 50)
   * @example
   * const orderbook = await client.markets.orderbook('BTC-USDT');
   * console.log('Best bid:', orderbook.bids[0]);
   * console.log('Best ask:', orderbook.asks[0]);
   */
  async orderbook(symbol: string, limit = 50): Promise<Orderbook> {
    const response = await this.http.get<{
      bids: string[][];
      asks: string[][];
      timestamp?: string;
    }>('/api/orderbook', { symbol, limit });

    return {
      symbol,
      bids: (response.bids || []).map(([price, quantity]) => ({ price, quantity })),
      asks: (response.asks || []).map(([price, quantity]) => ({ price, quantity })),
      timestamp: response.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Get OHLCV (candlestick) data
   * @param marketId - Trading pair ID
   * @param timeframe - Candle timeframe
   * @param options - Additional options
   * @example
   * const candles = await client.markets.ohlcv(1, '1h', { limit: 100 });
   */
  async ohlcv(
    marketId: number,
    timeframe: Timeframe,
    options: {
      limit?: number;
      startDate?: string;
      endDate?: string;
    } = {}
  ): Promise<OHLCV[]> {
    const response = await this.http.get<ApiResponse<OHLCV[]>>('/api/ohlcv', {
      marketId,
      timeframe,
      limit: options.limit,
      startDate: options.startDate,
      endDate: options.endDate,
    });
    return response.data || [];
  }

  /**
   * Get recent trades for a trading pair
   * @param symbol - Trading pair symbol
   * @param limit - Number of trades to return
   */
  async trades(symbol: string, limit = 50): Promise<Array<{
    id: string;
    price: string;
    quantity: string;
    side: 'buy' | 'sell';
    timestamp: string;
  }>> {
    const response = await this.http.get<ApiResponse<Array<{
      id: string;
      price: string;
      quantity: string;
      side: 'buy' | 'sell';
      timestamp: string;
    }>>>('/api/trades', { symbol, limit });
    return response.data || [];
  }
}
