import { dayPoints, syncGarden, totalPoints } from '../../src/domain/scoring';
import type { AppData, DayTask } from '../../src/domain/types';

const task = (id: string, points: number, status: DayTask['status']): DayTask => ({
  id, templateId: id, habit: 'walk', title: id, minutes: 5, points, status,
});
const data = (days: AppData['days'], peakPoints = 0): AppData => ({
  version: 2,
  profile: null,
  settings: { habits: [], reminderTime: '20:00', notificationsEnabled: false, customTasks: [], gardenEffects: null },
  days,
  garden: { name: 'v', peakPoints },
});

describe('scoring', () => {
  it('counts only done tasks', () => {
    expect(dayPoints([task('a', 3, 'done'), task('b', 5, 'pending'), task('c', 2, 'skipped'), task('d', 4, 'swapped')])).toBe(3);
  });
  it('sums across days and ignores empty/missed days', () => {
    expect(totalPoints({ '2026-10-01': [task('a', 3, 'done')], '2026-10-02': [], '2026-10-03': [task('b', 2, 'pending')] })).toBe(3);
  });
  it('raises peakPoints to the current total when points grow', () => {
    expect(syncGarden(data({ d: [task('a', 12, 'done')] })).garden.peakPoints).toBe(12);
  });
  // Review Focus 2
  it('never lowers peakPoints when points drop', () => {
    expect(syncGarden(data({ d: [task('a', 12, 'pending')] }, 30)).garden.peakPoints).toBe(30);
  });
  it('returns the same object when nothing changes', () => {
    const d = data({ d: [task('a', 12, 'done')] }, 12);
    expect(syncGarden(d)).toBe(d);
  });
});
