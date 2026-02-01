import { HttpClient } from '../http';
import type {
  Balance,
  DepositAddress,
  WithdrawParams,
  WithdrawResponse,
  ApiResponse,
} from '../types';

export class WalletEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Get all wallet balances
   * @example
   * const balances = await client.wallet.balances();
   * const btcBalance = balances.find(b => b.symbol === 'BTC');
   * console.log(`BTC: ${btcBalance?.human_available}`);
   */
  async balances(): Promise<Balance[]> {
    const response = await this.http.get<ApiResponse<Balance[]>>('/api/user-balances');
    return response.data || [];
  }

  /**
   * Get balance for a specific asset
   * @param symbol - Asset symbol (e.g., "BTC")
   */
  async balance(symbol: string): Promise<Balance | undefined> {
    const balances = await this.balances();
    return balances.find(b => b.symbol.toUpperCase() === symbol.toUpperCase());
  }

  /**
   * Get deposit address for an asset
   * @param assetId - Asset ID
   * @example
   * const address = await client.wallet.depositAddress(1); // BTC
   * console.log(`Send BTC to: ${address.address}`);
   */
  async depositAddress(assetId: number): Promise<DepositAddress> {
    const response = await this.http.post<ApiResponse<DepositAddress>>('/api/deposit-address', {
      asset_id: assetId,
    });
    if (!response.data) {
      throw new Error('Failed to get deposit address');
    }
    return response.data;
  }

  /**
   * Generate a new deposit address (if supported)
   * @param assetId - Asset ID
   */
  async generateDepositAddress(assetId: number): Promise<DepositAddress> {
    const response = await this.http.post<ApiResponse<DepositAddress>>('/api/generate-deposit-address', {
      assetId,
    });
    if (!response.data) {
      throw new Error('Failed to generate deposit address');
    }
    return response.data;
  }

  /**
   * Submit a withdrawal request
   * @param params - Withdrawal parameters
   * @example
   * const result = await client.wallet.withdraw({
   *   assetId: 1,
   *   symbol: 'BTC',
   *   address: 'bc1q...',
   *   amount: '0.1'
   * });
   *
   * if (result.requires_2fa) {
   *   // Need to complete 2FA verification
   *   await client.wallet.confirm2FA(result.session_token, '123456');
   * }
   */
  async withdraw(params: WithdrawParams): Promise<WithdrawResponse> {
    return this.http.post<WithdrawResponse>('/api/submit-withdraw', {
      assetId: params.assetId,
      symbol: params.symbol,
      address: params.address,
      amount: params.amount,
      destinationTag: params.memo,
    });
  }

  /**
   * Complete withdrawal 2FA verification
   * @param sessionToken - Session token from withdraw response
   * @param code - 2FA code from authenticator app
   */
  async confirm2FA(sessionToken: string, code: string): Promise<{ message: string }> {
    return this.http.post('/api/withdrawal/complete-2fa', {
      sessionToken,
      code,
    });
  }

  /**
   * Get deposit history
   * @param options - Pagination options
   */
  async deposits(options: { limit?: number; offset?: number } = {}): Promise<{
    deposits: Array<{
      id: string;
      asset_id: number;
      symbol: string;
      amount: string;
      address: string;
      tx_hash?: string;
      status: string;
      confirmations: number;
      created_at: string;
    }>;
    total: number;
  }> {
    return this.http.get('/api/deposits', {
      limit: options.limit || 50,
      offset: options.offset || 0,
    });
  }

  /**
   * Get withdrawal history
   * @param options - Pagination options
   */
  async withdrawals(options: { limit?: number; offset?: number } = {}): Promise<{
    withdrawals: Array<{
      id: string;
      asset_id: number;
      symbol: string;
      amount: string;
      fee: string;
      address: string;
      tx_hash?: string;
      status: string;
      created_at: string;
    }>;
    total: number;
  }> {
    return this.http.get('/api/withdrawals', {
      limit: options.limit || 50,
      offset: options.offset || 0,
    });
  }

  /**
   * Get transaction history (deposits + withdrawals + trades)
   */
  async history(): Promise<Array<{
    id: string;
    type: 'deposit' | 'withdrawal' | 'trade';
    asset: string;
    amount: string;
    status: string;
    created_at: string;
  }>> {
    const response = await this.http.get<ApiResponse<Array<{
      id: string;
      type: 'deposit' | 'withdrawal' | 'trade';
      asset: string;
      amount: string;
      status: string;
      created_at: string;
    }>>>('/api/history');
    return response.data || [];
  }
}
