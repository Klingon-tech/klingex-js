import { HttpClient } from '../http';
import type {
  Invoice,
  InvoiceListParams,
  InvoiceListResponse,
  InvoiceStatusResponse,
  InvoiceFeeStats,
  PublicInvoice,
  CreateInvoiceParams,
} from '../types';

/**
 * Merchant invoice endpoints.
 *
 * Requires a merchant account on the exchange plus an API key with:
 *   - `read` scope for `get`, `list`, `status`, `getPdf`, `feeStats`.
 *   - `trade` scope for `create` and `cancel`.
 *
 * The public payment-page endpoint (`paymentPage`) requires no auth.
 */
export class InvoicesEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Create a new invoice.
   *
   * @example
   * const invoice = await client.invoices.create({
   *   denomination: { type: 'crypto', currency: 'USDT', amount: '100.00' },
   *   accepted_coins: ['USDT', 'BTC', 'ETH'],
   *   external_id: 'order-12345',
   *   expires_in_minutes: 30,
   *   description: 'Order #12345',
   *   buyer_email: 'buyer@example.com',
   * });
   * console.log(invoice.payment_page_url);
   * for (const opt of invoice.payment_options ?? []) {
   *   console.log(`Pay ${opt.expected_amount} ${opt.symbol} to ${opt.address}`);
   * }
   */
  async create(params: CreateInvoiceParams): Promise<Invoice> {
    const response = await this.http.post<{ message?: string; data: Invoice }>(
      '/api/invoices',
      {
        denomination: params.denomination,
        accepted_coins: params.accepted_coins,
        external_id: params.external_id,
        expires_in_minutes: params.expires_in_minutes,
        description: params.description,
        metadata: params.metadata,
        buyer_email: params.buyer_email,
        payment_tolerance: params.payment_tolerance,
      }
    );
    if (!response?.data) {
      throw new Error('Invoice creation returned no data');
    }
    return response.data;
  }

  /**
   * List your merchant's invoices (paginated).
   */
  async list(params: InvoiceListParams = {}): Promise<InvoiceListResponse> {
    const response = await this.http.get<{ data: InvoiceListResponse }>('/api/invoices', {
      status: params.status,
      external_id: params.external_id,
      page: params.page,
      page_size: params.page_size,
    });
    return response.data;
  }

  /**
   * Get a single invoice (full detail, including payment options + payments).
   */
  async get(invoiceId: string): Promise<Invoice> {
    const response = await this.http.get<{ data: Invoice }>(`/api/invoices/${invoiceId}`);
    return response.data;
  }

  /**
   * Lightweight status poll for an invoice. Public endpoint (no auth needed).
   */
  async status(invoiceId: string): Promise<InvoiceStatusResponse> {
    const response = await this.http.get<{ data: InvoiceStatusResponse }>(
      `/api/invoices/${invoiceId}/status`
    );
    return response.data;
  }

  /**
   * Cancel a pending invoice. Sends `POST /api/invoices/:id/cancel`.
   */
  async cancel(invoiceId: string): Promise<{ message: string }> {
    return this.http.post<{ message: string }>(`/api/invoices/${invoiceId}/cancel`);
  }

  /**
   * Get the invoice receipt as a PDF blob.
   */
  async getPdf(invoiceId: string): Promise<Blob> {
    return this.http.get<Blob>(`/api/invoices/${invoiceId}/pdf`);
  }

  /**
   * Get aggregate fee statistics for your merchant account.
   *
   * Note: this returns *collected fee totals* across all invoices — it is not
   * a per-invoice or per-asset fee estimate.
   */
  async feeStats(): Promise<InvoiceFeeStats> {
    const response = await this.http.get<{ data: InvoiceFeeStats }>('/api/invoices/fees');
    return response.data;
  }

  /**
   * Get the public payment-page payload for an invoice (no auth required).
   * Use this to render a hosted payment page for the invoice buyer.
   */
  async paymentPage(invoiceId: string): Promise<PublicInvoice> {
    const response = await this.http.get<{ data: PublicInvoice }>(
      `/api/invoices/${invoiceId}/pay`
    );
    return response.data;
  }
}
