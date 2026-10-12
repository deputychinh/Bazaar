import en from './messages/en.json';
import vi from './messages/vi.json';

const keys = (value: unknown, prefix = ''): string[] =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, child]) => keys(child, `${prefix}${key}.`))
    : [prefix.slice(0, -1)];

describe('messages', () => {
  it('has the same keys in English and Vietnamese', () => {
    expect(keys(vi).sort()).toEqual(keys(en).sort());
  });
});
