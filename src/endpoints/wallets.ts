import { HttpClient } from '../http';

export interface WalletsStatusCounts {
  active: number;
  delayed: number;
  stale: number;
  never_synced: number;
}

export interface WalletAssetSync {
  asset_id: number;
  symbol: string;
  name: string;
  network_name: string;
  chain_id: number | null;
  block_number: number | null;
  processed_at: string | null;
  sync_status: string;
  seconds_since_last_sync: number | null;
  explorer_url: string | null;
  deposits_enabled: boolean;
  withdrawals_enabled: boolean;
}

export interface WalletChainGroup {
  network_name: string;
  chain_id: number | null;
  assets: WalletAssetSync[];
}

export interface WalletsStatus {
  overall_status: string;
  system_health_percentage: number;
  last_updated: string;
  status_counts: WalletsStatusCounts;
  total_assets: number;
  chain_groups: WalletChainGroup[];
}

export interface WalletSyncInfo {
  current_block: number | null;
  last_processed_at: string | null;
  sync_status: string;
  seconds_since_last_sync: number | null;
}

export interface WalletAssetStatusDetail {
  asset_id: number;
  symbol: string;
  name: string;
  chain_type: string | null;
  network_name: string;
  chain_id: number | null;
  contract_address: string | null;
  explorer_url: string | null;
  is_active: boolean | null;
  withdrawal_enabled: boolean;
  deposit_confirms_required: number;
  sync_info: WalletSyncInfo;
}

/**
 * Public wallet sync status endpoints. No authentication required.
 */
export class WalletsEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Get the overall wallet/sync status across all assets and networks.
   */
  async status(): Promise<WalletsStatus> {
    return this.http.get<WalletsStatus>('/api/wallets/status');
  }

  /**
   * Get the sync status for a single asset.
   */
  async assetStatus(assetId: number): Promise<WalletAssetStatusDetail> {
    return this.http.get<WalletAssetStatusDetail>(`/api/wallets/status/${assetId}`);
  }
}
