import { ErrorCode } from '@/api/gateway.schema';

import en from './messages/en.json';
import vi from './messages/vi.json';

const keysOf = (value: unknown, prefix = ''): string[] =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, child]) =>
        keysOf(child, prefix === '' ? key : `${prefix}.${key}`),
      )
    : [prefix];

describe('messages', () => {
  it('have exactly the same keys in English and Vietnamese', () => {
    expect(keysOf(vi).sort()).toEqual(keysOf(en).sort());
  });

  it('translate every error code the API can return', () => {
    const codes = Object.values(ErrorCode).sort();

    expect(Object.keys(en.errors).sort()).toEqual(codes);
    expect(Object.keys(vi.errors).sort()).toEqual(codes);
  });

  it('have no empty translations', () => {
    const empty = [...keysOf(en), ...keysOf(vi)].filter((key) => key.endsWith('.'));
    const values = [en, vi].flatMap((messages) => JSON.stringify(messages).match(/:""/g) ?? []);

    expect(empty).toEqual([]);
    expect(values).toEqual([]);
  });
});
