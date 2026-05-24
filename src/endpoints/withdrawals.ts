import { HttpClient } from '../http';

/**
 * Parameters for submitting an on-chain withdrawal via an API key.
 */
export interface SubmitWithdrawalParams {
  /** Asset symbol (e.g. "BTC", "ETH"). */
  symbol: string;
  /** Numeric asset ID. */
  assetId: number;
  /**
   * Amount in the asset's smallest base units, as a decimal integer string
   * (no decimal point, no scientific notation). Human-readable values like
   * `"0.5"` are rejected — convert using the asset's `decimals` first.
   *
   * Example: to withdraw 0.5 ETH (18 decimals), pass `"500000000000000000"`.
   */
  amount: string;
  /** Destination address. */
  address: string;
  /** XRP-style uint32 destination tag. */
  destinationTag?: number;
  /** Free-form string memo for Graphene chains (BLURT, etc.). */
  memo?: string;
}

/**
 * Response from a successful API-key-authenticated withdrawal submission.
 */
export interface SubmitWithdrawalResponse {
  message: string;
  withdrawalId: string;
}

/**
 * Withdrawal endpoints accessible via API keys.
 *
 * Only the submission endpoint accepts API keys (with the `withdraw` scope).
 * Validate-address, history, 2FA, and email-confirmation routes are JWT-only
 * and intentionally not exposed in the SDK.
 */
export class WithdrawalsEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Submit an on-chain withdrawal.
   *
   * API keys with the `withdraw` scope skip interactive 2FA and email
   * confirmation; the 2FA gate was enforced when the scope was granted.
   *
   * The `amount` is **raw base units** (a decimal integer string).
   *
   * @example
   * // Withdraw 0.5 ETH (1e18 wei per ETH).
   * const result = await client.withdrawals.submit({
   *   symbol: 'ETH',
   *   assetId: 2,
   *   amount: '500000000000000000',
   *   address: '0xabc...'
   * });
   * console.log(result.withdrawalId);
   */
  async submit(params: SubmitWithdrawalParams): Promise<SubmitWithdrawalResponse> {
    return this.http.post<SubmitWithdrawalResponse>('/api/submit-withdraw', {
      symbol: params.symbol,
      assetId: params.assetId,
      amount: params.amount,
      address: params.address,
      destinationTag: params.destinationTag,
      memo: params.memo,
    });
  }
}
