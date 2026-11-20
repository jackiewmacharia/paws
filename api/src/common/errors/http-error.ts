/**
 * Base error for anything that should be surfaced to the client as a
 * specific HTTP status code + message, instead of a generic 500.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string | string[],
  ) {
    super(Array.isArray(message) ? message.join(', ') : message);
    this.name = 'HttpError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string | string[] = 'Not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

/**
 * Raised by repositories when an upstream pet API (TheCatAPI / TheDogAPI)
 * fails, times out, or returns a non-2xx response. The client-facing
 * `status` is always a gateway error (502, or 504 for timeouts) — an
 * upstream 401/429 is our problem, not the caller's — while the upstream's
 * own code is kept in `upstreamStatus` so services can still translate
 * specific cases (e.g. an upstream 400 for an unknown breed id becomes a
 * client-facing 404).
 */
export class ExternalApiError extends HttpError {
  constructor(
    public readonly source: string,
    message: string,
    public readonly upstreamStatus?: number,
    status = 502,
  ) {
    super(status, message);
    this.name = 'ExternalApiError';
  }
}

/**
 * Runs an upstream call and turns an upstream 400 or 404 into a
 * client-facing `NotFoundError`. Both TheCatAPI and TheDogAPI use this
 * shape for "unknown breed id" — they just disagree on which status they
 * use for it — so callers shouldn't have to guess which one applies.
 */
export async function notFoundOnUpstreamMiss<T>(fn: () => Promise<T>, message: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ExternalApiError && (err.upstreamStatus === 400 || err.upstreamStatus === 404)) {
      throw new NotFoundError(message);
    }
    throw err;
  }
}

/**
 * Resolves to `undefined` instead of rejecting, for best-effort extras (like
 * a breed photo) that shouldn't fail the whole response. A `NotFoundError` is
 * expected and stays quiet; anything else (bad API key, rate limit, outage)
 * is logged so it doesn't go unnoticed.
 */
export async function bestEffort<T>(promise: Promise<T>, context: string): Promise<T | undefined> {
  try {
    return await promise;
  } catch (err) {
    if (!(err instanceof NotFoundError)) {
      // eslint-disable-next-line no-console
      console.warn(`[best-effort] ${context} failed:`, err);
    }
    return undefined;
  }
}
