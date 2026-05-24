import { HttpClient } from '../http';
import type {
  Market,
  MarketInfo,
  MarketSparklinesResponse,
  Ticker,
  Orderbook,
  OrderbookRaw,
  OHLCV,
  Timeframe,
  Asset,
  AssetInfo,
  AssetsResponse,
} from '../types';

export class MarketsEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Get all trading pairs.
   */
  async list(): Promise<Market[]> {
    return this.http.get<Market[]>('/api/markets');
  }

  /**
   * Get a specific market by ID.
   */
  async get(marketId: number): Promise<Market | undefined> {
    const markets = await this.list();
    return markets.find((m) => m.id === marketId);
  }

  /**
   * Find a market by base/quote symbols (case-insensitive).
   */
  async findBySymbols(baseSymbol: string, quoteSymbol: string): Promise<Market | undefined> {
    const markets = await this.list();
    return markets.find(
      (m) =>
        m.base_asset_symbol.toUpperCase() === baseSymbol.toUpperCase() &&
        m.quote_asset_symbol.toUpperCase() === quoteSymbol.toUpperCase()
    );
  }

  /**
   * Get sparkline data (recent price points) for every market.
   *
   * @param timeframe - OHLCV timeframe (e.g. "1h", "1D"). Default "1D".
   * @param limit - Number of points to return per market (1..10000, default 30).
   */
  async sparklines(
    timeframe = '1D',
    limit = 30
  ): Promise<MarketSparklinesResponse> {
    return this.http.get<MarketSparklinesResponse>('/api/markets/sparklines', {
      timeframe,
      limit,
    });
  }

  /**
   * Get just the trading rules (decimals, tick/step sizes, fees) for a pair.
   * Public endpoint.
   */
  async marketInfo(baseAssetSymbol: string, quoteAssetSymbol: string): Promise<MarketInfo | undefined> {
    return this.http.get<MarketInfo>('/api/market-info', {
      baseAssetSymbol,
      quoteAssetSymbol,
    });
  }

  /**
   * Look up an asset by numeric ID or symbol. Public endpoint.
   */
  async assetInfo(idOrSymbol: number | string): Promise<AssetInfo | undefined> {
    if (typeof idOrSymbol === 'number') {
      return this.http.get<AssetInfo>(`/api/asset-info/${idOrSymbol}`);
    }
    return this.http.get<AssetInfo>(`/api/asset-info/symbol/${encodeURIComponent(idOrSymbol)}`);
  }

  /**
   * Get all CMC-format tickers.
   */
  async tickers(): Promise<Ticker[]> {
    return this.http.get<Ticker[]>('/api/tickers');
  }

  /**
   * Find a ticker by its CMC-format ID (e.g. "BTC_USDT").
   */
  async ticker(tickerId: string): Promise<Ticker | undefined> {
    const tickers = await this.tickers();
    return tickers.find((t) => t.ticker_id === tickerId);
  }

  async tickerByPair(baseCurrency: string, targetCurrency: string): Promise<Ticker | undefined> {
    const tickers = await this.tickers();
    return tickers.find(
      (t) =>
        t.base_currency.toUpperCase() === baseCurrency.toUpperCase() &&
        t.target_currency.toUpperCase() === targetCurrency.toUpperCase()
    );
  }

  /**
   * Get orderbook for a trading pair in the UI format (price/quantity tuples).
   */
  async orderbook(marketId: number): Promise<Orderbook> {
    const response = await this.http.get<OrderbookRaw>('/api/orderbook', {
      marketId,
      isCmc: false,
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
   * Get the raw orderbook (arrays of `[price, quantity]`).
   */
  async orderbookRaw(marketId: number): Promise<OrderbookRaw> {
    return this.http.get<OrderbookRaw>('/api/orderbook', {
      marketId,
      isCmc: false,
    });
  }

  /**
   * Get OHLCV candles.
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
   * Get all available assets.
   */
  async assets(): Promise<Asset[]> {
    const response = await this.http.get<AssetsResponse>('/api/assets');
    return response.assets || [];
  }

  /**
   * Get a single asset from the `assets()` list.
   */
  async asset(symbol: string): Promise<Asset | undefined> {
    const assets = await this.assets();
    return assets.find((a) => a.symbol.toUpperCase() === symbol.toUpperCase());
  }

  /**
   * Get recent public trades for a pair. Backend currently hardcodes a
   * 100-row limit; the `limit` argument is accepted for forward-compat but
   * has no effect today.
   */
  async trades(
    marketId: number,
    limit = 50
  ): Promise<
    Array<{
      id: string;
      trading_pair_id: number;
      taker_order_id: string;
      maker_order_id: string;
      price: string;
      amount: string;
      taker_fee: string;
      maker_fee: string;
      side: 'buy' | 'sell';
      created_at: string | null;
    }>
  > {
    return this.http.get('/api/trades', { marketId, limit });
  }
}
