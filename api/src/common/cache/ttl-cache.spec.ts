import { TtlCache } from './ttl-cache';

describe('TtlCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = new TtlCache<number>(1000);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('stores and retrieves a value before it expires', () => {
    const cache = new TtlCache<string>(1000);
    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('expires a value after the ttl elapses', () => {
    jest.useFakeTimers().setSystemTime(0);
    const cache = new TtlCache<string>(1000);
    cache.set('key', 'value');

    jest.setSystemTime(1001);
    expect(cache.get('key')).toBeUndefined();
    jest.useRealTimers();
  });

  it('getOrSet calls the factory only once after the value is cached', async () => {
    const cache = new TtlCache<number>(1000);
    const factory = jest.fn().mockResolvedValue(42);

    expect(await cache.getOrSet('key', factory)).toBe(42);
    expect(await cache.getOrSet('key', factory)).toBe(42);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('getOrSet shares one in-flight factory call across true concurrent misses', async () => {
    const cache = new TtlCache<number>(1000);
    const factory = jest.fn(() => Promise.resolve().then(() => 42));

    // Both calls start before either factory call has resolved.
    const [first, second] = await Promise.all([
      cache.getOrSet('key', factory),
      cache.getOrSet('key', factory),
    ]);

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('clear() empties the cache', () => {
    const cache = new TtlCache<number>(1000);
    cache.set('key', 1);
    cache.clear();
    expect(cache.get('key')).toBeUndefined();
  });
});
