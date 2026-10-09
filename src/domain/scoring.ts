import type { AppData, DayTask } from './types';

export const dayPoints = (tasks: DayTask[]): number =>
  tasks.filter((t) => t.status === 'done').reduce((s, t) => s + t.points, 0);

export const totalPoints = (days: Record<string, DayTask[]>): number =>
  Object.values(days).reduce((s, tasks) => s + dayPoints(tasks), 0);

/** Nâng peakPoints lên điểm hiện có nếu cao hơn; không bao giờ hạ. */
export function syncGarden(data: AppData): AppData {
  const total = totalPoints(data.days);
  return total > data.garden.peakPoints
    ? { ...data, garden: { ...data.garden, peakPoints: total } }
    : data;
}
