import { dayPoints, syncGarden, totalPoints } from '../../src/domain/scoring';
import { levelForPoints } from '../../src/domain/garden';
import type { AppData, DayTask } from '../../src/domain/types';

const task = (id: string, points: number, status: DayTask['status']): DayTask => ({
  id, templateId: id, habit: 'walk', title: id, minutes: 5, points, status,
});
const data = (days: AppData['days'], unlockedLevel = 0): AppData => ({
  version: 1,
  profile: null,
  settings: { habits: [], reminderTime: '20:00', notificationsEnabled: false, customTasks: [] },
  days,
  garden: { name: 'v', unlockedLevel, placed: [] },
});

describe('scoring', () => {
  it('counts only done tasks', () => {
    expect(dayPoints([task('a', 3, 'done'), task('b', 5, 'pending'), task('c', 2, 'skipped'), task('d', 4, 'swapped')])).toBe(3);
  });
  it('sums across days and ignores empty/missed days', () => {
    expect(totalPoints({ '2026-10-01': [task('a', 3, 'done')], '2026-10-02': [], '2026-10-03': [task('b', 2, 'pending')] })).toBe(3);
  });
  it('maps points to levels', () => {
    expect(levelForPoints(0)).toBe(0);
    expect(levelForPoints(9)).toBe(0);
    expect(levelForPoints(10)).toBe(1);
    expect(levelForPoints(25)).toBe(2);
    expect(levelForPoints(10000)).toBe(7);
  });
  it('raises unlockedLevel when points grow', () => {
    const next = syncGarden(data({ d: [task('a', 12, 'done')] }));
    expect(next.garden.unlockedLevel).toBe(1);
  });
  it('never lowers unlockedLevel when points drop', () => {
    const next = syncGarden(data({ d: [task('a', 12, 'pending')] }, 3));
    expect(next.garden.unlockedLevel).toBe(3);
  });
});
