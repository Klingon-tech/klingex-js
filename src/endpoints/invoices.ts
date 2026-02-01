import { HttpClient } from '../http';
import type {
  Invoice,
  CreateInvoiceParams,
  InvoiceFees,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export class InvoicesEndpoint {
  constructor(private http: HttpClient) {}

  /**
   * Create a new payment invoice
   * @param params - Invoice parameters
   * @example
   * const invoice = await client.invoices.create({
   *   amount: '100.00',
   *   asset: 'USDT',
   *   description: 'Order #12345',
   *   external_id: 'order-12345',
   *   webhook_url: 'https://yoursite.com/webhook'
   * });
   *
   * console.log(`Payment address: ${invoice.payment_address}`);
   * console.log(`Expires: ${invoice.expires_at}`);
   */
  async create(params: CreateInvoiceParams): Promise<Invoice> {
    const response = await this.http.post<ApiResponse<Invoice>>('/api/invoices', {
      amount: params.amount,
      asset: params.asset,
      description: params.description,
      external_id: params.external_id,
      webhook_url: params.webhook_url,
      redirect_url: params.redirect_url,
      expires_in: params.expires_in,
    });

    if (!response.data) {
      throw new Error('Failed to create invoice');
    }
    return response.data;
  }

  /**
   * Get all invoices
   * @param options - Pagination and filter options
   */
  async list(options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}): Promise<PaginatedResponse<Invoice>> {
    return this.http.get('/api/invoices', {
      limit: options.limit || 50,
      offset: options.offset || 0,
      status: options.status,
    });
  }

  /**
   * Get a specific invoice by ID
   * @param invoiceId - Invoice UUID
   */
  async get(invoiceId: string): Promise<Invoice> {
    const response = await this.http.get<ApiResponse<Invoice>>(`/api/invoices/${invoiceId}`);
    if (!response.data) {
      throw new Error('Invoice not found');
    }
    return response.data;
  }

  /**
   * Get invoice status (for polling)
   * @param invoiceId - Invoice UUID
   */
  async status(invoiceId: string): Promise<{
    status: string;
    paid_amount?: string;
    confirmations?: number;
  }> {
    return this.http.get(`/api/invoices/${invoiceId}/status`);
  }

  /**
   * Cancel a pending invoice
   * @param invoiceId - Invoice UUID
   */
  async cancel(invoiceId: string): Promise<{ message: string }> {
    return this.http.post(`/api/invoices/${invoiceId}/cancel`);
  }

  /**
   * Get invoice PDF
   * @param invoiceId - Invoice UUID
   * @returns PDF blob
   */
  async pdf(invoiceId: string): Promise<Blob> {
    return this.http.get(`/api/invoices/${invoiceId}/pdf`);
  }

  /**
   * Get estimated fees for an invoice
   * @param asset - Asset symbol
   * @param amount - Invoice amount
   */
  async fees(asset: string, amount: string): Promise<InvoiceFees> {
    const response = await this.http.get<ApiResponse<InvoiceFees>>('/api/invoices/fees', {
      asset,
      amount,
    });
    if (!response.data) {
      return {
        network_fee: '0',
        service_fee: '0',
        total_fee: '0',
      };
    }
    return response.data;
  }

  /**
   * Get public invoice payment page data (no auth required)
   * @param invoiceId - Invoice UUID
   */
  async paymentPage(invoiceId: string): Promise<{
    invoice: Invoice;
    qr_code?: string;
    payment_uri?: string;
  }> {
    return this.http.get(`/api/invoices/${invoiceId}/pay`);
  }
}
