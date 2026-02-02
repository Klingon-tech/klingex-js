import { HttpClient } from '../http';
import type {
  Market,
  Ticker,
  Orderbook,
  OrderbookRaw,
  OHLCV,
  Timeframe,
  Asset,
  AssetsResponse,
} from '../types';

export class MarketsEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Get all available markets/trading pairs
   * @example
   * const markets = await client.markets.list();
   * // Returns full market info including:
   * // - base_asset_symbol, quote_asset_symbol
   * // - maker_fee_rate, taker_fee_rate
   * // - last_price, volume_24h, priceChange24h
   */
  async list(): Promise<Market[]> {
    return this.http.get<Market[]>('/api/markets');
  }

  /**
   * Get a specific market by ID
   * @param marketId - The market/trading pair ID
   */
  async get(marketId: number): Promise<Market | undefined> {
    const markets = await this.list();
    return markets.find(m => m.id === marketId);
  }

  /**
   * Find a market by symbol pair
   * @param baseSymbol - Base asset symbol (e.g., "BTC")
   * @param quoteSymbol - Quote asset symbol (e.g., "USDT")
   */
  async findBySymbols(baseSymbol: string, quoteSymbol: string): Promise<Market | undefined> {
    const markets = await this.list();
    return markets.find(
      m =>
        m.base_asset_symbol.toUpperCase() === baseSymbol.toUpperCase() &&
        m.quote_asset_symbol.toUpperCase() === quoteSymbol.toUpperCase()
    );
  }

  /**
   * Get all tickers with 24h price data (CMC format)
   * @example
   * const tickers = await client.markets.tickers();
   * // Returns ticker_id as "BTC_USDT" format
   */
  async tickers(): Promise<Ticker[]> {
    return this.http.get<Ticker[]>('/api/tickers');
  }

  /**
   * Get ticker for a specific symbol pair
   * @param tickerId - Ticker ID in CMC format (e.g., "BTC_USDT")
   */
  async ticker(tickerId: string): Promise<Ticker | undefined> {
    const tickers = await this.tickers();
    return tickers.find(t => t.ticker_id === tickerId);
  }

  /**
   * Get ticker by base and quote currency
   * @param baseCurrency - Base currency symbol (e.g., "BTC")
   * @param targetCurrency - Target/quote currency symbol (e.g., "USDT")
   */
  async tickerByPair(baseCurrency: string, targetCurrency: string): Promise<Ticker | undefined> {
    const tickers = await this.tickers();
    return tickers.find(
      t =>
        t.base_currency.toUpperCase() === baseCurrency.toUpperCase() &&
        t.target_currency.toUpperCase() === targetCurrency.toUpperCase()
    );
  }

  /**
   * Get orderbook for a trading pair
   * @param marketId - The market/trading pair ID
   * @param options - Options for the orderbook request
   * @example
   * const orderbook = await client.markets.orderbook(1);
   * console.log('Best bid:', orderbook.bids[0]);
   * console.log('Best ask:', orderbook.asks[0]);
   */
  async orderbook(
    marketId: number,
    options: { isCmc?: boolean } = {}
  ): Promise<Orderbook> {
    const response = await this.http.get<OrderbookRaw>('/api/orderbook', {
      marketId,
      isCmc: options.isCmc ?? false,
    });

    return {
      trading_pair_id: response.trading_pair_id,
      base_symbol: response.base_symbol,
      quote_symbol: response.quote_symbol,
      bids: (response.bids || []).map(([price, quantity]) => ({ price, quantity })),
      asks: (response.asks || []).map(([price, quantity]) => ({ price, quantity })),
    };
  }

  /**
   * Get raw orderbook (original API format with arrays)
   * @param marketId - The market/trading pair ID
   */
  async orderbookRaw(
    marketId: number,
    options: { isCmc?: boolean } = {}
  ): Promise<OrderbookRaw> {
    return this.http.get<OrderbookRaw>('/api/orderbook', {
      marketId,
      isCmc: options.isCmc ?? false,
    });
  }

  /**
   * Get OHLCV (candlestick) data
   * @param marketId - Trading pair ID
   * @param timeframe - Candle timeframe (e.g., "1h", "1d")
   * @param options - Additional options
   * @example
   * const candles = await client.markets.ohlcv(1, '1h');
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
    return this.http.get<OHLCV[]>('/api/ohlcv', {
      marketId,
      timeframe,
      limit: options.limit,
      startDate: options.startDate,
      endDate: options.endDate,
    });
  }

  /**
   * Get all available assets
   * @example
   * const assets = await client.markets.assets();
   */
  async assets(): Promise<Asset[]> {
    const response = await this.http.get<AssetsResponse>('/api/assets');
    return response.assets || [];
  }

  /**
   * Get a specific asset by symbol
   * @param symbol - Asset symbol (e.g., "BTC")
   */
  async asset(symbol: string): Promise<Asset | undefined> {
    const assets = await this.assets();
    return assets.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
  }

  /**
   * Get recent trades for a trading pair
   * @param marketId - Trading pair ID
   * @param limit - Number of trades to return
   */
  async trades(
    marketId: number,
    limit = 50
  ): Promise<
    Array<{
      id: string;
      price: string;
      quantity: string;
      side: 'buy' | 'sell';
      timestamp: string;
    }>
  > {
    return this.http.get('/api/trades', { marketId, limit });
  }
}
