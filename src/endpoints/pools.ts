import { HttpClient } from '../http';
import { KlingExError } from '../types';

export interface PoolListItem {
  id: number;
  base_symbol: string;
  quote_symbol: string;
  base_reserve: string;
  quote_reserve: string;
  base_decimals: number;
  quote_decimals: number;
  total_lp_tokens: string;
  pool_fee_rate: string;
  spot_price: string;
  is_public: boolean;
  deposits_paused: boolean;
  withdrawals_paused: boolean;
}

export interface PoolDetail extends PoolListItem {
  k_value: string;
  min_liquidity: string;
  order_levels: number;
  active_orders: number;
  lp_position_count: number;
}

export interface UserPosition {
  pool_id: number;
  base_symbol: string;
  quote_symbol: string;
  lp_token_balance: string;
  base_deposited: string;
  quote_deposited: string;
  base_decimals: number;
  quote_decimals: number;
  base_value: string;
  quote_value: string;
  share_pct: string;
  base_earned: string;
  quote_earned: string;
  net_earned_quote: string;
  approx_fees_earned: string;
}

export interface PositionHistorySnapshot {
  timestamp: string;
  lp_token_balance: string;
  base_value: string;
  quote_value: string;
  total_value_quote: string;
  net_earned_quote: string;
  share_pct: string;
  spot_price: string;
}

export interface PositionHistoryResponse {
  pool_id: number;
  base_symbol: string;
  quote_symbol: string;
  base_decimals: number;
  quote_decimals: number;
  history: PositionHistorySnapshot[];
}

export interface AddLiquidityParams {
  poolId: number;
  /** Maximum base asset to deposit (smallest units). */
  baseAmountMax: string;
  /** Maximum quote asset to deposit (smallest units). */
  quoteAmountMax: string;
  /** Minimum LP tokens to mint (slippage protection). */
  minLpTokens: string;
}

export interface AddLiquidityResult {
  pool_id: number;
  base_used: string;
  quote_used: string;
  lp_tokens_minted: string;
  is_bootstrap: boolean;
  total_lp_supply: string;
}

export interface RemoveLiquidityParams {
  poolId: number;
  /** LP tokens to burn (smallest units). */
  lpTokens: string;
  /** Minimum base asset to receive (slippage protection). */
  minBaseOut: string;
  /** Minimum quote asset to receive (slippage protection). */
  minQuoteOut: string;
}

export interface RemoveLiquidityResult {
  pool_id: number;
  lp_tokens_burned: string;
  base_out: string;
  quote_out: string;
  total_lp_supply: string;
}

interface PoolEnvelope<T> {
  success: boolean;
  data: T;
}

/**
 * Liquidity pool endpoints.
 *
 * - `list` and `get` are public (no auth).
 * - `positions` / `positionHistory` require an API key with the `read` scope.
 * - `addLiquidity` / `removeLiquidity` require an API key with the `liquidity` scope.
 */
export class PoolsEndpoint {
  constructor(private http: HttpClient) {}

  /** List all active, public liquidity pools (no auth). */
  async list(): Promise<PoolListItem[]> {
    const res = await this.http.get<PoolEnvelope<PoolListItem[]>>('/api/pools/list');
    return res.data;
  }

  /** Get details for a single pool by ID (no auth). */
  async get(poolId: number): Promise<PoolDetail> {
    const res = await this.http.get<PoolEnvelope<PoolDetail>>(`/api/pools/${poolId}`);
    return res.data;
  }

  /** Get the authenticated user's LP positions across all pools. */
  async positions(): Promise<UserPosition[]> {
    const res = await this.http.get<PoolEnvelope<UserPosition[]>>('/api/pools/positions');
    return res.data;
  }

  /**
   * Get historical chart data for the user's position in a single pool.
   * Returns an empty history if the user has no position in this pool (404).
   * @param poolId - Pool ID.
   * @param days - Lookback window in days (1-365, default 30).
   */
  async positionHistory(poolId: number, days = 30): Promise<PositionHistoryResponse> {
    try {
      const res = await this.http.get<PoolEnvelope<PositionHistoryResponse>>(
        '/api/pools/positions/history',
        { pool_id: poolId, days },
      );
      return res.data;
    } catch (err) {
      if (err instanceof KlingExError && err.statusCode === 404) {
        return {
          pool_id: poolId,
          base_symbol: '',
          quote_symbol: '',
          base_decimals: 0,
          quote_decimals: 0,
          history: [],
        };
      }
      throw err;
    }
  }

  /** Deposit liquidity into a pool. Requires `liquidity` scope. */
  async addLiquidity(params: AddLiquidityParams): Promise<AddLiquidityResult> {
    const res = await this.http.post<PoolEnvelope<AddLiquidityResult>>('/api/pools/add-liquidity', {
      pool_id: params.poolId,
      base_amount_max: params.baseAmountMax,
      quote_amount_max: params.quoteAmountMax,
      min_lp_tokens: params.minLpTokens,
    });
    return res.data;
  }

  /** Burn LP tokens and withdraw the underlying assets. Requires `liquidity` scope. */
  async removeLiquidity(params: RemoveLiquidityParams): Promise<RemoveLiquidityResult> {
    const res = await this.http.post<PoolEnvelope<RemoveLiquidityResult>>('/api/pools/remove-liquidity', {
      pool_id: params.poolId,
      lp_tokens: params.lpTokens,
      min_base_out: params.minBaseOut,
      min_quote_out: params.minQuoteOut,
    });
    return res.data;
  }
}
