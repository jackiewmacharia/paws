/**
 * Small in-memory, time-to-live cache. Used by repositories to avoid
 * re-fetching upstream data (like breed lists) that barely changes,
 * which keeps us under the free-tier rate limits of TheCatAPI / TheDogAPI.
 *
 * Intentionally process-local and dependency-free — good enough for a
 * single instance of this service; swap for Redis if this ever runs multi-instance.
 */
export class TtlCache<T> {
  private readonly store = new Map<string, { value: T; expiresAt: number }>();
  private readonly pending = new Map<string, Promise<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  /**
   * Returns the cached value for `key`, populating it via `factory` on a
   * miss. Concurrent misses for the same key share one in-flight `factory`
   * call instead of each firing their own upstream request.
   */
  async getOrSet(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const inFlight = this.pending.get(key);
    if (inFlight !== undefined) return inFlight;

    const promise = factory()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => this.pending.delete(key));

    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.store.clear();
  }
}
