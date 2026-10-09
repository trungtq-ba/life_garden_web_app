import { BACKUP_KEY, backupRaw, emptyData, loadData, parseData, saveData, STORAGE_KEY } from '../../src/state/storage';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('parseData', () => {
  it('round-trips valid data', () => {
    const d = emptyData();
    expect(parseData(JSON.stringify(d))).toEqual(d);
  });
  it.each([
    ['not json', '{oops'],
    ['array', '[]'],
    ['wrong version', JSON.stringify({ ...emptyData(), version: 2 })],
    ['missing days', JSON.stringify({ ...emptyData(), days: undefined })],
    ['bad garden', JSON.stringify({ ...emptyData(), garden: { name: 'x' } })],
  ])('rejects %s', (_n, text) => {
    expect(() => parseData(text)).toThrow();
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
  // Review Focus 4
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

describe('parseData element validation', () => {
  const task = { id: 'a', templateId: 'w', habit: 'water', title: 't', minutes: 2, points: 2, status: 'done' };
  const withDay = (t: unknown) => JSON.stringify({ ...emptyData(), days: { '2026-10-09': [t] } });

  it('accepts well-formed days, placed items and custom tasks', () => {
    const d = {
      ...emptyData(),
      days: { '2026-10-09': [task] },
      garden: { name: 'v', unlockedLevel: 1, placed: [{ cell: 0, itemId: 'daisy' }] },
      settings: { ...emptyData().settings, customTasks: [{ id: 'c', habit: 'walk', title: 'x', minutes: 5, points: 1 }] },
    };
    expect(() => parseData(JSON.stringify(d))).not.toThrow();
  });
  it.each([
    ['null placed entry', JSON.stringify({ ...emptyData(), garden: { name: 'v', unlockedLevel: 0, placed: [null] } })],
    ['non-integer cell', JSON.stringify({ ...emptyData(), garden: { name: 'v', unlockedLevel: 0, placed: [{ cell: 'a', itemId: 'x' }] } })],
    ['task without points', withDay({ ...task, points: undefined })],
    ['task with unknown status', withDay({ ...task, status: 'weird' })],
    ['task that is not an object', withDay(5)],
    ['unknown habit in settings', JSON.stringify({ ...emptyData(), settings: { ...emptyData().settings, habits: ['x'] } })],
    ['bad custom task', JSON.stringify({ ...emptyData(), settings: { ...emptyData().settings, customTasks: [1] } })],
  ])('rejects %s', (_n, text) => {
    expect(() => parseData(text)).toThrow();
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
