import { habitCounts, historyDays, milestones, weeklySummary } from '../../src/domain/progress';
import type { DayTask, Habit } from '../../src/domain/types';

const t = (id: string, habit: Habit, status: DayTask['status'], points = 2): DayTask => ({
  id, templateId: id, habit, title: id, minutes: 5, points, status,
});

const days = {
  '2026-10-05': [t('a', 'walk', 'done', 3), t('b', 'water', 'pending'), t('c', 'sleep', 'swapped')],
  '2026-10-07': [t('d', 'walk', 'done', 3), t('e', 'exercise', 'done', 4)],
  '2026-09-29': [t('f', 'walk', 'done', 3)],
};

describe('weeklySummary', () => {
  it('summarises the Monday-based week, excluding swapped tasks from total', () => {
    const w = weeklySummary(days, '2026-10-09');
    expect(w.weekStart).toBe('2026-10-05');
    expect(w.done).toBe(3);
    expect(w.total).toBe(4);
    expect(w.points).toBe(10);
    expect(w.perDay).toHaveLength(7);
    expect(w.perDay[0]).toEqual({ date: '2026-10-05', done: 1, total: 2 });
    expect(w.perDay[1]).toEqual({ date: '2026-10-06', done: 0, total: 0 });
  });
});

describe('habitCounts', () => {
  it('counts done tasks per habit per week, oldest first', () => {
    const rows = habitCounts(days, '2026-10-09', 2);
    expect(rows.map((r) => r.weekStart)).toEqual(['2026-09-28', '2026-10-05']);
    expect(rows[0].counts.walk).toBe(1);
    expect(rows[1].counts.walk).toBe(2);
    expect(rows[1].counts.exercise).toBe(1);
    expect(rows[1].counts.sleep).toBe(0);
  });
});

describe('milestones', () => {
  it('marks reached milestones from totals only', () => {
    const m = milestones(days);
    expect(m.find((x) => x.id === 'first')!.reached).toBe(true);
    expect(m.find((x) => x.id === 'done10')!.reached).toBe(false);
  });
  it('is not reached for an empty history', () => {
    expect(milestones({}).every((x) => !x.reached)).toBe(true);
  });
});

describe('historyDays', () => {
  it('lists days with tasks, newest first', () => {
    const h = historyDays({ ...days, '2026-10-06': [] });
    expect(h.map((x) => x.date)).toEqual(['2026-10-07', '2026-10-05', '2026-09-29']);
  });
});
