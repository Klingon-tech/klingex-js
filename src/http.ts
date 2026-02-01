import {
  KlingExError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  InsufficientFundsError,
} from './types';

export interface HttpClientConfig {
  baseUrl: string;
  apiKey?: string;
  jwt?: string;
  timeout: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

export class HttpClient {
  private config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.config = config;
  }

  /**
   * Update authentication credentials
   */
  setAuth(auth: { apiKey?: string; jwt?: string }): void {
    if (auth.apiKey) this.config.apiKey = auth.apiKey;
    if (auth.jwt) this.config.jwt = auth.jwt;
  }

  /**
   * Make an HTTP request to the API
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, headers = {} } = options;

    // Build URL with query parameters
    let url = `${this.config.baseUrl}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Add authentication
    if (this.config.apiKey) {
      requestHeaders['X-API-Key'] = this.config.apiKey;
    } else if (this.config.jwt) {
      requestHeaders['Authorization'] = `Bearer ${this.config.jwt}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: unknown;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('application/pdf')) {
        data = await response.blob();
      } else {
        data = await response.text();
      }

      // Handle errors
      if (!response.ok) {
        this.handleError(response.status, data);
      }

      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof KlingExError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new KlingExError('Request timeout', 'TIMEOUT', 408);
        }
        throw new KlingExError(error.message, 'NETWORK_ERROR');
      }

      throw new KlingExError('Unknown error occurred', 'UNKNOWN');
    }
  }

  /**
   * Handle HTTP error responses
   */
  private handleError(status: number, data: unknown): never {
    const errorMessage = this.extractErrorMessage(data);

    switch (status) {
      case 401:
        throw new AuthenticationError(errorMessage);
      case 429:
        const retryAfter = this.extractRetryAfter(data);
        throw new RateLimitError(errorMessage, retryAfter);
      case 400:
        if (errorMessage.toLowerCase().includes('insufficient')) {
          throw new InsufficientFundsError(errorMessage);
        }
        throw new ValidationError(errorMessage, data);
      default:
        throw new KlingExError(errorMessage, 'API_ERROR', status, data);
    }
  }

  /**
   * Extract error message from response
   */
  private extractErrorMessage(data: unknown): string {
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      return String(obj.error || obj.message || obj.detail || 'Unknown error');
    }
    return 'Unknown error';
  }

  /**
   * Extract retry-after value from rate limit response
   */
  private extractRetryAfter(data: unknown): number | undefined {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (typeof obj.retry_after === 'number') {
        return obj.retry_after;
      }
    }
    return undefined;
  }

  // Convenience methods

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', body });
  }
}
