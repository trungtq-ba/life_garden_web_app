import type { Activity, Profile, TaskTemplate } from './types';

export const CATALOG: TaskTemplate[] = [
  { id: 'water-1', habit: 'water', title: 'Uống {ml} ml nước trong ngày', minutes: 2, points: 2 },
  { id: 'water-2', habit: 'water', title: 'Uống một cốc nước ngay khi thức dậy', minutes: 1, points: 1 },
  { id: 'water-3', habit: 'water', title: 'Mang theo chai nước và uống đều trong ngày', minutes: 2, points: 2 },
  { id: 'walk-1', habit: 'walk', title: 'Đi bộ 10 phút', minutes: 10, points: 3 },
  { id: 'walk-2', habit: 'walk', title: 'Đi bộ nhẹ nhàng đạt {steps} bước', minutes: 20, points: 4 },
  { id: 'walk-3', habit: 'walk', title: 'Đi cầu thang thay vì thang máy', minutes: 3, points: 2 },
  { id: 'ex-1', habit: 'exercise', title: 'Giãn cơ 5 phút', minutes: 5, points: 2 },
  { id: 'ex-2', habit: 'exercise', title: 'Hít thở sâu và vươn vai 3 phút', minutes: 3, points: 1 },
  { id: 'ex-3', habit: 'exercise', title: 'Tập thể dục nhẹ 15 phút', minutes: 15, points: 4, minActivity: 'medium' },
  { id: 'ex-4', habit: 'exercise', title: 'Chạy bộ hoặc đạp xe 20 phút', minutes: 20, points: 5, minActivity: 'high' },
  { id: 'sleep-1', habit: 'sleep', title: 'Tắt màn hình trước giờ ngủ 30 phút', minutes: 5, points: 3 },
  { id: 'sleep-2', habit: 'sleep', title: 'Chuẩn bị đi ngủ đúng giờ', minutes: 5, points: 3 },
  { id: 'sleep-3', habit: 'sleep', title: 'Đọc vài trang sách trước khi ngủ', minutes: 10, points: 2 },
];

const STEPS: Record<Activity, number> = { low: 3000, medium: 5000, high: 7000 };

export function personalize(t: TaskTemplate, p: Profile | null): string {
  let ml = 2000;
  if (p?.weightKg && p.weightKg > 0) {
    ml = Math.min(3000, Math.max(1500, Math.round((p.weightKg * 30) / 100) * 100));
  }
  const steps = STEPS[p?.activity ?? 'low'];
  return t.title.replace('{ml}', String(ml)).replace('{steps}', String(steps));
}
