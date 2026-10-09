import { addDays, dateKey, parseKey, weekStart } from '../../src/domain/date';

describe('date utils', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 9, 9))).toBe('2026-10-09');
  });
  it('parses a key back to a local date', () => {
    const d = parseKey('2026-01-05');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 0, 5]);
  });
  it('adds days across month boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('returns Monday as week start', () => {
    expect(weekStart('2026-10-09')).toBe('2026-10-05'); // Friday
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // Sunday
    expect(weekStart('2026-10-05')).toBe('2026-10-05'); // Monday
  });
});
