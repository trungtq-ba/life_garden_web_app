import { isReminderDue, msUntil, parseTime, startReminders } from '../../src/notifications/reminders';
import type { DayTask } from '../../src/domain/types';

const pending: DayTask = { id: 'a', templateId: 'a', habit: 'walk', title: 'a', minutes: 1, points: 1, status: 'pending' };
const done: DayTask = { ...pending, status: 'done' };

describe('parseTime', () => {
  it('parses valid and rejects invalid times', () => {
    expect(parseTime('07:05')).toEqual({ h: 7, m: 5 });
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('7pm')).toBeNull();
    expect(parseTime('')).toBeNull();
  });
});

describe('msUntil', () => {
  it('returns time until later today', () => {
    expect(msUntil('20:00', new Date(2026, 9, 9, 19, 0, 0))).toBe(3600_000);
  });
  it('rolls over to tomorrow when the time has passed or is now', () => {
    expect(msUntil('08:00', new Date(2026, 9, 9, 20, 0, 0))).toBe(12 * 3600_000);
    expect(msUntil('20:00', new Date(2026, 9, 9, 20, 0, 0))).toBe(24 * 3600_000);
  });
  it('falls back to 20:00 for an invalid time', () => {
    expect(msUntil('xx', new Date(2026, 9, 9, 19, 0, 0))).toBe(3600_000);
  });
});

describe('isReminderDue', () => {
  const at = (h: number) => new Date(2026, 9, 9, h, 0, 0);
  it('is due after the reminder time while tasks are pending', () => {
    expect(isReminderDue(at(21), '20:00', [pending], true)).toBe(true);
  });
  it('is not due before the time, when disabled, or when nothing is pending', () => {
    expect(isReminderDue(at(19), '20:00', [pending], true)).toBe(false);
    expect(isReminderDue(at(21), '20:00', [pending], false)).toBe(false);
    expect(isReminderDue(at(21), '20:00', [done], true)).toBe(false);
    expect(isReminderDue(at(21), '20:00', undefined, true)).toBe(false);
  });
});

describe('startReminders', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires at the reminder time when tasks are pending and re-arms for the next day', () => {
    vi.setSystemTime(new Date(2026, 9, 9, 19, 0, 0));
    const show = vi.fn();
    const r = startReminders(() => ({ enabled: true, time: '20:00', pendingCount: 2 }), show);
    r.rearm();
    vi.advanceTimersByTime(3600_000);
    expect(show).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(24 * 3600_000);
    expect(show).toHaveBeenCalledTimes(2);
    r.stop();
  });
  it('stays silent when disabled or nothing is pending', () => {
    vi.setSystemTime(new Date(2026, 9, 9, 19, 0, 0));
    const show = vi.fn();
    let state = { enabled: false, time: '20:00', pendingCount: 2 };
    const r = startReminders(() => state, show);
    r.rearm();
    vi.advanceTimersByTime(3600_000);
    expect(show).not.toHaveBeenCalled();
    state = { enabled: true, time: '20:00', pendingCount: 0 };
    r.rearm();
    vi.advanceTimersByTime(24 * 3600_000);
    expect(show).not.toHaveBeenCalled();
    r.stop();
  });
});
