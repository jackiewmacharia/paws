import { ExternalApiError } from '../errors/http-error';

export interface HttpClientOptions {
  /** Human-readable name used in error messages, e.g. "TheCatAPI". */
  name: string;
  baseUrl: string;
  apiKey?: string;
  apiKeyHeader?: string;
  timeoutMs?: number;
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * Thin wrapper around the platform `fetch` for talking to a single upstream
 * REST API. Centralizes base URL, auth header, timeouts, and error mapping
 * so repositories only deal with typed data, never with `fetch` directly.
 */
export class HttpClient {
  constructor(private readonly options: HttpClientOptions) {}

  async get<T>(path: string, query?: QueryParams): Promise<T> {
    const url = this.buildUrl(path, query);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? 8000,
    );

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new ExternalApiError(
          this.options.name,
          await this.describeError(res, path),
          res.status,
        );
      }

      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ExternalApiError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ExternalApiError(
          this.options.name,
          `${this.options.name} timed out for ${path}`,
          undefined,
          504,
        );
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new ExternalApiError(
        this.options.name,
        `Failed to reach ${this.options.name}: ${reason}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async describeError(res: Response, path: string): Promise<string> {
    const fallback = `${this.options.name} responded with ${res.status} for ${path}`;
    try {
      const text = await res.text();
      if (!text) return fallback;
      try {
        const parsed: unknown = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && 'message' in parsed) {
          const { message } = parsed as { message: unknown };
          if (typeof message === 'string') return message;
        }
        return fallback;
      } catch {
        return text.length < 200 ? text : fallback;
      }
    } catch {
      return fallback;
    }
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const url = new URL(
      path.replace(/^\//, ''),
      `${this.options.baseUrl.replace(/\/?$/, '/')}`,
    );
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = { Accept: 'application/json' };
    if (this.options.apiKey) {
      headers[this.options.apiKeyHeader ?? 'x-api-key'] = this.options.apiKey;
    }
    return headers;
  }
}
