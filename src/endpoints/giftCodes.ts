import { HttpClient } from '../http';

export interface CreateGiftCodeParams {
  /** Asset ID to fund the gift code with. */
  assetId: number;
  /**
   * Amount in raw base units (decimal integer string). The backend stores and
   * validates the amount as a BigInt-string against the asset's decimals.
   */
  amount: string;
  /** Optional gift message (max 500 chars). */
  message?: string;
  /** Hide the amount from the redeemer's preview until they redeem. */
  hideAmount?: boolean;
  /** Days until expiration (1..365). */
  expiresInDays?: number;
  /** 6-digit 2FA code if the user has 2FA enabled. */
  twoFactorCode?: string;
}

export interface BulkCreateGiftCodeParams {
  assetId: number;
  /** Amount per code in raw base units. */
  amountPerCode: string;
  /** Number of codes to mint (2..100). */
  count: number;
  message?: string;
  hideAmount?: boolean;
  expiresInDays?: number;
  twoFactorCode?: string;
}

export interface CreateGiftCodeResponse {
  gift_code_id: string;
  code: string;
  formatted_code: string;
  asset_id: number;
  asset_symbol: string;
  asset_decimals: number;
  amount: string;
  amount_formatted: string;
  hide_amount: boolean;
  message?: string;
  expires_at?: string | null;
  created_at: string;
  new_balance: string;
}

export interface BulkCreateGiftCodeResponse {
  gift_codes: CreateGiftCodeResponse[];
  total_amount: string;
  total_amount_formatted: string;
  count: number;
  new_balance: string;
}

/**
 * Gift code endpoints accessible via API keys.
 *
 * Only the creation endpoints accept API keys (with the `trade` scope).
 * Redeem, preview, cancel, and list routes are JWT-only and intentionally
 * not surfaced in the SDK.
 */
export class GiftCodesEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Create a single gift code funded from the caller's wallet.
   */
  async create(params: CreateGiftCodeParams): Promise<CreateGiftCodeResponse> {
    return this.http.post<CreateGiftCodeResponse>('/api/gift-codes', {
      asset_id: params.assetId,
      amount: params.amount,
      message: params.message,
      hide_amount: params.hideAmount ?? false,
      expires_in_days: params.expiresInDays,
      two_factor_code: params.twoFactorCode,
    });
  }

  /**
   * Create N gift codes of the same denomination in one batched call.
   */
  async createBulk(params: BulkCreateGiftCodeParams): Promise<BulkCreateGiftCodeResponse> {
    return this.http.post<BulkCreateGiftCodeResponse>('/api/gift-codes/bulk', {
      asset_id: params.assetId,
      amount_per_code: params.amountPerCode,
      count: params.count,
      message: params.message,
      hide_amount: params.hideAmount ?? false,
      expires_in_days: params.expiresInDays,
      two_factor_code: params.twoFactorCode,
    });
  }
}
