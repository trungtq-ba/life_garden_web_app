import { CATALOG, personalize } from '../../src/domain/catalog';
import { suggestTasks, swapTask } from '../../src/domain/suggest';
import { ALL_HABITS, DEFAULT_PROFILE, type Profile, type Settings } from '../../src/domain/types';

const settings = (over: Partial<Settings> = {}): Settings => ({
  habits: ALL_HABITS,
  reminderTime: '20:00',
  notificationsEnabled: false,
  customTasks: [],
  gardenEffects: null,
  ...over,
});
const busy: Profile = { ...DEFAULT_PROFILE, activity: 'high', minutesPerDay: 60 };
const D = '2026-10-09';

describe('personalize', () => {
  it('scales water with weight and falls back without it', () => {
    const water = CATALOG.find((t) => t.id === 'water-1')!;
    expect(personalize(water, { ...DEFAULT_PROFILE, weightKg: 70 })).toContain('2100');
    expect(personalize(water, DEFAULT_PROFILE)).toContain('2000');
    expect(personalize(water, null)).toContain('2000');
  });
});

describe('suggestTasks', () => {
  it('is deterministic for the same date and input', () => {
    const a = suggestTasks({ profile: busy, settings: settings(), date: D });
    const b = suggestTasks({ profile: busy, settings: settings(), date: D });
    expect(a).toEqual(b);
  });

  it('returns 3 to 5 pending tasks within the time budget', () => {
    for (let i = 1; i <= 20; i++) {
      const date = `2026-10-${String(i).padStart(2, '0')}`;
      const tasks = suggestTasks({ profile: busy, settings: settings(), date });
      expect(tasks.length).toBeGreaterThanOrEqual(3);
      expect(tasks.length).toBeLessThanOrEqual(5);
      expect(tasks.reduce((s, t) => s + t.minutes, 0)).toBeLessThanOrEqual(60);
      expect(tasks.every((t) => t.status === 'pending')).toBe(true);
    }
  });

  it('uses unique task ids within a day', () => {
    const tasks = suggestTasks({ profile: busy, settings: settings(), date: D });
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
  });

  it('only picks selected habits', () => {
    const tasks = suggestTasks({ profile: busy, settings: settings({ habits: ['water', 'sleep'] }), date: D });
    expect(tasks.every((t) => t.habit === 'water' || t.habit === 'sleep')).toBe(true);
  });

  it('respects activity level (no high-intensity task for low activity)', () => {
    const low: Profile = { ...DEFAULT_PROFILE, activity: 'low', minutesPerDay: 120 };
    for (let i = 1; i <= 15; i++) {
      const tasks = suggestTasks({ profile: low, settings: settings(), date: `2026-10-${String(i).padStart(2, '0')}` });
      expect(tasks.some((t) => t.templateId === 'ex-3' || t.templateId === 'ex-4')).toBe(false);
    }
  });

  it('puts the goal habit first when it fits the budget', () => {
    const p: Profile = { ...busy, goal: 'sleep' };
    const withSleep = Array.from({ length: 10 }, (_, i) =>
      suggestTasks({ profile: p, settings: settings(), date: `2026-10-${String(i + 1).padStart(2, '0')}` }),
    ).filter((tasks) => tasks.some((t) => t.habit === 'sleep'));
    expect(withSleep.length).toBe(10);
  });

  it('avoids yesterday templates when an alternative exists', () => {
    const yesterday = suggestTasks({ profile: busy, settings: settings(), date: '2026-10-08' });
    const today = suggestTasks({ profile: busy, settings: settings(), date: D, previous: yesterday });
    for (const h of ALL_HABITS) {
      const y = yesterday.filter((t) => t.habit === h);
      if (y.length === 1) {
        expect(today.some((t) => t.templateId === y[0].templateId)).toBe(false);
      }
    }
  });

  // Review Focus 1
  it('never leaks placeholders or NaN with an empty profile', () => {
    for (const profile of [null, DEFAULT_PROFILE, { ...DEFAULT_PROFILE, weightKg: Number.NaN }]) {
      const tasks = suggestTasks({ profile, settings: settings(), date: D });
      for (const t of tasks) {
        expect(t.title).not.toMatch(/NaN|\{|\}/);
      }
    }
  });

  // Review Focus 2
  it('still returns at least one task for a tiny budget or empty habit list', () => {
    const tiny: Profile = { ...DEFAULT_PROFILE, minutesPerDay: 1 };
    expect(suggestTasks({ profile: tiny, settings: settings(), date: D }).length).toBeGreaterThanOrEqual(1);
    const none = suggestTasks({ profile: busy, settings: settings({ habits: [] }), date: D });
    expect(none.length).toBeGreaterThanOrEqual(3);
  });

  it('includes user custom tasks in the pool', () => {
    const custom = { id: 'custom-1', habit: 'walk' as const, title: 'Dắt chó đi dạo', minutes: 10, points: 2 };
    const seen = new Set<string>();
    for (let i = 1; i <= 28; i++) {
      const tasks = suggestTasks({
        profile: busy,
        settings: settings({ habits: ['walk'], customTasks: [custom] }),
        date: `2026-10-${String(i).padStart(2, '0')}`,
      });
      tasks.forEach((t) => seen.add(t.templateId));
    }
    expect(seen.has('custom-1')).toBe(true);
  });
});

describe('swapTask', () => {
  const base = () => suggestTasks({ profile: busy, settings: settings(), date: D });

  it('marks the old task swapped and adds a different task of the same habit', () => {
    const tasks = base();
    const target = tasks[0];
    const next = swapTask(tasks, target.id, { profile: busy, settings: settings(), date: D });
    expect(next.find((t) => t.id === target.id)!.status).toBe('swapped');
    const added = next.filter((t) => !tasks.some((o) => o.id === t.id));
    expect(added).toHaveLength(1);
    expect(added[0].habit).toBe(target.habit);
    expect(added[0].templateId).not.toBe(target.templateId);
    expect(added[0].status).toBe('pending');
  });

  it('does not swap tasks that are not pending', () => {
    const tasks = base().map((t, i) => (i === 0 ? { ...t, status: 'done' as const } : t));
    expect(swapTask(tasks, tasks[0].id, { profile: busy, settings: settings(), date: D })).toBe(tasks);
  });

  // Review Focus 3
  it('keeps the list unchanged when no alternative template exists', () => {
    const only = [{ id: 'only', habit: 'water' as const, title: 'x', minutes: 1, points: 1 }];
    const tasks = suggestTasks({ profile: busy, settings: settings({ habits: ['water'] }), date: D, catalog: only });
    const next = swapTask(tasks, tasks[0].id, { profile: busy, settings: settings({ habits: ['water'] }), date: D, catalog: only });
    expect(next).toBe(tasks);
  });
});
