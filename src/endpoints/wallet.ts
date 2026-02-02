import { HttpClient } from '../http';
import type {
  Balance,
  DepositAddress,
  WithdrawParams,
  WithdrawResponse,
} from '../types';

export class WalletEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Get all wallet balances
   * Each balance includes:
   * - balance: Total balance (raw value)
   * - locked_balance: Locked in orders (raw value)
   * - wallet_id: UUID of the wallet
   * - deposit_address: Deposit address for this asset
   * - id, symbol, name, decimals: Asset info
   * - min_deposit, min_withdrawal, withdrawal_fee: Limits
   *
   * @example
   * const balances = await client.wallet.balances();
   * const ethBalance = balances.find(b => b.symbol === 'ETH');
   * console.log(`ETH Balance: ${ethBalance?.balance}`);
   * console.log(`Deposit Address: ${ethBalance?.deposit_address}`);
   */
  async balances(): Promise<Balance[]> {
    const balances = await this.http.get<Balance[]>('/api/user-balances');

    // Compute available balance and human-readable values
    return balances.map(b => {
      const balance = BigInt(b.balance);
      const locked = BigInt(b.locked_balance);
      const available = balance - locked;
      const decimals = b.decimals;

      return {
        ...b,
        available_balance: available.toString(),
        human_balance: this.formatUnits(b.balance, decimals),
        human_locked: this.formatUnits(b.locked_balance, decimals),
        human_available: this.formatUnits(available.toString(), decimals),
      };
    });
  }

  /**
   * Get balance for a specific asset
   * @param symbol - Asset symbol (e.g., "BTC", "ETH", "USDT")
   */
  async balance(symbol: string): Promise<Balance | undefined> {
    const balances = await this.balances();
    return balances.find(b => b.symbol.toUpperCase() === symbol.toUpperCase());
  }

  /**
   * Get deposit address for an asset (from balance data)
   * The deposit_address is included in the balance response
   * @param symbol - Asset symbol (e.g., "BTC")
   * @example
   * const address = await client.wallet.depositAddress('ETH');
   * console.log(`Send ETH to: ${address.address}`);
   */
  async depositAddress(symbol: string): Promise<DepositAddress | undefined> {
    const balances = await this.http.get<Balance[]>('/api/user-balances');
    const balance = balances.find(b => b.symbol.toUpperCase() === symbol.toUpperCase());

    if (!balance) {
      return undefined;
    }

    return {
      address: balance.deposit_address,
    };
  }

  /**
   * Generate a new deposit address (if supported)
   * @param assetId - Asset ID
   */
  async generateDepositAddress(assetId: number): Promise<DepositAddress> {
    const response = await this.http.post<{ address: string; memo?: string }>('/api/generate-deposit-address', {
      assetId,
    });
    return {
      address: response.address,
      memo: response.memo,
    };
  }

  /**
   * Submit a withdrawal request
   * @param params - Withdrawal parameters
   * @example
   * const result = await client.wallet.withdraw({
   *   assetId: 2,
   *   symbol: 'ETH',
   *   address: '0x...',
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
  async history(): Promise<
    Array<{
      id: string;
      type: 'deposit' | 'withdrawal' | 'trade';
      asset: string;
      amount: string;
      status: string;
      created_at: string;
    }>
  > {
    return this.http.get('/api/history');
  }

  /**
   * Format raw units to human-readable decimal string
   * @param value - Raw value as string
   * @param decimals - Number of decimals
   */
  private formatUnits(value: string, decimals: number): string {
    if (decimals === 0) return value;

    const str = value.padStart(decimals + 1, '0');
    const intPart = str.slice(0, -decimals) || '0';
    const decPart = str.slice(-decimals);

    // Trim trailing zeros from decimal part
    const trimmedDec = decPart.replace(/0+$/, '');
    return trimmedDec ? `${intPart}.${trimmedDec}` : intPart;
  }
}
