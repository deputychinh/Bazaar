import { cookieString, readCookie } from './cookie.util';

describe('cookies', () => {
  it('reads one cookie among many', () => {
    expect(readCookie('bazaar_currency', 'NEXT_LOCALE=vi; bazaar_currency=VND; other=1')).toBe(
      'VND',
    );
    expect(readCookie('missing', 'a=1')).toBeNull();
  });

  it('writes a site-wide cookie with an expiry', () => {
    expect(cookieString('bazaar_currency', 'USD', 60)).toBe(
      'bazaar_currency=USD; Path=/; Max-Age=60; SameSite=Lax',
    );
  });
});
