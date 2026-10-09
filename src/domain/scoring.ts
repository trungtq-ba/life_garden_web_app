import { levelForPoints } from './garden';
import type { AppData, DayTask } from './types';

export const dayPoints = (tasks: DayTask[]): number =>
  tasks.filter((t) => t.status === 'done').reduce((s, t) => s + t.points, 0);

export const totalPoints = (days: Record<string, DayTask[]>): number =>
  Object.values(days).reduce((s, tasks) => s + dayPoints(tasks), 0);

/** Nâng unlockedLevel nếu điểm đạt ngưỡng mới; không bao giờ hạ. */
export function syncGarden(data: AppData): AppData {
  const level = levelForPoints(totalPoints(data.days));
  return level > data.garden.unlockedLevel
    ? { ...data, garden: { ...data.garden, unlockedLevel: level } }
    : data;
}
