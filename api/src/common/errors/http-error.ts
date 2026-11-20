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
 * Always surfaces as 502/504: an upstream 401/429 is our problem, not the
 * caller's. The upstream's own code is kept in `upstreamStatus`.
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

/** For an unknown breed id, TheCatAPI returns 400 and TheDogAPI returns 404. */
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

/** For optional extras like a breed photo. Failures other than `NotFoundError` are logged. */
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
