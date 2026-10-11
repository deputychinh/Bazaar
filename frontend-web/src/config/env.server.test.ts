import { parseServerEnv } from './env.server';

describe('parseServerEnv', () => {
  it('falls back to the local gateway and site URLs when unset', () => {
    expect(parseServerEnv({})).toEqual({
      API_BASE_URL: 'http://127.0.0.1:4000',
      SITE_URL: 'http://localhost:3100',
    });
  });

  it('accepts configured URLs', () => {
    expect(
      parseServerEnv({ API_BASE_URL: 'https://api.bazaar.test', SITE_URL: 'https://bazaar.test' }),
    ).toEqual({ API_BASE_URL: 'https://api.bazaar.test', SITE_URL: 'https://bazaar.test' });
  });

  it('fails fast with the variable name when a URL is invalid', () => {
    expect(() => parseServerEnv({ API_BASE_URL: 'not a url' })).toThrow(/API_BASE_URL/);
    expect(() => parseServerEnv({ SITE_URL: 'nope' })).toThrow(/SITE_URL/);
    expect(() => parseServerEnv({ REVALIDATE_SECRET: 'short' })).toThrow(/REVALIDATE_SECRET/);
  });
});
