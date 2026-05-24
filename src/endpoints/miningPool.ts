import { HttpClient } from '../http';

export interface PoolConfig {
  algorithm: string;
  symbol: string;
  stratum_port: number;
  pool_fee_percent: number;
  pool_hashrate: string;
  min_difficulty: number;
}

export interface PoolBlock {
  id: number;
  asset_id: number;
  symbol: string;
  block_height: number;
  block_hash: string;
  block_reward: string;
  pool_fee: string;
  confirmations: number;
  required_confirmations: number;
  status: string;
  found_at: string;
  matured_at: string | null;
  credited_at: string | null;
  asset_decimals: number;
}

export interface PoolBlocksResponse {
  blocks: PoolBlock[];
  total: number;
  limit: number;
  offset: number;
}

export interface PoolStatsCurrent {
  pool_hashrate: string;
  network_hashrate: string;
  network_difficulty: number;
  online_workers: number;
  active_miners: number;
  block_height: number;
  blocks_24h?: number;
  current_effort?: number;
  ttf_minutes?: number;
  net_share?: number;
  last_block_found?: string;
  luck_24h?: number;
}

export interface PoolStatsSnapshot {
  timestamp: string;
  pool_hashrate: string;
  network_hashrate: string;
  network_difficulty: number;
  online_workers: number;
  active_miners: number;
}

export interface PoolStats {
  symbol: string;
  current: PoolStatsCurrent;
  history: PoolStatsSnapshot[];
}

export interface PoolLeaderboardEntry {
  user_id: string;
  total_rewards: string;
  reward_formatted: string;
  blocks_found: number;
  total_shares: number;
  hashrate: string;
  worker_count: number;
}

export interface PoolLeaderboard {
  symbol: string;
  period: string;
  miners: PoolLeaderboardEntry[];
}

export interface PoolWorker {
  worker_name: string;
  symbol: string;
  hashrate_1m: string;
  difficulty: number;
  shares_accepted: number;
  shares_rejected: number;
  shares_stale: number;
  is_online: boolean;
  last_share_at: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
}

export interface PoolWorkersResponse {
  workers: PoolWorker[];
}

export interface PoolReward {
  id: string;
  block_id: number;
  asset_id: number;
  asset_symbol: string;
  asset_name: string;
  asset_decimals: number;
  reward_amount: string;
  reward_amount_formatted: string;
  shares: number;
  total_shares: number;
  status: string;
  created_at: string;
  credited_at: string | null;
  block_height: number;
  block_hash: string;
  block_status: string;
  confirmations: number;
  required_confirmations: number;
  found_at: string;
}

export interface PoolRewardsResponse {
  rewards: PoolReward[];
  total: number;
  limit: number;
  offset: number;
}

export interface PoolPayout {
  id: string;
  wallet_id: string;
  reward_id: string | null;
  block_id: number | null;
  asset_id: number;
  asset_symbol: string;
  asset_name: string;
  asset_decimals: number;
  amount: string;
  amount_formatted: string;
  created_at: string;
  block_height: number | null;
  block_hash: string | null;
}

export interface PoolPayoutsResponse {
  payouts: PoolPayout[];
  total: number;
  limit: number;
  offset: number;
}

export interface PoolListParams {
  /** Default 20. */
  limit?: number;
  /** Default 0. */
  offset?: number;
  /** Optional symbol filter. */
  symbol?: string;
}

export type PoolStatsPeriod = '1h' | '6h' | '24h' | '7d' | '30d';

/**
 * Mining pool endpoints.
 *
 * - `configs`, `blocks`, `stats`, `leaderboard` are public.
 * - `myWorkers`, `myRewards`, `myPayouts` require an API key with `read` scope.
 */
export class MiningPoolEndpoint {
  constructor(private http: HttpClient) {}

  /** List per-coin pool configuration (algorithm, port, fee). Public. */
  async configs(): Promise<PoolConfig[]> {
    const res = await this.http.get<{ pools: PoolConfig[] }>('/api/pool/configs');
    return res.pools ?? [];
  }

  /** Recent blocks found by the pool. Public. */
  async blocks(params: PoolListParams = {}): Promise<PoolBlocksResponse> {
    return this.http.get<PoolBlocksResponse>('/api/pool/blocks', {
      limit: params.limit,
      offset: params.offset,
      symbol: params.symbol,
    });
  }

  /** Pool stats (hashrate, difficulty, effort, luck) for a given coin. Public. */
  async stats(symbol: string, period: PoolStatsPeriod = '24h'): Promise<PoolStats> {
    return this.http.get<PoolStats>('/api/pool/stats', { symbol, period });
  }

  /** Top miners for a given coin. Public. */
  async leaderboard(symbol: string, period: PoolStatsPeriod | string = '24h'): Promise<PoolLeaderboard> {
    return this.http.get<PoolLeaderboard>('/api/pool/leaderboard', { symbol, period });
  }

  /** Your authenticated miner's currently-known workers. Requires `read` scope. */
  async myWorkers(symbol?: string): Promise<PoolWorkersResponse> {
    return this.http.get<PoolWorkersResponse>('/api/pool/my-workers', { symbol });
  }

  /** Your mining rewards (per-block, before payout). Requires `read` scope. */
  async myRewards(params: PoolListParams = {}): Promise<PoolRewardsResponse> {
    return this.http.get<PoolRewardsResponse>('/api/pool/my-rewards', {
      limit: params.limit,
      offset: params.offset,
      symbol: params.symbol,
    });
  }

  /** Your finalized mining payouts. Requires `read` scope. */
  async myPayouts(params: PoolListParams = {}): Promise<PoolPayoutsResponse> {
    return this.http.get<PoolPayoutsResponse>('/api/pool/my-payouts', {
      limit: params.limit,
      offset: params.offset,
      symbol: params.symbol,
    });
  }
}
