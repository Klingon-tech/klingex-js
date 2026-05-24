import { HttpClient } from '../http';
import type { Balance, DepositAddress } from '../types';

/**
 * Wallet/balance endpoints accessible via API keys.
 *
 * Only read endpoints are exposed here. Deposit-history, withdrawal-history,
 * and 2FA flows on the backend are JWT-only and intentionally not surfaced
 * in the SDK. Use {@link WithdrawalsEndpoint} (via `client.withdrawals.submit`)
 * to submit on-chain withdrawals with an API key that has the `withdraw` scope.
 */
export class WalletEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Get all wallet balances with extra SDK-computed convenience fields:
   *   - `available_balance` — raw `balance - locked_balance`
   *   - `human_balance`, `human_locked`, `human_available` — decimal strings
   *
   * @example
   * const balances = await client.wallet.balances();
   * const eth = balances.find(b => b.symbol === 'ETH');
   * console.log(`ETH: ${eth?.human_available}`);
   * console.log(`Deposit address: ${eth?.deposit_address}`);
   */
  async balances(): Promise<Balance[]> {
    const balances = await this.http.get<Balance[]>('/api/user-balances');

    return balances.map((b) => {
      const balance = BigInt(b.balance || '0');
      const locked = BigInt(b.locked_balance || '0');
      const available = balance - locked;

      return {
        ...b,
        available_balance: available.toString(),
        human_balance: this.formatUnits(b.balance, b.decimals),
        human_locked: this.formatUnits(b.locked_balance, b.decimals),
        human_available: this.formatUnits(available.toString(), b.decimals),
      };
    });
  }

  /**
   * Get balance for a specific asset symbol (case-insensitive).
   */
  async balance(symbol: string): Promise<Balance | undefined> {
    const balances = await this.balances();
    return balances.find((b) => b.symbol.toUpperCase() === symbol.toUpperCase());
  }

  /**
   * Get the deposit address for an asset (pulled from the balance response).
   * Returns `undefined` if the asset isn't in the user's wallet list or the
   * backend has no deposit address recorded for it yet.
   */
  async depositAddress(symbol: string): Promise<DepositAddress | undefined> {
    const balances = await this.http.get<Balance[]>('/api/user-balances');
    const wallet = balances.find((b) => b.symbol.toUpperCase() === symbol.toUpperCase());
    if (!wallet || !wallet.deposit_address) {
      return undefined;
    }
    return {
      address: wallet.deposit_address,
      memo: wallet.payment_id ?? undefined,
    };
  }

  /**
   * Format raw smallest-unit value to a human-readable decimal string.
   */
  private formatUnits(value: string, decimals: number): string {
    if (!value) return '0';
    if (decimals === 0) return value;

    const isNegative = value.startsWith('-');
    const abs = isNegative ? value.slice(1) : value;
    const padded = abs.padStart(decimals + 1, '0');
    const intPart = padded.slice(0, -decimals) || '0';
    const decPart = padded.slice(-decimals);

    const trimmedDec = decPart.replace(/0+$/, '');
    const out = trimmedDec ? `${intPart}.${trimmedDec}` : intPart;
    return isNegative ? `-${out}` : out;
  }
}
