import { loadConfig } from './env.js';

describe('loadConfig', () => {
  it('applies defaults when nothing (or an empty value) is set', () => {
    const expected = { pawsApiUrl: 'http://localhost:3000', requestTimeoutMs: 20_000 };
    expect(loadConfig({})).toEqual(expected);
    expect(loadConfig({ PAWS_API_URL: '', PAWS_API_REQUEST_TIMEOUT_MS: '' })).toEqual(expected);
  });

  it('strips trailing slashes but keeps a path prefix', () => {
    expect(loadConfig({ PAWS_API_URL: 'http://host/api//' }).pawsApiUrl).toBe('http://host/api');
  });

  it('fails fast, naming the variable, on an invalid URL or timeout', () => {
    expect(() => loadConfig({ PAWS_API_URL: 'localhost:3000' })).toThrow(/PAWS_API_URL/);
    expect(() => loadConfig({ PAWS_API_REQUEST_TIMEOUT_MS: '20s' })).toThrow(/PAWS_API_REQUEST_TIMEOUT_MS/);
    expect(() => loadConfig({ PAWS_API_REQUEST_TIMEOUT_MS: '-1' })).toThrow(/PAWS_API_REQUEST_TIMEOUT_MS/);
  });
});
