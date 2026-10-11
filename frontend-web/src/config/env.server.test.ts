import { parseServerEnv } from './env.server';

describe('parseServerEnv', () => {
  it('falls back to the local gateway when API_BASE_URL is unset', () => {
    expect(parseServerEnv({})).toEqual({ API_BASE_URL: 'http://127.0.0.1:4000' });
  });

  it('accepts a configured gateway URL', () => {
    expect(parseServerEnv({ API_BASE_URL: 'https://api.bazaar.test' })).toEqual({
      API_BASE_URL: 'https://api.bazaar.test',
    });
  });

  it('fails fast with the variable name when the URL is invalid', () => {
    expect(() => parseServerEnv({ API_BASE_URL: 'not a url' })).toThrow(/API_BASE_URL/);
  });
});
