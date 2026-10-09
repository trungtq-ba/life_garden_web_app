import { dateKey } from '../../src/domain/date';
import { DEFAULT_PROFILE } from '../../src/domain/types';
import { totalPoints } from '../../src/domain/scoring';
import { emptyData, STORAGE_KEY } from '../../src/state/storage';
import { startPersistence, useStore } from '../../src/state/store';

const D = '2026-10-09';
const s = () => useStore.getState();
const bigTask = (status: 'pending' | 'done' = 'pending') => ({
  id: 'big', templateId: 'big', habit: 'walk' as const, title: 'big', minutes: 1, points: 10, status,
});

beforeEach(() => {
  localStorage.clear();
  useStore.setState({ data: { ...emptyData(), profile: DEFAULT_PROFILE }, storageStatus: 'ok' });
  s().ensureDay(D);
});

describe('days', () => {
  it('generates the day once and keeps it stable', () => {
    const first = s().data.days[D];
    expect(first.length).toBeGreaterThanOrEqual(1);
    s().ensureDay(D);
    expect(s().data.days[D]).toBe(first);
  });
  it('does nothing before the profile exists', () => {
    useStore.setState({ data: emptyData() });
    s().ensureDay(D);
    expect(s().data.days[D]).toBeUndefined();
  });
  it('generates a new day without touching earlier days', () => {
    const before = s().data.days[D];
    s().ensureDay('2026-10-10');
    expect(s().data.days[D]).toBe(before);
    expect(s().data.days['2026-10-10']).toBeDefined();
  });
});

describe('tasks and points', () => {
  it('toggles done and revokes points when unticked', () => {
    const id = s().data.days[D][0].id;
    s().toggleDone(D, id);
    expect(totalPoints(s().data.days)).toBeGreaterThan(0);
    s().toggleDone(D, id);
    expect(totalPoints(s().data.days)).toBe(0);
  });
  it('keeps unlockedLevel after points are revoked', () => {
    useStore.setState((st) => ({ data: { ...st.data, days: { ...st.data.days, '2026-10-01': [bigTask()] } } }));
    s().toggleDone('2026-10-01', 'big');
    expect(s().data.garden.unlockedLevel).toBe(1);
    s().toggleDone('2026-10-01', 'big');
    expect(totalPoints(s().data.days)).toBe(0);
    expect(s().data.garden.unlockedLevel).toBe(1);
  });
  it('survives rapid ticking without drift', () => {
    const id = s().data.days[D][0].id;
    for (let i = 0; i < 7; i++) s().toggleDone(D, id);
    expect(s().data.days[D][0].status).toBe('done');
  });
  it('skips and un-skips without scoring', () => {
    const id = s().data.days[D][0].id;
    s().skipTask(D, id);
    expect(s().data.days[D][0].status).toBe('skipped');
    expect(totalPoints(s().data.days)).toBe(0);
    s().skipTask(D, id);
    expect(s().data.days[D][0].status).toBe('pending');
  });
  it('swaps a pending task', () => {
    useStore.setState((st) => ({ data: { ...st.data, profile: { ...DEFAULT_PROFILE, activity: 'high', minutesPerDay: 60 } } }));
    useStore.setState((st) => ({ data: { ...st.data, days: {} } }));
    s().ensureDay(D);
    const before = s().data.days[D];
    s().swap(D, before[0].id);
    expect(s().data.days[D][0].status).toBe('swapped');
    expect(s().data.days[D].length).toBe(before.length + 1);
  });
  it('adds a valid custom task to today and the pool, and rejects invalid input', () => {
    expect(s().addCustomTask(D, { title: '  ', minutes: 5, habit: 'walk' })).toBe(false);
    expect(s().addCustomTask(D, { title: 'Dắt chó đi dạo', minutes: 0, habit: 'walk' })).toBe(false);
    expect(s().addCustomTask(D, { title: 'Dắt chó đi dạo', minutes: 15, habit: 'walk' })).toBe(true);
    expect(s().data.settings.customTasks).toHaveLength(1);
    expect(s().data.days[D].some((t) => t.title === 'Dắt chó đi dạo')).toBe(true);
  });
});

describe('garden actions', () => {
  it('places an unlocked item and rejects a locked one with a reason', () => {
    expect(s().placeItem('daisy', 0)).toEqual(expect.any(String));
    useStore.setState((st) => ({ data: { ...st.data, garden: { ...st.data.garden, unlockedLevel: 1 } } }));
    expect(s().placeItem('daisy', 0)).toBeNull();
    expect(s().data.garden.placed).toEqual([{ cell: 0, itemId: 'daisy' }]);
    s().moveItem(0, 4);
    expect(s().data.garden.placed[0].cell).toBe(4);
    s().removeItem(4);
    expect(s().data.garden.placed).toHaveLength(0);
  });
  it('renames the garden, trimming and rejecting empty names', () => {
    s().renameGarden('  Vườn Mai  ');
    expect(s().data.garden.name).toBe('Vườn Mai');
    s().renameGarden('   ');
    expect(s().data.garden.name).toBe('Vườn Mai');
  });
});

describe('import / export / reset', () => {
  it('round-trips through export and import', () => {
    s().updateSettings({ reminderTime: '07:30' });
    const text = s().exportText();
    s().resetAll();
    expect(s().data.settings.reminderTime).not.toBe('07:30');
    expect(s().importText(text)).toEqual({ ok: true });
    expect(s().data.settings.reminderTime).toBe('07:30');
  });
  it('generates today after importing a backup made on an earlier day', () => {
    const backup = JSON.stringify({ ...emptyData(), profile: DEFAULT_PROFILE, days: {} });
    s().resetAll();
    expect(s().importText(backup)).toEqual({ ok: true });
    expect(s().data.days[dateKey(new Date())]).toBeDefined();
  });
  it('reports whether a swap happened', () => {
    const water = ['water-1', 'water-2', 'water-3'].map((id, i) => ({
      id: `${D}-${i}`, templateId: id, habit: 'water' as const, title: id, minutes: 1, points: 1, status: 'pending' as const,
    }));
    useStore.setState((st) => ({ data: { ...st.data, days: { ...st.data.days, [D]: water } } }));
    expect(s().swap(D, water[0].id)).toBe(false);
    expect(s().data.days[D]).toBe(useStore.getState().data.days[D]);
    expect(s().data.days[D].every((t) => t.status === 'pending')).toBe(true);
  });
  // Review Focus 4
  it('rejects a bad file without overwriting current data', () => {
    s().updateSettings({ reminderTime: '07:30' });
    const before = s().data;
    const r = s().importText('{"nonsense":true}');
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
    expect(s().data).toBe(before);
  });
});

describe('persistence', () => {
  it('saves changes to localStorage', () => {
    const stop = startPersistence();
    s().renameGarden('Đã lưu');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).garden.name).toBe('Đã lưu');
    stop();
  });
  it('does not overwrite corrupt stored data until the user resolves it', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    useStore.setState({ storageStatus: 'corrupt' });
    const stop = startPersistence();
    s().renameGarden('Không được ghi');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad');
    stop();
  });
  it('marks storage unavailable when saving fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const stop = startPersistence();
    s().renameGarden('x');
    expect(s().storageStatus).toBe('unavailable');
    stop();
    vi.restoreAllMocks();
  });
});
