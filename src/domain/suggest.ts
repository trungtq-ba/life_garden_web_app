import { CATALOG, personalize } from './catalog';
import type { Activity, DayTask, Goal, Habit, Profile, Settings, TaskTemplate } from './types';

const RANK: Record<Activity, number> = { low: 0, medium: 1, high: 2 };
const GOAL_HABIT: Partial<Record<Goal, Habit>> = { fitness: 'exercise', weight: 'walk', sleep: 'sleep' };

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SuggestInput {
  profile: Profile | null;
  settings: Settings;
  date: string;
  previous?: DayTask[];
  catalog?: TaskTemplate[];
}

function poolFor(input: Omit<SuggestInput, 'previous'>): TaskTemplate[] {
  const level = RANK[input.profile?.activity ?? 'low'];
  const { habits, customTasks } = input.settings;
  return [...(input.catalog ?? CATALOG), ...customTasks].filter(
    (t) => (habits.length === 0 || habits.includes(t.habit)) && RANK[t.minActivity ?? 'low'] <= level,
  );
}

function toDayTask(t: TaskTemplate, profile: Profile | null, id: string): DayTask {
  return {
    id,
    templateId: t.id,
    habit: t.habit,
    title: personalize(t, profile),
    minutes: t.minutes,
    points: t.points,
    status: 'pending',
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function suggestTasks(input: SuggestInput): DayTask[] {
  const pool = poolFor(input);
  if (pool.length === 0) return [];
  const budget = input.profile?.minutesPerDay ?? 30;
  const rand = rng(hashSeed(input.date));
  const prevIds = new Set((input.previous ?? []).map((t) => t.templateId));

  let habits = shuffle([...new Set(pool.map((t) => t.habit))], rand);
  const goalHabit = input.profile ? GOAL_HABIT[input.profile.goal] : undefined;
  if (goalHabit && habits.includes(goalHabit)) {
    habits = [goalHabit, ...habits.filter((h) => h !== goalHabit)];
  }

  const target = 3 + Math.floor(rand() * 3); // 3..5
  const picks: TaskTemplate[] = [];
  let used = 0;
  for (let round = 0; round < 3 && picks.length < target; round++) {
    for (const h of habits) {
      if (picks.length >= target) break;
      const options = pool.filter((t) => t.habit === h && !picks.includes(t));
      if (options.length === 0) continue;
      const fresh = options.filter((t) => !prevIds.has(t.id));
      const list = fresh.length > 0 ? fresh : options;
      const t = list[Math.floor(rand() * list.length)];
      if (used + t.minutes <= budget) {
        picks.push(t);
        used += t.minutes;
      }
    }
  }
  if (picks.length === 0) {
    picks.push([...pool].sort((a, b) => a.minutes - b.minutes)[0]);
  }
  return picks.map((t, i) => toDayTask(t, input.profile, `${input.date}-${i}`));
}

export function swapTask(
  tasks: DayTask[],
  taskId: string,
  input: Omit<SuggestInput, 'previous'>,
): DayTask[] {
  const old = tasks.find((t) => t.id === taskId);
  if (!old || old.status !== 'pending') return tasks;
  const used = new Set(tasks.filter((t) => t.status !== 'swapped').map((t) => t.templateId));
  const options = poolFor(input).filter((t) => t.habit === old.habit && !used.has(t.id));
  if (options.length === 0) return tasks;
  const rand = rng(hashSeed(`${input.date}:${taskId}:${tasks.length}`));
  const t = options[Math.floor(rand() * options.length)];
  const next = toDayTask(t, input.profile, `${input.date}-${tasks.length}`);
  return tasks.flatMap((x) => (x.id === taskId ? [{ ...x, status: 'swapped' as const }, next] : [x]));
}
