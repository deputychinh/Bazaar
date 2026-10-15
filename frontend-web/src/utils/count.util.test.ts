import { formatCompactCount } from './count.util';

describe('formatCompactCount', () => {
  it('keeps small counts as they are', () => {
    expect(formatCompactCount(0, 'en')).toBe('0');
    expect(formatCompactCount(950, 'en')).toBe('950');
  });

  it('shortens thousands with the locale decimal separator', () => {
    expect(formatCompactCount(1250, 'en')).toBe('1.3k');
    expect(formatCompactCount(1250, 'vi')).toBe('1,3k');
    expect(formatCompactCount(12_400, 'en')).toBe('12k');
  });
});
