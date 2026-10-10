import { greetingText, normalizeName } from '../../src/domain/greeting';
import { DEFAULT_PROFILE } from '../../src/domain/types';

const p = (over = {}) => ({ ...DEFAULT_PROFILE, ...over });

describe('greetingText', () => {
  it.each([[5, 'sáng'], [10, 'sáng'], [11, 'trưa'], [12, 'trưa'], [13, 'chiều'], [17, 'chiều'], [18, 'tối'], [23, 'tối'], [2, 'tối']])(
    'hour %s is buổi %s', (h, part) => expect(greetingText(h, null)).toBe(`Chào buổi ${part}`),
  );
  it('addresses women as chị and men as anh with the name in capitals', () => {
    expect(greetingText(8, p({ gender: 'female', fullName: 'Nguyễn Thị Lan' }))).toBe('Chào buổi sáng, chị NGUYỄN THỊ LAN');
    expect(greetingText(20, p({ gender: 'male', fullName: 'trần văn minh' }))).toBe('Chào buổi tối, anh TRẦN VĂN MINH');
  });
  it('uses just the capitalised name for other or unspecified gender', () => {
    expect(greetingText(8, p({ gender: 'other', fullName: 'Lê Hà' }))).toBe('Chào buổi sáng, LÊ HÀ');
    expect(greetingText(8, p({ fullName: 'Lê Hà' }))).toBe('Chào buổi sáng, LÊ HÀ');
  });
  it('falls back to the plain greeting without a usable name', () => {
    expect(greetingText(8, p({ gender: 'female' }))).toBe('Chào buổi sáng');
    expect(greetingText(8, p({ gender: 'female', fullName: '   ' }))).toBe('Chào buổi sáng');
  });
});

describe('normalizeName', () => {
  it('trims, collapses spaces and caps at 60 characters', () => {
    expect(normalizeName('  Nguyễn   Thị  Lan ')).toBe('Nguyễn Thị Lan');
    expect(normalizeName('a'.repeat(80))).toHaveLength(60);
    expect(normalizeName('   ')).toBeUndefined();
    expect(normalizeName(undefined)).toBeUndefined();
  });
});
