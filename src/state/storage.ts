import { ALL_HABITS, type AppData } from '../domain/types';

export const STORAGE_KEY = 'life-garden:v1';
export type LoadStatus = 'ok' | 'empty' | 'corrupt' | 'unavailable';

export function emptyData(): AppData {
  return {
    version: 1,
    profile: null,
    settings: { habits: [...ALL_HABITS], reminderTime: '20:00', notificationsEnabled: false, customTasks: [] },
    days: {},
    garden: { name: 'Khu vườn của tôi', unlockedLevel: 0, placed: [] },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Kiểm tra hình dạng dữ liệu; ném lỗi nếu không hợp lệ. */
export function parseData(text: string): AppData {
  const raw: unknown = JSON.parse(text);
  if (!isObj(raw) || raw.version !== 1) throw new Error('Phiên bản dữ liệu không hợp lệ');
  const { profile, settings, days, garden } = raw;
  if (profile !== null && !isObj(profile)) throw new Error('Hồ sơ không hợp lệ');
  if (!isObj(settings) || !Array.isArray(settings.habits) || !Array.isArray(settings.customTasks)
    || typeof settings.reminderTime !== 'string' || typeof settings.notificationsEnabled !== 'boolean') {
    throw new Error('Cài đặt không hợp lệ');
  }
  if (!isObj(days) || !Object.values(days).every(Array.isArray)) throw new Error('Lịch sử không hợp lệ');
  if (!isObj(garden) || typeof garden.name !== 'string' || typeof garden.unlockedLevel !== 'number'
    || !Array.isArray(garden.placed)) {
    throw new Error('Khu vườn không hợp lệ');
  }
  return raw as unknown as AppData;
}

export function loadData(): { status: LoadStatus; data: AppData } {
  let text: string | null;
  try {
    text = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'unavailable', data: emptyData() };
  }
  if (text === null) return { status: 'empty', data: emptyData() };
  try {
    return { status: 'ok', data: parseData(text) };
  } catch {
    return { status: 'corrupt', data: emptyData() };
  }
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
