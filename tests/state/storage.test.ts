import { emptyData, loadData, parseData, saveData, STORAGE_KEY } from '../../src/state/storage';

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
