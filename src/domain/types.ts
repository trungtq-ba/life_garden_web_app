export type Habit = 'water' | 'walk' | 'exercise' | 'sleep';
export const ALL_HABITS: Habit[] = ['water', 'walk', 'exercise', 'sleep'];
export const HABIT_LABEL: Record<Habit, string> = {
  water: 'Uống nước',
  walk: 'Đi bộ',
  exercise: 'Vận động',
  sleep: 'Ngủ đúng giờ',
};

export type Goal = 'general' | 'fitness' | 'weight' | 'sleep';
export type Activity = 'low' | 'medium' | 'high';
export type Gender = 'female' | 'male' | 'other';
export type TaskStatus = 'pending' | 'done' | 'swapped' | 'skipped';

export interface Profile {
  weightKg?: number;
  heightCm?: number;
  age?: number;
  gender?: Gender;
  goal: Goal;
  activity: Activity;
  minutesPerDay: number;
}
export const DEFAULT_PROFILE: Profile = { goal: 'general', activity: 'low', minutesPerDay: 30 };

export interface TaskTemplate {
  id: string;
  habit: Habit;
  title: string; // có thể chứa {ml} hoặc {steps}
  minutes: number;
  points: number;
  minActivity?: Activity;
}

export interface DayTask {
  id: string;
  templateId: string;
  habit: Habit;
  title: string;
  minutes: number;
  points: number;
  status: TaskStatus;
}

export interface Settings {
  habits: Habit[]; // rỗng = tất cả
  reminderTime: string; // 'HH:MM'
  notificationsEnabled: boolean;
  customTasks: TaskTemplate[];
}

export interface PlacedItem {
  cell: number;
  itemId: string;
}
export interface Garden {
  name: string;
  unlockedLevel: number;
  placed: PlacedItem[];
}

export interface AppData {
  version: 1;
  profile: Profile | null; // null = chưa thiết lập → hiện màn chào mừng
  settings: Settings;
  days: Record<string, DayTask[]>;
  garden: Garden;
}
