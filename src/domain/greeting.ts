import type { Profile } from './types';

const MAX_NAME = 60;

/** Gọn họ tên: bỏ khoảng trắng thừa, tối đa 60 ký tự; rỗng thì không có tên. */
export function normalizeName(raw: string | undefined): string | undefined {
  const name = (raw ?? '').trim().replace(/\s+/g, ' ').slice(0, MAX_NAME).trim();
  return name === '' ? undefined : name;
}

const part = (h: number) => (h >= 5 && h < 11 ? 'sáng' : h >= 11 && h < 13 ? 'trưa' : h >= 13 && h < 18 ? 'chiều' : 'tối');
const TITLE = { female: 'chị', male: 'anh' } as const;

export function greetingText(hour: number, profile: Profile | null): string {
  const base = `Chào buổi ${part(hour)}`;
  const name = normalizeName(profile?.fullName);
  if (!name) return base;
  const title = profile?.gender && profile.gender !== 'other' ? `${TITLE[profile.gender]} ` : '';
  return `${base}, ${title}${name.toLocaleUpperCase('vi')}`;
}
