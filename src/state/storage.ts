import { totalPoints } from '../domain/scoring';
import { ALL_HABITS, type AppData } from '../domain/types';

export const STORAGE_KEY = 'life-garden:v1';
export const BACKUP_KEY = 'life-garden:v1:corrupt-backup';
export const LEVEL_THRESHOLDS_V1 = [0, 10, 25, 45, 70, 100, 140, 190];
export type LoadStatus = 'ok' | 'empty' | 'corrupt' | 'unavailable';

export function emptyData(): AppData {
  return {
    version: 2,
    profile: null,
    settings: {
      habits: [...ALL_HABITS], reminderTime: '20:00', notificationsEnabled: false, customTasks: [], gardenEffects: null,
    },
    days: {},
    garden: { name: 'Khu vườn của tôi', peakPoints: 0 },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isHabit = (v: unknown) => (ALL_HABITS as unknown[]).includes(v);
const STATUSES: unknown[] = ['pending', 'done', 'swapped', 'skipped'];

const validTemplate = (t: unknown) =>
  isObj(t) && isStr(t.id) && isStr(t.title) && isHabit(t.habit) && isNum(t.minutes) && isNum(t.points);
const validTask = (t: unknown) =>
  isObj(t) && isStr(t.id) && isStr(t.templateId) && isStr(t.title) && isHabit(t.habit)
  && isNum(t.minutes) && isNum(t.points) && STATUSES.includes(t.status);
const validPlacedV1 = (p: unknown) => isObj(p) && Number.isInteger(p.cell) && isStr(p.itemId);

function checkCommon(raw: Record<string, unknown>) {
  const { profile, settings, days } = raw;
  if (profile !== null && !isObj(profile)) throw new Error('Hồ sơ không hợp lệ');
  if (!isObj(settings) || !Array.isArray(settings.habits) || !Array.isArray(settings.customTasks)
    || typeof settings.reminderTime !== 'string' || typeof settings.notificationsEnabled !== 'boolean'
    || !settings.habits.every(isHabit) || !settings.customTasks.every(validTemplate)) {
    throw new Error('Cài đặt không hợp lệ');
  }
  if (!isObj(days) || !Object.values(days).every((d) => Array.isArray(d) && d.every(validTask))) {
    throw new Error('Lịch sử không hợp lệ');
  }
}

/** Di trú dữ liệu v1 đã qua kiểm tra sang v2. */
export function migrateToV2(raw: Record<string, unknown>): AppData {
  const days = raw.days as AppData['days'];
  const garden = raw.garden as { name: string; unlockedLevel: number };
  const settings = raw.settings as Omit<AppData['settings'], 'gardenEffects'>;
  const level = Number.isFinite(garden.unlockedLevel) ? Math.floor(garden.unlockedLevel) : 0;
  const floor = LEVEL_THRESHOLDS_V1[Math.max(0, Math.min(LEVEL_THRESHOLDS_V1.length - 1, level))];
  return {
    version: 2,
    profile: raw.profile as AppData['profile'],
    settings: { ...settings, gardenEffects: null },
    days,
    garden: { name: garden.name, peakPoints: Math.max(totalPoints(days), floor) },
  };
}

/** Kiểm tra hình dạng dữ liệu (v1 hoặc v2); ném lỗi nếu không hợp lệ. Luôn trả về v2. */
export function parseData(text: string): AppData {
  const raw: unknown = JSON.parse(text);
  if (!isObj(raw) || (raw.version !== 1 && raw.version !== 2)) throw new Error('Phiên bản dữ liệu không hợp lệ');
  checkCommon(raw);
  const { garden, settings } = raw as { garden: unknown; settings: Record<string, unknown> };
  if (raw.version === 1) {
    if (!isObj(garden) || !isStr(garden.name) || typeof garden.unlockedLevel !== 'number'
      || !Array.isArray(garden.placed) || !garden.placed.every(validPlacedV1)) {
      throw new Error('Khu vườn không hợp lệ');
    }
    return migrateToV2(raw);
  }
  if (!isObj(garden) || !isStr(garden.name) || !isNum(garden.peakPoints) || garden.peakPoints < 0) {
    throw new Error('Khu vườn không hợp lệ');
  }
  if (![null, 'full', 'calm'].includes(settings.gardenEffects as string | null)) {
    throw new Error('Cài đặt hiệu ứng không hợp lệ');
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

/** Giữ lại một bản sao dữ liệu không đọc được trước khi người dùng bắt đầu lại. */
export function backupRaw(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    // không sao lưu được thì vẫn cho người dùng tiếp tục
  }
}
