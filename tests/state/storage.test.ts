import { ALL_HABITS } from '../../src/domain/types';
import {
  BACKUP_KEY, backupRaw, emptyData, loadData, parseData, saveData, STORAGE_KEY,
} from '../../src/state/storage';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

const task = { id: 'a', templateId: 'w', habit: 'water', title: 't', minutes: 2, points: 2, status: 'done' };
const v1 = (over: Record<string, unknown> = {}) => ({
  version: 1,
  profile: null,
  settings: { habits: [...ALL_HABITS], reminderTime: '20:00', notificationsEnabled: false, customTasks: [] },
  days: {},
  garden: { name: 'Vườn cũ', unlockedLevel: 0, placed: [] },
  ...over,
});
const withDay = (t: unknown) => JSON.stringify({ ...emptyData(), days: { '2026-10-09': [t] } });

describe('profile fullName', () => {
  const base = { goal: 'general', activity: 'low', minutesPerDay: 30 };
  const withProfile = (profile: unknown) => JSON.stringify({ ...emptyData(), profile });
  it('accepts a string name and old profiles without one', () => {
    expect(parseData(withProfile({ ...base, fullName: 'Lan' })).profile?.fullName).toBe('Lan');
    expect(parseData(withProfile(base)).profile?.fullName).toBeUndefined();
  });
  it('rejects a non-string name', () => {
    expect(() => parseData(withProfile({ ...base, fullName: 42 }))).toThrow();
  });
});

describe('parseData v2', () => {
  it('round-trips valid data', () => {
    const d = emptyData();
    expect(d.version).toBe(2);
    expect(parseData(JSON.stringify(d))).toEqual(d);
  });
  it.each([
    ['not json', '{oops'],
    ['array', '[]'],
    ['unknown version', JSON.stringify({ ...emptyData(), version: 3 })],
    ['missing days', JSON.stringify({ ...emptyData(), days: undefined })],
    ['garden without peakPoints', JSON.stringify({ ...emptyData(), garden: { name: 'x' } })],
    ['negative peakPoints', JSON.stringify({ ...emptyData(), garden: { name: 'x', peakPoints: -1 } })],
    ['non-finite peakPoints', JSON.stringify({ ...emptyData(), garden: { name: 'x', peakPoints: 'a' } })],
    ['bad gardenEffects', JSON.stringify({ ...emptyData(), settings: { ...emptyData().settings, gardenEffects: 'wild' } })],
    ['task without points', withDay({ ...task, points: undefined })],
    ['task with unknown status', withDay({ ...task, status: 'weird' })],
    ['task that is not an object', withDay(5)],
    ['unknown habit in settings', JSON.stringify({ ...emptyData(), settings: { ...emptyData().settings, habits: ['x'] } })],
    ['bad custom task', JSON.stringify({ ...emptyData(), settings: { ...emptyData().settings, customTasks: [1] } })],
  ])('rejects %s', (_n, text) => {
    expect(() => parseData(text)).toThrow();
  });
  it('accepts well-formed days and custom tasks', () => {
    const d = {
      ...emptyData(),
      days: { '2026-10-09': [task] },
      settings: { ...emptyData().settings, gardenEffects: 'calm', customTasks: [{ id: 'c', habit: 'walk', title: 'x', minutes: 5, points: 1 }] },
    };
    expect(() => parseData(JSON.stringify(d))).not.toThrow();
  });
});

describe('migration from v1', () => {
  // Review Focus 1
  it('keeps the old unlock level as a floor and drops placed items', () => {
    const d = parseData(JSON.stringify(v1({ garden: { name: 'Vườn cũ', unlockedLevel: 3, placed: [{ cell: 0, itemId: 'daisy' }] } })));
    expect(d.version).toBe(2);
    expect(d.garden).toEqual({ name: 'Vườn cũ', peakPoints: 45 });
    expect(d.settings.gardenEffects).toBeNull();
    expect('placed' in d.garden).toBe(false);
  });
  it('uses real points when they exceed the old level floor', () => {
    const d = parseData(JSON.stringify(v1({ days: { '2026-10-09': [{ ...task, points: 60 }] }, garden: { name: 'v', unlockedLevel: 1, placed: [] } })));
    expect(d.garden.peakPoints).toBe(60);
  });
  it('clamps absurd old levels', () => {
    expect(parseData(JSON.stringify(v1({ garden: { name: 'v', unlockedLevel: 99, placed: [] } }))).garden.peakPoints).toBe(190);
    expect(parseData(JSON.stringify(v1({ garden: { name: 'v', unlockedLevel: -4, placed: [] } }))).garden.peakPoints).toBe(0);
  });
  it('still rejects malformed v1 data', () => {
    expect(() => parseData(JSON.stringify(v1({ garden: { name: 'v', unlockedLevel: 0, placed: [null] } })))).toThrow();
    expect(() => parseData(JSON.stringify(v1({ garden: { name: 'v' } })))).toThrow();
  });
});

describe('loadData / saveData', () => {
  it('reports empty when nothing is stored', () => {
    expect(loadData().status).toBe('empty');
  });
  it('saves and reloads', () => {
    const d = { ...emptyData(), garden: { ...emptyData().garden, name: 'Vườn mới' } };
    expect(saveData(d)).toBe(true);
    const r = loadData();
    expect(r.status).toBe('ok');
    expect(r.data.garden.name).toBe('Vườn mới');
  });
  it('upgrades a stored v1 save when loading', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1({ garden: { name: 'Cũ', unlockedLevel: 2, placed: [] } })));
    const r = loadData();
    expect(r.status).toBe('ok');
    expect(r.data.version).toBe(2);
    expect(r.data.garden.peakPoints).toBe(25);
  });
  // Review Focus 4 (spec gốc)
  it('reports corrupt data without touching it', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    expect(loadData().status).toBe('corrupt');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad');
  });
  it('reports unavailable when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(loadData().status).toBe('unavailable');
  });
  it('returns false when saving fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(saveData(emptyData())).toBe(false);
  });
});

describe('backupRaw', () => {
  it('copies the stored text to the backup key', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    backupRaw();
    expect(localStorage.getItem(BACKUP_KEY)).toBe('{bad');
  });
  it('does nothing when nothing is stored', () => {
    backupRaw();
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
  });
});
