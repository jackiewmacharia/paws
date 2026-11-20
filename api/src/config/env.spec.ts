import { loadConfig } from './env';

describe('loadConfig', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('applies defaults when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      catApi: { baseUrl: 'https://api.thecatapi.com/v1', apiKey: undefined },
      dogApi: { baseUrl: 'https://api.thedogapi.com/v1', apiKey: undefined },
    });
  });

  it('treats empty values (as in .env.template) as unset', () => {
    const config = loadConfig({ PORT: '', CAT_API_KEY: '', CAT_API_BASE_URL: '  ' });
    expect(config.port).toBe(3000);
    expect(config.catApi).toEqual({ baseUrl: 'https://api.thecatapi.com/v1', apiKey: undefined });
  });

  it('parses provided values', () => {
    const config = loadConfig({ PORT: '8080', DOG_API_KEY: 'k', DOG_API_BASE_URL: 'http://localhost:9000/v1' });
    expect(config.port).toBe(8080);
    expect(config.dogApi).toEqual({ baseUrl: 'http://localhost:9000/v1', apiKey: 'k' });
  });

  it('fails fast, naming the variable, on an invalid port or base URL', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/);
    expect(() => loadConfig({ CAT_API_BASE_URL: 'api.thecatapi.com/v1' })).toThrow(/CAT_API_BASE_URL/);
    expect(() => loadConfig({ DOG_API_BASE_URL: 'localhost:9000' })).toThrow(/DOG_API_BASE_URL/);
  });

  it('warns about each missing API key', () => {
    loadConfig({ CAT_API_KEY: 'k' });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('DOG_API_KEY'));
  });
});
