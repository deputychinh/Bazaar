import { Locale } from '@/api/gateway.schema';

import { localizedAlternates } from './alternates.util';
import { pickLocalized } from './localized-text.util';

describe('pickLocalized', () => {
  it('shows Vietnamese to Vietnamese visitors and English to English visitors', () => {
    const text = { en: 'Conical hat', vi: 'Nón lá' };

    expect(pickLocalized(text, Locale.vi)).toBe('Nón lá');
    expect(pickLocalized(text, Locale.en)).toBe('Conical hat');
  });

  it('falls back to English when the Vietnamese text is missing or empty', () => {
    expect(pickLocalized({ en: 'Silk scarf' }, Locale.vi)).toBe('Silk scarf');
    expect(pickLocalized({ en: 'Silk scarf', vi: null }, Locale.vi)).toBe('Silk scarf');
    expect(pickLocalized({ en: 'Silk scarf', vi: '' }, Locale.vi)).toBe('Silk scarf');
  });
});

describe('localizedAlternates', () => {
  it('links the page in every language with English as x-default', () => {
    expect(localizedAlternates(Locale.vi, '/p/non-la')).toEqual({
      canonical: '/vi/p/non-la',
      languages: { en: '/en/p/non-la', vi: '/vi/p/non-la', 'x-default': '/en/p/non-la' },
    });
  });
});
