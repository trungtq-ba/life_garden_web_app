import { addDays, weekStart } from './date';
import { ALL_HABITS, type DayTask, type Habit } from './types';

type Days = Record<string, DayTask[]>;
const real = (tasks: DayTask[] = []) => tasks.filter((t) => t.status !== 'swapped');
const doneOf = (tasks: DayTask[] = []) => tasks.filter((t) => t.status === 'done');

export function weeklySummary(days: Days, anyDateInWeek: string) {
  const start = weekStart(anyDateInWeek);
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, done: doneOf(days[date]).length, total: real(days[date]).length };
  });
  const points = perDay.reduce(
    (s, d) => s + doneOf(days[d.date]).reduce((a, t) => a + t.points, 0),
    0,
  );
  return {
    weekStart: start,
    done: perDay.reduce((s, d) => s + d.done, 0),
    total: perDay.reduce((s, d) => s + d.total, 0),
    points,
    perDay,
  };
}

export function habitCounts(days: Days, anyDate: string, weeks = 4) {
  const current = weekStart(anyDate);
  return Array.from({ length: weeks }, (_, w) => {
    const start = addDays(current, -7 * (weeks - 1 - w));
    const counts = Object.fromEntries(ALL_HABITS.map((h) => [h, 0])) as Record<Habit, number>;
    for (let i = 0; i < 7; i++) {
      for (const t of doneOf(days[addDays(start, i)])) counts[t.habit] += 1;
    }
    return { weekStart: start, counts };
  });
}

export function milestones(days: Days) {
  const all = Object.values(days);
  const doneCount = all.reduce((s, d) => s + doneOf(d).length, 0);
  const activeDays = all.filter((d) => doneOf(d).length > 0).length;
  return [
    { id: 'first', label: 'Nhiệm vụ đầu tiên', reached: doneCount >= 1 },
    { id: 'done10', label: '10 nhiệm vụ hoàn thành', reached: doneCount >= 10 },
    { id: 'done50', label: '50 nhiệm vụ hoàn thành', reached: doneCount >= 50 },
    { id: 'done100', label: '100 nhiệm vụ hoàn thành', reached: doneCount >= 100 },
    { id: 'days7', label: '7 ngày có hoạt động', reached: activeDays >= 7 },
    { id: 'days30', label: '30 ngày có hoạt động', reached: activeDays >= 30 },
  ];
}

export function historyDays(days: Days) {
  return Object.keys(days)
    .filter((d) => real(days[d]).length > 0)
    .sort()
    .reverse()
    .map((date) => ({ date, done: doneOf(days[date]).length, total: real(days[date]).length }));
}
