# Garden Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay lưới ô đặt tay bằng một cảnh vườn SVG nhiều lớp tự phát triển theo điểm, có bầu trời theo giờ máy, thời tiết trang trí, chuyển động mượt và phản ứng khi hoàn thành nhiệm vụ.

**Architecture:** Hàm thuần trong `src/domain` (`growth.ts`, `scene.ts`) mô tả cảnh từ `peakPoints`, tiến độ hôm nay, giờ máy và ngày. `GardenScene` (React + SVG) chỉ vẽ mô tả đó thành 9 lớp; CSS lo chuyển động (chỉ `transform`/`opacity`). Dữ liệu lên schema v2: `garden.peakPoints` (chỉ tăng) thay `unlockedLevel`, bỏ `placed`.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest + Testing Library, Playwright, CSS thuần. Không thêm thư viện animation.

**Spec:** `docs/superpowers/specs/2026-10-09-garden-redesign-design.md` (thay thế mục 6 của `2026-10-09-life-garden-design.md`)

## Global Constraints

- Điểm hiển thị = `totalPoints(days)` (tính từ `days`, thu hồi khi bỏ tick). Vườn lớn theo `garden.peakPoints = max(peakPoints, totalPoints)`, **chỉ tăng**; bỏ tick không làm vườn co lại.
- Không có streak, không héo, không mất gì khi bỏ lỡ; không có hiệu ứng "xấu" khi làm ít. Thời tiết luôn đẹp.
- Schema `version: 2`; `parseData` chấp nhận cả v1 (di trú) và v2; tệp xuất luôn là v2. `peakPoints` di trú = `max(totalPoints, LEVEL_THRESHOLDS_V1[unlockedLevel])` với `[0,10,25,45,70,100,140,190]`.
- Pha trời theo giờ địa phương: bình minh 05:00–07:00, ban ngày 07:00–17:00, hoàng hôn 17:00–19:00, đêm 19:00–05:00. Thời tiết: nắng 40 %, nhiều mây 30 %, mưa nhẹ 15 %, sương sớm 15 % (sương chỉ ở bình minh, ngoài ra hiển thị như nhiều mây). Không dùng mạng/vị trí.
- Chỉ animate `transform` và `opacity`; không animate `width/height/top/left/filter`; không filter SVG trên phần tử chuyển động; trần 70 phần tử chuyển động (`ANIMATION_BUDGET`; mưa 28 giọt chỉ trong ngày mưa; bướm/chim nghỉ khi mưa hoặc ban đêm).
- Tạm dừng chuyển động nền khi tab ẩn hoặc cảnh ngoài khung nhìn. `prefers-reduced-motion` của hệ điều hành **luôn** ép chế độ Nhẹ; `settings.gardenEffects` là `'full' | 'calm' | null` (null = theo hệ thống).
- Cảnh là `role="img"` với `aria-label` động; chữ nằm ngoài cảnh; có danh sách "Trong vườn của bạn".
- Giao diện tiếng Việt; không thêm phụ thuộc chạy (runtime dependency).

## Review Focus

1. Di trú từ dữ liệu/tệp v1 không làm mất mức mở khóa đã có; tệp v1 cũ nhập vào vẫn được (Task 3).
2. Tick → bỏ tick → tick không làm `peakPoints` thay đổi ngoài lần tăng đầu; cây không co lại (Task 3).
3. Qua nửa đêm / đổi pha trời khi app mở: cảnh cập nhật mà không cần tải lại; giờ 04:59/05:00, 06:59/07:00, 16:59/17:00, 18:59/19:00 đúng pha (Task 2, 6).
4. `prefers-reduced-motion` bật: không có vòng lặp nền, không mưa, không parallax, kể cả khi `gardenEffects = 'full'` (Task 7).
5. Cảnh ở 0 điểm, ở giữa và quá 190 điểm đều có bố cục hợp lệ, không chồng phần tử hay trống (Task 4, 5).

## File Structure

```
src/domain/growth.ts        # (mới) danh mục GARDEN_ITEMS, growthOf, creatureCounts, bloomDensity, nextUnlock
src/domain/scene.ts         # (mới) skyPhase, celestial, weatherFor, todayRatio, sceneState, describeScene, resolveEffects
src/domain/garden.ts        # (xóa ở Task 3)
src/domain/scoring.ts       # syncGarden nâng peakPoints
src/domain/types.ts         # Garden v2, Settings.gardenEffects, AppData.version 2
src/state/storage.ts        # emptyData v2, migrateToV2, parseData v1|v2
src/state/store.ts          # bỏ place/remove/move; thêm wateredTick; persistence bỏ qua wateredTick
src/ui/garden/GardenScene.tsx, Defs.tsx, layers/*.tsx, items/*.tsx, CollectionList.tsx,
               useSceneClock.ts, useAmbientPause.ts, garden.css
src/ui/GardenScreen.tsx, Today.tsx, SettingsScreen.tsx, App.tsx
tests/domain/growth.test.ts, scene.test.ts; tests/state/*; tests/ui/garden*.test.tsx
```

---

### Task 1: Danh mục vườn và hàm tăng trưởng

**Files:**
- Create: `src/domain/growth.ts`, `tests/domain/growth.test.ts`

**Interfaces:**
- Produces:
  - `interface Slot { x: number; y: number }` (toạ độ trong viewBox 1000×600)
  - `interface GardenItem { id: string; name: string; kind: 'plant' | 'decor'; unlockAt: number; growSpan: number; slots: Slot[] }`
  - `GARDEN_ITEMS: GardenItem[]`, `getItem(id): GardenItem | undefined`
  - `isUnlocked(item, peak): boolean`, `growthOf(item, peak): number` (0..1; 0 nếu chưa mở)
  - `type Stage = 'seed' | 'sprout' | 'growing' | 'mature'`, `stageOf(growth: number): Stage`
  - `creatureCounts(peak): { butterflies: number; birds: number; fish: number; fireflies: number }`
  - `bloomDensity(peak): number` (0..6)
  - `nextUnlock(peak): { item: GardenItem; remaining: number } | null`

- [ ] **Step 1: Viết test thất bại** `tests/domain/growth.test.ts`

```ts
import {
  bloomDensity, creatureCounts, GARDEN_ITEMS, getItem, growthOf, isUnlocked, nextUnlock, stageOf,
} from '../../src/domain/growth';

const item = (id: string) => getItem(id)!;

describe('catalog', () => {
  it('has unique ids and sane numbers', () => {
    expect(new Set(GARDEN_ITEMS.map((i) => i.id)).size).toBe(GARDEN_ITEMS.length);
    for (const i of GARDEN_ITEMS) {
      expect(i.unlockAt).toBeGreaterThanOrEqual(0);
      expect(i.growSpan).toBeGreaterThanOrEqual(0);
      expect(i.slots.length).toBeGreaterThan(0);
      for (const s of i.slots) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x).toBeLessThanOrEqual(1000);
        expect(s.y).toBeGreaterThanOrEqual(330); // dưới đường chân trời
        expect(s.y).toBeLessThanOrEqual(600);
      }
    }
  });
  it('never has two slots closer than 30 units (no stacking)', () => {
    const all = GARDEN_ITEMS.flatMap((i) => i.slots.map((s) => ({ ...s, id: i.id })));
    for (let a = 0; a < all.length; a++) {
      for (let b = a + 1; b < all.length; b++) {
        if (all[a].id === all[b].id && all[a].id !== 'grass') continue; // cụm cùng loại được sát nhau
        expect(Math.hypot(all[a].x - all[b].x, all[a].y - all[b].y)).toBeGreaterThanOrEqual(30);
      }
    }
  });
  it('always shows something at 0 points (grass is free)', () => {
    expect(GARDEN_ITEMS.filter((i) => isUnlocked(i, 0)).map((i) => i.id)).toContain('grass');
  });
});

describe('growthOf / isUnlocked', () => {
  it('hides locked items and starts growth at 0 on unlock', () => {
    expect(isUnlocked(item('daisy'), 9)).toBe(false);
    expect(growthOf(item('daisy'), 9)).toBe(0);
    expect(isUnlocked(item('daisy'), 10)).toBe(true);
    expect(growthOf(item('daisy'), 10)).toBe(0);
  });
  it('grows linearly over growSpan and clamps at 1', () => {
    const daisy = item('daisy'); // unlockAt 10, growSpan 15
    expect(growthOf(daisy, 17.5)).toBeCloseTo(0.5);
    expect(growthOf(daisy, 25)).toBe(1);
    expect(growthOf(daisy, 100000)).toBe(1);
  });
  it('shows decor fully grown the moment it unlocks', () => {
    expect(isUnlocked(item('bench'), 44)).toBe(false);
    expect(isUnlocked(item('bench'), 45)).toBe(true);
    expect(growthOf(item('bench'), 45)).toBe(1);
  });
  it('is monotonic in peak points', () => {
    for (const i of GARDEN_ITEMS) {
      let prev = 0;
      for (let p = 0; p <= 300; p += 5) {
        const g = growthOf(i, p);
        expect(g).toBeGreaterThanOrEqual(prev);
        prev = g;
      }
    }
  });
});

describe('stageOf', () => {
  it.each([[0, 'seed'], [0.24, 'seed'], [0.25, 'sprout'], [0.59, 'sprout'], [0.6, 'growing'], [0.99, 'growing'], [1, 'mature']])(
    'growth %s is %s',
    (g, s) => expect(stageOf(g as number)).toBe(s),
  );
});

describe('creatures and blooms', () => {
  it('counts butterflies from 25 points, capped at 4', () => {
    expect(creatureCounts(24).butterflies).toBe(0);
    expect(creatureCounts(25).butterflies).toBe(1);
    expect(creatureCounts(65).butterflies).toBe(2);
    expect(creatureCounts(100000).butterflies).toBe(4);
  });
  it('counts birds from 70 points, capped at 3', () => {
    expect(creatureCounts(69).birds).toBe(0);
    expect(creatureCounts(70).birds).toBe(1);
    expect(creatureCounts(130).birds).toBe(2);
    expect(creatureCounts(100000).birds).toBe(3);
  });
  it('adds fish and fireflies from 100 points', () => {
    expect(creatureCounts(99)).toMatchObject({ fish: 0, fireflies: 0 });
    expect(creatureCounts(100)).toMatchObject({ fish: 3, fireflies: 6 });
  });
  it('raises bloom density every 50 points after 190, capped at 6', () => {
    expect(bloomDensity(189)).toBe(0);
    expect(bloomDensity(190)).toBe(0);
    expect(bloomDensity(240)).toBe(1);
    expect(bloomDensity(490)).toBe(6);
    expect(bloomDensity(100000)).toBe(6);
  });
});

describe('nextUnlock', () => {
  it('returns the closest locked item and the points remaining', () => {
    const n = nextUnlock(0)!;
    expect(n.item.unlockAt).toBe(10);
    expect(n.remaining).toBe(10);
    expect(nextUnlock(12)!.item.unlockAt).toBe(25);
  });
  it('is null once everything is unlocked', () => {
    expect(nextUnlock(190)).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/domain/growth.test.ts`
Expected: FAIL (không tìm thấy `growth`).

- [ ] **Step 3: Tạo `src/domain/growth.ts`**

```ts
export interface Slot {
  x: number;
  y: number;
}
export interface GardenItem {
  id: string;
  name: string;
  kind: 'plant' | 'decor';
  unlockAt: number;
  growSpan: number; // 0 = xuất hiện nguyên vẹn
  slots: Slot[]; // toạ độ trong viewBox 1000x600; tinh chỉnh bằng mắt ở Task 5
}

export const GARDEN_ITEMS: GardenItem[] = [
  { id: 'grass', name: 'Cỏ xanh', kind: 'plant', unlockAt: 0, growSpan: 10,
    slots: [{ x: 90, y: 520 }, { x: 300, y: 565 }, { x: 640, y: 570 }, { x: 900, y: 525 }] },
  { id: 'daisy', name: 'Hoa cúc', kind: 'plant', unlockAt: 10, growSpan: 15,
    slots: [{ x: 160, y: 470 }, { x: 215, y: 485 }, { x: 185, y: 515 }] },
  { id: 'stone', name: 'Hòn đá', kind: 'decor', unlockAt: 10, growSpan: 0,
    slots: [{ x: 345, y: 520 }] },
  { id: 'tulip', name: 'Hoa tulip', kind: 'plant', unlockAt: 25, growSpan: 20,
    slots: [{ x: 430, y: 500 }, { x: 475, y: 515 }, { x: 450, y: 535 }] },
  { id: 'sunflower', name: 'Hướng dương', kind: 'plant', unlockAt: 45, growSpan: 25,
    slots: [{ x: 735, y: 470 }, { x: 790, y: 485 }] },
  { id: 'bench', name: 'Ghế đá', kind: 'decor', unlockAt: 45, growSpan: 0,
    slots: [{ x: 880, y: 455 }] },
  { id: 'apple-tree', name: 'Cây táo', kind: 'plant', unlockAt: 70, growSpan: 40,
    slots: [{ x: 290, y: 410 }] },
  { id: 'lantern', name: 'Đèn lồng', kind: 'decor', unlockAt: 70, growSpan: 0,
    slots: [{ x: 960, y: 430 }] },
  { id: 'pond', name: 'Hồ nước', kind: 'decor', unlockAt: 100, growSpan: 20,
    slots: [{ x: 600, y: 535 }] },
  { id: 'cherry-tree', name: 'Cây anh đào', kind: 'plant', unlockAt: 140, growSpan: 40,
    slots: [{ x: 690, y: 405 }] },
  { id: 'bridge', name: 'Cây cầu nhỏ', kind: 'decor', unlockAt: 190, growSpan: 0,
    slots: [{ x: 600, y: 500 }] },
];

export const getItem = (id: string): GardenItem | undefined => GARDEN_ITEMS.find((i) => i.id === id);

export const isUnlocked = (item: GardenItem, peak: number): boolean => peak >= item.unlockAt;

export function growthOf(item: GardenItem, peak: number): number {
  if (!isUnlocked(item, peak)) return 0;
  if (item.growSpan === 0) return 1;
  return Math.max(0, Math.min(1, (peak - item.unlockAt) / item.growSpan));
}

export type Stage = 'seed' | 'sprout' | 'growing' | 'mature';

export function stageOf(growth: number): Stage {
  if (growth >= 1) return 'mature';
  if (growth >= 0.6) return 'growing';
  if (growth >= 0.25) return 'sprout';
  return 'seed';
}

export function creatureCounts(peak: number) {
  return {
    butterflies: peak < 25 ? 0 : Math.min(4, 1 + Math.floor((peak - 25) / 40)),
    birds: peak < 70 ? 0 : Math.min(3, 1 + Math.floor((peak - 70) / 60)),
    fish: peak < 100 ? 0 : 3,
    fireflies: peak < 100 ? 0 : 6,
  };
}

export function bloomDensity(peak: number): number {
  return peak < 190 ? 0 : Math.min(6, Math.floor((peak - 190) / 50));
}

export function nextUnlock(peak: number): { item: GardenItem; remaining: number } | null {
  const locked = GARDEN_ITEMS.filter((i) => !isUnlocked(i, peak)).sort((a, b) => a.unlockAt - b.unlockAt);
  return locked.length === 0 ? null : { item: locked[0], remaining: locked[0].unlockAt - peak };
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run tests/domain/growth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/growth.ts tests/domain/growth.test.ts
git commit -m "feat(domain): garden catalog with continuous growth, creatures and bloom density"
```

---

### Task 2: Bầu trời, thời tiết và mô tả cảnh

**Files:**
- Create: `src/domain/scene.ts`, `tests/domain/scene.test.ts`

**Interfaces:**
- Consumes: `growth.ts` (`GARDEN_ITEMS`, `growthOf`, `isUnlocked`, `stageOf`, `creatureCounts`, `bloomDensity`, `Stage`), `suggest.ts` (`hashSeed`, `rng`), `date.ts` (`addDays`), `types.ts` (`DayTask`).
- Produces:
  - `type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night'`, `type Weather = 'clear' | 'cloudy' | 'rain' | 'mist'`, `type Effects = 'full' | 'calm'`
  - `skyPhase(d: Date): SkyPhase`
  - `celestial(d: Date): { body: 'sun' | 'moon'; t: number }` (t 0..1 dọc cung)
  - `weatherFor(dateKey: string, phase: SkyPhase): Weather`
  - `todayRatio(tasks: DayTask[] | undefined): number`
  - `resolveEffects(setting: Effects | null, prefersReduced: boolean): Effects`
  - `interface SceneItem { id: string; growth: number; stage: Stage }`
  - `interface SceneState { phase; weather; sky: { body; t }; items: SceneItem[]; creatures: ReturnType<typeof creatureCounts>; extraButterflies: number; bloom: number; sunIntensity: number; rainbow: boolean; calm: boolean }`
  - `sceneState(input: { peakPoints: number; todayRatio: number; now: Date; dateKey: string; effects: Effects }): SceneState`
  - `describeScene(state: SceneState, gardenName: string): string`

- [ ] **Step 1: Viết test thất bại** `tests/domain/scene.test.ts`

```ts
import { addDays } from '../../src/domain/date';
import {
  celestial, describeScene, resolveEffects, sceneState, skyPhase, todayRatio, weatherFor,
} from '../../src/domain/scene';
import type { DayTask } from '../../src/domain/types';

const at = (h: number, m = 0) => new Date(2026, 9, 9, h, m, 0);
const task = (status: DayTask['status']): DayTask => ({
  id: status, templateId: 't', habit: 'walk', title: 't', minutes: 1, points: 1, status,
});

describe('skyPhase', () => {
  // Review Focus 3
  it.each([
    [4, 59, 'night'], [5, 0, 'dawn'], [6, 59, 'dawn'], [7, 0, 'day'], [16, 59, 'day'],
    [17, 0, 'dusk'], [18, 59, 'dusk'], [19, 0, 'night'], [0, 0, 'night'], [23, 59, 'night'],
  ])('%s:%s is %s', (h, m, phase) => {
    expect(skyPhase(at(h as number, m as number))).toBe(phase);
  });
});

describe('celestial', () => {
  it('puts the sun on its arc between 06:00 and 18:00', () => {
    expect(celestial(at(6))).toEqual({ body: 'sun', t: 0 });
    expect(celestial(at(12))).toEqual({ body: 'sun', t: 0.5 });
    expect(celestial(at(17, 59)).body).toBe('sun');
  });
  it('puts the moon on its arc between 18:00 and 06:00', () => {
    expect(celestial(at(18))).toEqual({ body: 'moon', t: 0 });
    expect(celestial(at(0))).toEqual({ body: 'moon', t: 0.5 });
    expect(celestial(at(5, 59)).body).toBe('moon');
  });
});

describe('weatherFor', () => {
  const keys = Array.from({ length: 1000 }, (_, i) => addDays('2024-01-01', i));
  it('is deterministic per date and phase', () => {
    expect(weatherFor('2026-10-09', 'day')).toBe(weatherFor('2026-10-09', 'day'));
  });
  it('follows the intended distribution at dawn (mist possible)', () => {
    const counts = { clear: 0, cloudy: 0, rain: 0, mist: 0 };
    keys.forEach((k) => (counts[weatherFor(k, 'dawn')] += 1));
    expect(counts.clear / 1000).toBeGreaterThan(0.3);
    expect(counts.clear / 1000).toBeLessThan(0.5);
    expect(counts.cloudy / 1000).toBeGreaterThan(0.2);
    expect(counts.cloudy / 1000).toBeLessThan(0.4);
    expect(counts.rain / 1000).toBeGreaterThan(0.07);
    expect(counts.rain / 1000).toBeLessThan(0.23);
    expect(counts.mist / 1000).toBeGreaterThan(0.07);
    expect(counts.mist / 1000).toBeLessThan(0.23);
  });
  it('shows mist only at dawn; otherwise it reads as cloudy', () => {
    for (const k of keys) {
      expect(weatherFor(k, 'day')).not.toBe('mist');
      expect(weatherFor(k, 'night')).not.toBe('mist');
    }
  });
});

describe('todayRatio and resolveEffects', () => {
  it('ignores swapped tasks and is 0 without tasks', () => {
    expect(todayRatio(undefined)).toBe(0);
    expect(todayRatio([])).toBe(0);
    expect(todayRatio([task('done'), task('pending'), task('swapped')])).toBe(0.5);
    expect(todayRatio([task('done'), task('done')])).toBe(1);
  });
  // Review Focus 4
  it('forces calm when the system asks for reduced motion', () => {
    expect(resolveEffects('full', true)).toBe('calm');
    expect(resolveEffects(null, true)).toBe('calm');
    expect(resolveEffects(null, false)).toBe('full');
    expect(resolveEffects('calm', false)).toBe('calm');
  });
});

describe('sceneState', () => {
  const base = { peakPoints: 0, todayRatio: 0, now: at(10), dateKey: '2026-10-07', effects: 'full' as const };

  it('is never empty at 0 points', () => {
    const s = sceneState(base);
    expect(s.items.map((i) => i.id)).toContain('grass');
    expect(s.creatures.butterflies).toBe(0);
  });
  it('grows items with peak points and keeps stages consistent', () => {
    const s = sceneState({ ...base, peakPoints: 80 });
    const daisy = s.items.find((i) => i.id === 'daisy')!;
    expect(daisy.growth).toBe(1);
    expect(daisy.stage).toBe('mature');
    const apple = s.items.find((i) => i.id === 'apple-tree')!;
    expect(apple.growth).toBeCloseTo(0.25);
    expect(apple.stage).toBe('sprout');
    expect(s.items.find((i) => i.id === 'pond')).toBeUndefined();
  });
  it('lights the scene up with today progress, never darkening it', () => {
    expect(sceneState({ ...base, todayRatio: 0 }).sunIntensity).toBeCloseTo(0.4);
    expect(sceneState({ ...base, todayRatio: 1 }).sunIntensity).toBeCloseTo(1);
    expect(sceneState({ ...base, todayRatio: 0 }).weather).toBe(sceneState({ ...base, todayRatio: 1 }).weather);
  });
  it('adds extra butterflies at half progress only once butterflies exist', () => {
    expect(sceneState({ ...base, peakPoints: 10, todayRatio: 0.5 }).extraButterflies).toBe(0);
    expect(sceneState({ ...base, peakPoints: 30, todayRatio: 0.4 }).extraButterflies).toBe(0);
    expect(sceneState({ ...base, peakPoints: 30, todayRatio: 0.5 }).extraButterflies).toBe(2);
  });
  it('shows the rainbow only when every task is done', () => {
    expect(sceneState({ ...base, todayRatio: 0.99 }).rainbow).toBe(false);
    expect(sceneState({ ...base, todayRatio: 1 }).rainbow).toBe(true);
  });
  it('hides butterflies and birds at night and in the rain; fireflies only after dusk and dry', () => {
    const day = sceneState({ ...base, peakPoints: 100 });
    expect(day.weather).toBe('clear');
    expect(day.creatures).toMatchObject({ butterflies: 2, birds: 1, fish: 3, fireflies: 0 });
    const night = sceneState({ ...base, peakPoints: 100, now: at(22) });
    expect(night.creatures).toMatchObject({ butterflies: 0, birds: 0, fish: 3, fireflies: 6 });
    const rainy = sceneState({ ...base, peakPoints: 100, dateKey: '2026-10-09' });
    expect(rainy.weather).toBe('rain');
    expect(rainy.creatures).toMatchObject({ butterflies: 0, birds: 0, fireflies: 0 });
    const rainyNight = sceneState({ ...base, peakPoints: 100, todayRatio: 0.5, now: at(22), dateKey: '2026-10-09' });
    expect(rainyNight.creatures.fireflies).toBe(0);
    expect(rainyNight.extraButterflies).toBe(0);
  });
  it('reports calm mode and valid layout past the last unlock', () => {
    const s = sceneState({ ...base, peakPoints: 600, effects: 'calm' });
    expect(s.calm).toBe(true);
    expect(s.bloom).toBe(6);
    expect(s.items).toHaveLength(11);
  });
});

describe('describeScene', () => {
  it('names the garden, sky and weather in plain Vietnamese', () => {
    const s = sceneState({ peakPoints: 0, todayRatio: 0, now: at(10), dateKey: '2026-10-07', effects: 'full' });
    const text = describeScene(s, 'Vườn Mai');
    expect(text).toContain('Vườn Mai');
    expect(text).toContain('ban ngày');
  });
  it('lists growing plants and counts mature items', () => {
    const s = sceneState({ peakPoints: 80, todayRatio: 0, now: at(10), dateKey: '2026-10-07', effects: 'full' });
    const text = describeScene(s, 'Vườn Mai');
    expect(text).toContain('đang lớn');
    expect(text).toContain('Cây táo');
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/domain/scene.test.ts`
Expected: FAIL (không tìm thấy `scene`).

- [ ] **Step 3: Tạo `src/domain/scene.ts`**

```ts
import { bloomDensity, creatureCounts, GARDEN_ITEMS, growthOf, isUnlocked, stageOf, type Stage } from './growth';
import { hashSeed, rng } from './suggest';
import type { DayTask } from './types';

export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'mist';
export type Effects = 'full' | 'calm';

export function skyPhase(d: Date): SkyPhase {
  const h = d.getHours();
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'dusk';
  return 'night';
}

export function celestial(d: Date): { body: 'sun' | 'moon'; t: number } {
  const hours = d.getHours() + d.getMinutes() / 60;
  if (hours >= 6 && hours < 18) return { body: 'sun', t: (hours - 6) / 12 };
  return { body: 'moon', t: ((hours - 18 + 24) % 24) / 12 };
}

export function weatherFor(dateKey: string, phase: SkyPhase): Weather {
  const v = rng(hashSeed(`weather:${dateKey}`))();
  const base: Weather = v < 0.4 ? 'clear' : v < 0.7 ? 'cloudy' : v < 0.85 ? 'rain' : 'mist';
  return base === 'mist' && phase !== 'dawn' ? 'cloudy' : base;
}

export function todayRatio(tasks: DayTask[] | undefined): number {
  const real = (tasks ?? []).filter((t) => t.status !== 'swapped');
  if (real.length === 0) return 0;
  return real.filter((t) => t.status === 'done').length / real.length;
}

export function resolveEffects(setting: Effects | null, prefersReduced: boolean): Effects {
  if (prefersReduced) return 'calm';
  return setting ?? 'full';
}

export interface SceneItem {
  id: string;
  growth: number;
  stage: Stage;
}
export interface SceneState {
  phase: SkyPhase;
  weather: Weather;
  sky: { body: 'sun' | 'moon'; t: number };
  items: SceneItem[];
  creatures: ReturnType<typeof creatureCounts>;
  extraButterflies: number;
  bloom: number;
  sunIntensity: number;
  rainbow: boolean;
  calm: boolean;
}

export function sceneState(input: {
  peakPoints: number;
  todayRatio: number;
  now: Date;
  dateKey: string;
  effects: Effects;
}): SceneState {
  const { peakPoints: peak, todayRatio: ratio } = input;
  const phase = skyPhase(input.now);
  const weather = weatherFor(input.dateKey, phase);
  const raw = creatureCounts(peak);
  // Bướm và chim nghỉ khi trời mưa hoặc ban đêm; đom đóm chỉ ra lúc hoàng hôn/đêm không mưa.
  const daytimeDry = phase !== 'night' && weather !== 'rain';
  const creatures = {
    ...raw,
    butterflies: daytimeDry ? raw.butterflies : 0,
    birds: daytimeDry ? raw.birds : 0,
    fireflies: (phase === 'dusk' || phase === 'night') && weather !== 'rain' ? raw.fireflies : 0,
  };
  return {
    phase,
    weather,
    sky: celestial(input.now),
    items: GARDEN_ITEMS.filter((i) => isUnlocked(i, peak)).map((i) => {
      const growth = growthOf(i, peak);
      return { id: i.id, growth, stage: stageOf(growth) };
    }),
    creatures,
    extraButterflies: ratio >= 0.5 && creatures.butterflies > 0 ? 2 : 0,
    bloom: bloomDensity(peak),
    sunIntensity: 0.4 + 0.6 * ratio,
    rainbow: ratio >= 1,
    calm: input.effects === 'calm',
  };
}

const PHASE_LABEL: Record<SkyPhase, string> = {
  dawn: 'bình minh', day: 'ban ngày', dusk: 'hoàng hôn', night: 'ban đêm',
};
const WEATHER_LABEL: Record<Weather, string> = {
  clear: 'trời nắng đẹp', cloudy: 'trời nhiều mây', rain: 'mưa nhẹ', mist: 'sương sớm',
};

export function describeScene(state: SceneState, gardenName: string): string {
  const names = new Map(GARDEN_ITEMS.map((i) => [i.id, i.name]));
  const growing = state.items.filter((i) => i.stage !== 'mature').map((i) => names.get(i.id)!);
  const mature = state.items.length - growing.length;
  const parts = [`${gardenName}: ${PHASE_LABEL[state.phase]}, ${WEATHER_LABEL[state.weather]}`];
  parts.push(mature > 0 ? `${mature} món đã trưởng thành` : 'khu vườn vừa bắt đầu');
  if (growing.length > 0) parts.push(`đang lớn: ${growing.join(', ')}`);
  return `${parts.join('. ')}.`;
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run tests/domain/scene.test.ts tests/domain/growth.test.ts`
Expected: PASS. Nếu phân bố thời tiết lệch ngoài ngưỡng, kiểm tra lại `rng(hashSeed(...))` chứ không nới ngưỡng test quá 5 điểm phần trăm.

- [ ] **Step 5: Commit**

```bash
git add src/domain/scene.ts tests/domain/scene.test.ts
git commit -m "feat(domain): sky phase, decorative weather and scene description"
```

---

### Task 3: Chuyển dữ liệu sang v2 và bỏ cơ chế đặt món

Task này đổi mô hình dữ liệu và gỡ lưới ô trong cùng một lượt để suite luôn xanh khi kết thúc.

**Files:**
- Modify: `src/domain/types.ts`, `src/domain/scoring.ts`, `src/state/storage.ts`, `src/state/store.ts`, `src/App.tsx`, `src/ui/GardenScreen.tsx`, `src/styles.css`, `e2e/life-garden.spec.ts`
- Create: `src/ui/garden/CollectionList.tsx`
- Delete: `src/domain/garden.ts`, `src/ui/ItemArt.tsx`, `tests/domain/garden.test.ts`
- Test (viết lại/sửa): `tests/domain/scoring.test.ts`, `tests/state/storage.test.ts`, `tests/state/store.test.ts`, `tests/ui/garden.test.tsx`

**Interfaces:**
- Consumes: `growth.ts` (`GARDEN_ITEMS`, `growthOf`, `isUnlocked`, `nextUnlock`, `stageOf`, `Stage`).
- Produces:
  - `Garden = { name: string; peakPoints: number }`; `Settings.gardenEffects: 'full' | 'calm' | null`; `AppData.version: 2`
  - `LEVEL_THRESHOLDS_V1: number[]`, `migrateToV2(raw: Record<string, unknown>): AppData` (trong `storage.ts`)
  - store: bỏ `placeItem`/`removeItem`/`moveItem`; thêm state `wateredTick: number` (tăng mỗi lần một nhiệm vụ chuyển sang `done`, không lưu)
  - `CollectionList({ peak: number })`

- [ ] **Step 1: Viết lại `tests/domain/scoring.test.ts`**

```ts
import { dayPoints, syncGarden, totalPoints } from '../../src/domain/scoring';
import type { AppData, DayTask } from '../../src/domain/types';

const task = (id: string, points: number, status: DayTask['status']): DayTask => ({
  id, templateId: id, habit: 'walk', title: id, minutes: 5, points, status,
});
const data = (days: AppData['days'], peakPoints = 0): AppData => ({
  version: 2,
  profile: null,
  settings: { habits: [], reminderTime: '20:00', notificationsEnabled: false, customTasks: [], gardenEffects: null },
  days,
  garden: { name: 'v', peakPoints },
});

describe('scoring', () => {
  it('counts only done tasks', () => {
    expect(dayPoints([task('a', 3, 'done'), task('b', 5, 'pending'), task('c', 2, 'skipped'), task('d', 4, 'swapped')])).toBe(3);
  });
  it('sums across days and ignores empty/missed days', () => {
    expect(totalPoints({ '2026-10-01': [task('a', 3, 'done')], '2026-10-02': [], '2026-10-03': [task('b', 2, 'pending')] })).toBe(3);
  });
  it('raises peakPoints to the current total when points grow', () => {
    expect(syncGarden(data({ d: [task('a', 12, 'done')] })).garden.peakPoints).toBe(12);
  });
  // Review Focus 2
  it('never lowers peakPoints when points drop', () => {
    expect(syncGarden(data({ d: [task('a', 12, 'pending')] }, 30)).garden.peakPoints).toBe(30);
  });
  it('returns the same object when nothing changes', () => {
    const d = data({ d: [task('a', 12, 'done')] }, 12);
    expect(syncGarden(d)).toBe(d);
  });
});
```

- [ ] **Step 2: Viết lại `tests/state/storage.test.ts`**

```ts
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
```

- [ ] **Step 3: Sửa `tests/state/store.test.ts`** (áp dụng bằng Edit)

Thay test `keeps unlockedLevel after points are revoked` bằng:

```ts
  // Review Focus 2
  it('keeps peakPoints after points are revoked and does not grow again on re-tick', () => {
    useStore.setState((st) => ({ data: { ...st.data, days: { ...st.data.days, '2026-10-01': [bigTask()] } } }));
    s().toggleDone('2026-10-01', 'big');
    expect(s().data.garden.peakPoints).toBe(10);
    s().toggleDone('2026-10-01', 'big');
    expect(totalPoints(s().data.days)).toBe(0);
    expect(s().data.garden.peakPoints).toBe(10);
    s().toggleDone('2026-10-01', 'big');
    expect(s().data.garden.peakPoints).toBe(10);
  });
  it('counts waterings only when a task becomes done', () => {
    const id = s().data.days[D][0].id;
    const before = s().wateredTick;
    s().toggleDone(D, id);
    expect(s().wateredTick).toBe(before + 1);
    s().toggleDone(D, id); // bỏ tick
    expect(s().wateredTick).toBe(before + 1);
    s().skipTask(D, id);
    expect(s().wateredTick).toBe(before + 1);
  });
```

Xóa toàn bộ `describe('garden actions', ...)` cũ và thay bằng:

```ts
describe('garden actions', () => {
  it('renames the garden, trimming and rejecting empty names', () => {
    s().renameGarden('  Vườn Mai  ');
    expect(s().data.garden.name).toBe('Vườn Mai');
    s().renameGarden('   ');
    expect(s().data.garden.name).toBe('Vườn Mai');
  });
});
```

Trong `describe('import / export / reset')` thêm test (trước test "rejects a bad file"):

```ts
  // Review Focus 1
  it('imports an old v1 export and upgrades it', () => {
    const old = JSON.stringify({
      version: 1, profile: DEFAULT_PROFILE,
      settings: { habits: ['water'], reminderTime: '07:00', notificationsEnabled: false, customTasks: [] },
      days: {}, garden: { name: 'Vườn cũ', unlockedLevel: 4, placed: [{ cell: 1, itemId: 'daisy' }] },
    });
    expect(s().importText(old)).toEqual({ ok: true });
    expect(s().data.version).toBe(2);
    expect(s().data.garden.peakPoints).toBe(70);
  });
```

Trong `describe('persistence')` thêm test:

```ts
  it('does not write to storage when only the watering tick changes', () => {
    const stop = startPersistence();
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    useStore.setState((st) => ({ wateredTick: st.wateredTick + 1 }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    stop();
  });
```

Xóa dòng import không còn dùng nếu có; `STORAGE_KEY` vẫn dùng.

- [ ] **Step 4: Viết lại `tests/ui/garden.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import GardenScreen from '../../src/ui/GardenScreen';

const seed = (peakPoints: number, name = 'Vườn thử') =>
  useStore.setState({
    data: { ...emptyData(), profile: DEFAULT_PROFILE, garden: { name, peakPoints } },
    storageStatus: 'ok',
  });

describe('GardenScreen', () => {
  it('shows the garden name and the collection list', () => {
    seed(0);
    render(<GardenScreen />);
    expect(screen.getByDisplayValue('Vườn thử')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trong vườn của bạn' })).toBeInTheDocument();
    expect(screen.getByText('Cỏ xanh · mới gieo (0%)')).toBeInTheDocument();
  });

  it('shows locked items as silhouettes with the points still needed', () => {
    seed(0);
    render(<GardenScreen />);
    expect(screen.getByText('Hoa cúc · còn 10 điểm')).toBeInTheDocument();
    expect(screen.getByText('Cây cầu nhỏ · còn 190 điểm')).toBeInTheDocument();
  });

  it('shows growth stages for unlocked items', () => {
    seed(50);
    render(<GardenScreen />);
    expect(screen.getByText('Hoa cúc · đã trưởng thành')).toBeInTheDocument();
    expect(screen.getByText('Hướng dương · mới gieo (20%)')).toBeInTheDocument();
  });

  it('renames the garden on blur', async () => {
    seed(0);
    render(<GardenScreen />);
    const input = screen.getByLabelText('Tên khu vườn');
    await userEvent.clear(input);
    await userEvent.type(input, 'Vườn Mai');
    await userEvent.tab();
    expect(useStore.getState().data.garden.name).toBe('Vườn Mai');
  });

  it('restores the old name when the field is left blank', async () => {
    seed(0);
    render(<GardenScreen />);
    const input = screen.getByLabelText('Tên khu vườn');
    await userEvent.clear(input);
    await userEvent.tab();
    expect(useStore.getState().data.garden.name).toBe('Vườn thử');
    expect(input).toHaveValue('Vườn thử');
  });
});
```

- [ ] **Step 5: Chạy để thấy thất bại**

Run: `npx vitest run`
Expected: nhiều file FAIL (types/`peakPoints`/`CollectionList` chưa có; `garden.test.ts` cũ vẫn chạy với code cũ nên chưa liên quan). Ghi lại các lỗi để so với Step 8.

- [ ] **Step 6: Cập nhật dữ liệu và logic**

`src/domain/types.ts`: thay các khai báo `PlacedItem`, `Garden`, `Settings`, `AppData`:

```ts
export interface Settings {
  habits: Habit[]; // rỗng = tất cả
  reminderTime: string; // 'HH:MM'
  notificationsEnabled: boolean;
  customTasks: TaskTemplate[];
  gardenEffects: 'full' | 'calm' | null; // null = theo hệ thống
}

export interface Garden {
  name: string;
  peakPoints: number; // điểm cao nhất từng đạt; chỉ tăng
}

export interface AppData {
  version: 2;
  profile: Profile | null; // null = chưa thiết lập → hiện màn chào mừng
  settings: Settings;
  days: Record<string, DayTask[]>;
  garden: Garden;
}
```
(xóa `PlacedItem`).

`src/domain/scoring.ts`:

```ts
import type { AppData, DayTask } from './types';

export const dayPoints = (tasks: DayTask[]): number =>
  tasks.filter((t) => t.status === 'done').reduce((s, t) => s + t.points, 0);

export const totalPoints = (days: Record<string, DayTask[]>): number =>
  Object.values(days).reduce((s, tasks) => s + dayPoints(tasks), 0);

/** Nâng peakPoints lên điểm hiện có nếu cao hơn; không bao giờ hạ. */
export function syncGarden(data: AppData): AppData {
  const total = totalPoints(data.days);
  return total > data.garden.peakPoints
    ? { ...data, garden: { ...data.garden, peakPoints: total } }
    : data;
}
```

`src/state/storage.ts`: thay toàn bộ nội dung phần dữ liệu (giữ `BACKUP_KEY`, `backupRaw`, `loadData`, `saveData` như hiện tại):

```ts
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
```
Giữ nguyên `loadData`, `saveData`, `backupRaw` bên dưới.

`src/state/store.ts`: (a) xóa dòng import `canPlace, moveItem as moveInGarden, placeItem as placeInGarden, removeAt` từ `../domain/garden`; (b) trong `interface State` xóa `placeItem`, `removeItem`, `moveItem` và thêm `wateredTick: number;`; (c) trong object trả về thêm `wateredTick: 0,` ngay sau `storageStatus: loaded.status,`; (d) xóa ba hàm `placeItem`, `removeItem`, `moveItem`; (e) thay `toggleDone`:

```ts
    toggleDone: (date, id) => {
      const status = () => get().data.days[date]?.find((t) => t.id === id)?.status;
      const before = status();
      mapTask(date, id, (t) =>
        t.status === 'done' ? { ...t, status: 'pending' }
        : t.status === 'pending' || t.status === 'skipped' ? { ...t, status: 'done' }
        : t);
      if (status() === 'done' && before !== 'done') set((s) => ({ wateredTick: s.wateredTick + 1 }));
    },
```

- [ ] **Step 7: Giao diện tạm thời (danh sách bộ sưu tập) và dọn code cũ**

`src/ui/garden/CollectionList.tsx`:

```tsx
import { GARDEN_ITEMS, growthOf, isUnlocked, stageOf, type Stage } from '../../domain/growth';

const STAGE_LABEL: Record<Stage, string> = {
  seed: 'mới gieo', sprout: 'mới nảy mầm', growing: 'đang lớn', mature: 'đã trưởng thành',
};

export function CollectionList({ peak }: { peak: number }) {
  return (
    <section aria-labelledby="collection-title" className="stack">
      <h2 id="collection-title">Trong vườn của bạn</h2>
      <ul className="collection">
        {GARDEN_ITEMS.map((item) => {
          if (!isUnlocked(item, peak)) {
            return (
              <li key={item.id} className="locked">
                {`${item.name} · còn ${item.unlockAt - peak} điểm`}
              </li>
            );
          }
          const growth = growthOf(item, peak);
          const pct = item.growSpan > 0 && growth < 1 ? ` (${Math.round(growth * 100)}%)` : '';
          return (
            <li key={item.id} className="unlocked">
              {`${item.name} · ${STAGE_LABEL[stageOf(growth)]}${pct}`}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

`src/ui/GardenScreen.tsx` (thay toàn bộ):

```tsx
import { useState } from 'react';
import { useStore } from '../state/store';
import { CollectionList } from './garden/CollectionList';

export default function GardenScreen() {
  const name = useStore((s) => s.data.garden.name);
  const peak = useStore((s) => s.data.garden.peakPoints);
  const { renameGarden } = useStore.getState();
  const [draft, setDraft] = useState(name);

  return (
    <section className="stack">
      <label>Tên khu vườn
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            renameGarden(draft);
            if (!draft.trim()) setDraft(name);
          }}
        />
      </label>
      <CollectionList peak={peak} />
    </section>
  );
}
```

`src/App.tsx`: thay import `ITEMS` bằng `import { GARDEN_ITEMS } from './domain/growth';`, và trong `Shell` thay các dòng dùng `level` bằng:

```tsx
  const peak = useStore((s) => s.data.garden.peakPoints);
  const prev = useRef(peak);
  const [toast, setToast] = useState('');

  useEffect(() => ensureDay(today), [today, ensureDay]);
  useEffect(() => {
    const before = prev.current;
    prev.current = peak;
    const names = GARDEN_ITEMS.filter((i) => i.unlockAt > before && i.unlockAt <= peak).map((i) => i.name);
    if (names.length === 0) return;
    setToast(`Bạn vừa mở khóa: ${names.join(', ')} 🎉`);
    const id = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(id);
  }, [peak]);
```
(bỏ khai báo `level`, `prev` cũ và hai `useEffect` cũ).

`src/styles.css` thêm cuối file:

```css
.collection { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.collection li { padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); }
.collection li.locked { color: var(--muted); border-style: dashed; }
```
và xóa các quy tắc `.grid`, `.cell` không còn dùng.

Xóa file: `git rm src/domain/garden.ts src/ui/ItemArt.tsx tests/domain/garden.test.ts`.

`e2e/life-garden.spec.ts`: thay khối đặt cỏ (bốn dòng từ `await page.getByRole('button', { name: 'Ô 1', exact: true }).click();` đến `expect(... 'Ô 1: Cỏ xanh' ...)`) bằng:

```ts
  await expect(page.getByRole('heading', { name: 'Trong vườn của bạn' })).toBeVisible();
  await expect(page.getByText(/^Hoa cúc · còn \d+ điểm$/)).toBeVisible();
```
và sau `page.reload()` + bấm tab Khu vườn thay dòng `expect(... 'Ô 1: Cỏ xanh' ...)` bằng `await expect(page.getByText(/^Cỏ xanh · /)).toBeVisible();`.

- [ ] **Step 8: Chạy toàn bộ kiểm tra**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run e2e`
Expected: tất cả PASS, không còn tham chiếu `unlockedLevel`/`placed`/`ItemArt` (kiểm bằng `grep -rn "unlockedLevel\|ItemArt\|placeItem" src tests e2e` chỉ còn trong `storage.ts`/`storage.test.ts` ở phần di trú v1).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: garden data model v2 (peakPoints), migrate v1, remove manual placement"
```

---

### Task 4: Nền cảnh (bầu trời, đồi, mặt đất) và trang xem thử

**Files:**
- Create: `src/ui/garden/Defs.tsx`, `src/ui/garden/layers/SkyLayer.tsx`, `src/ui/garden/layers/LandLayer.tsx`, `src/ui/garden/GardenScene.tsx`, `src/ui/garden/Preview.tsx`, `src/ui/garden/garden.css`, `tests/ui/garden-scene.test.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `scene.ts` (`SceneState`, `SkyPhase`, `sceneState`, `describeScene`), `suggest.ts` (`hashSeed`, `rng`).
- Produces:
  - `Defs()` — mọi gradient dùng chung (id: `sky-dawn|day|dusk|night`, `far-hill`, `near-hill`, `ground`, `leaf`, `leaf-dark`, `trunk`, `sun`, `sun-glow`, `moon`, `moon-glow`, `shadow`, `petal`, `yellow`, `tulip`, `cherry`, `stone`, `wood`, `water`, `apple`)
  - `GardenScene({ state: SceneState; name: string; wateredTick?: number })` — `div.garden-scene` với `role="img"`, `aria-label = describeScene(...)`, lớp `phase-*`, `weather-*`, `calm`, `data-testid="garden-scene"`
  - `Preview()` — trang chỉ có trong dev, mở bằng `/?preview=garden`, có bộ điều khiển điểm, giờ, thời tiết, tiến độ, hiệu ứng

- [ ] **Step 1: Viết test thất bại** `tests/ui/garden-scene.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sceneState } from '../../src/domain/scene';
import { GardenScene } from '../../src/ui/garden/GardenScene';
import { Preview } from '../../src/ui/garden/Preview';

const make = (over: Partial<Parameters<typeof sceneState>[0]> = {}) =>
  sceneState({ peakPoints: 0, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects: 'full', ...over });

describe('GardenScene base', () => {
  it('is an image with a descriptive label and hides its internals', () => {
    const { container } = render(<GardenScene state={make()} name="Vườn Mai" />);
    const scene = screen.getByTestId('garden-scene');
    expect(scene).toHaveAttribute('role', 'img');
    expect(scene.getAttribute('aria-label')).toContain('Vườn Mai');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
  it('marks the current sky phase and only that sky as active', () => {
    const { container } = render(<GardenScene state={make({ now: new Date(2026, 9, 9, 18) })} name="v" />);
    expect(screen.getByTestId('garden-scene')).toHaveClass('phase-dusk');
    const active = [...container.querySelectorAll('.sky')].filter((n) => n.getAttribute('data-active') === 'true');
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveClass('sky-dusk');
  });
  it('shows the sun by day and the moon by night', () => {
    const day = render(<GardenScene state={make()} name="v" />);
    expect(day.container.querySelector('.sun')).not.toBeNull();
    expect(day.container.querySelector('.moon')).toBeNull();
    day.unmount();
    const night = render(<GardenScene state={make({ now: new Date(2026, 9, 9, 23) })} name="v" />);
    expect(night.container.querySelector('.moon')).not.toBeNull();
    expect(night.container.querySelector('.sun')).toBeNull();
  });
  it('flags calm mode', () => {
    render(<GardenScene state={make({ effects: 'calm' })} name="v" />);
    expect(screen.getByTestId('garden-scene')).toHaveClass('calm');
  });
  it('always draws hills and ground, even with zero points', () => {
    const { container } = render(<GardenScene state={make()} name="v" />);
    expect(container.querySelector('.layer-far-hills')).not.toBeNull();
    expect(container.querySelector('.layer-near-hills')).not.toBeNull();
    expect(container.querySelector('.layer-ground')).not.toBeNull();
  });
});

describe('Preview harness', () => {
  it('updates the scene when the controls change', async () => {
    render(<Preview />);
    const hour = screen.getByLabelText('Giờ');
    await userEvent.clear(hour);
    await userEvent.type(hour, '23');
    expect(screen.getByTestId('garden-scene')).toHaveClass('phase-night');
    await userEvent.selectOptions(screen.getByLabelText('Hiệu ứng'), 'calm');
    expect(screen.getByTestId('garden-scene')).toHaveClass('calm');
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/ui/garden-scene.test.tsx`
Expected: FAIL (không tìm thấy `GardenScene`).

- [ ] **Step 3: Tạo `src/ui/garden/Defs.tsx`**

```tsx
const stops = (pairs: [number, string][]) =>
  pairs.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />);

function Linear({ id, pairs, x2 = 0, y2 = 1 }: { id: string; pairs: [number, string][]; x2?: number; y2?: number }) {
  return <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>{stops(pairs)}</linearGradient>;
}
function Radial({ id, pairs }: { id: string; pairs: [number, string, number?][] }) {
  return (
    <radialGradient id={id}>
      {pairs.map(([o, c, a]) => <stop key={o} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
    </radialGradient>
  );
}

export function Defs() {
  return (
    <defs>
      <Linear id="sky-dawn" pairs={[[0, '#8f9fe0'], [0.55, '#f3b9c8'], [1, '#ffdcb0']]} />
      <Linear id="sky-day" pairs={[[0, '#5aa9ee'], [0.6, '#a8dcf2'], [1, '#e4f7ec']]} />
      <Linear id="sky-dusk" pairs={[[0, '#4a3f8f'], [0.55, '#d9779a'], [1, '#ffb978']]} />
      <Linear id="sky-night" pairs={[[0, '#081a38'], [0.7, '#17406a'], [1, '#1f5b73']]} />
      <Linear id="far-hill" pairs={[[0, '#9ccbb8'], [1, '#cbe6d9']]} />
      <Linear id="near-hill" pairs={[[0, '#62b583'], [1, '#8fd09b']]} />
      <Linear id="ground" pairs={[[0, '#4fa468'], [1, '#86c98f']]} />
      <Linear id="leaf" pairs={[[0, '#86e096'], [1, '#3a9657']]} />
      <Linear id="leaf-dark" pairs={[[0, '#4fb06b'], [1, '#23744a']]} />
      <Linear id="trunk" x2={1} y2={0} pairs={[[0, '#b07a52'], [1, '#6a452f']]} />
      <Linear id="petal" pairs={[[0, '#ffffff'], [1, '#e8eef4']]} />
      <Linear id="yellow" pairs={[[0, '#ffe680'], [1, '#f5a623']]} />
      <Linear id="tulip" pairs={[[0, '#ff9bb3'], [1, '#dc3d77']]} />
      <Linear id="cherry" pairs={[[0, '#ffd8e6'], [1, '#f48fb1']]} />
      <Linear id="stone" pairs={[[0, '#cfd6dc'], [1, '#8e9aa6']]} />
      <Linear id="wood" pairs={[[0, '#c68e5c'], [1, '#8a5a36']]} />
      <Linear id="water" pairs={[[0, '#7fd3f0'], [1, '#2f8fc7']]} />
      <Linear id="apple" pairs={[[0, '#ff7a7a'], [1, '#d63030']]} />
      <Radial id="sun" pairs={[[0, '#fff6c8'], [0.6, '#ffd45e'], [1, '#ffb02e']]} />
      <Radial id="sun-glow" pairs={[[0, '#ffe9a0', 0.9], [1, '#ffe9a0', 0]]} />
      <Radial id="moon" pairs={[[0, '#fffdf0'], [1, '#dfe6ee']]} />
      <Radial id="moon-glow" pairs={[[0, '#cfe0ff', 0.5], [1, '#cfe0ff', 0]]} />
      <Radial id="shadow" pairs={[[0, '#0c2d1a', 0.35], [1, '#0c2d1a', 0]]} />
    </defs>
  );
}
```

- [ ] **Step 4: Tạo `src/ui/garden/layers/SkyLayer.tsx`**

```tsx
import type { CSSProperties } from 'react';
import { hashSeed, rng } from '../../../domain/suggest';
import type { SceneState, SkyPhase } from '../../../domain/scene';

const PHASES: SkyPhase[] = ['dawn', 'day', 'dusk', 'night'];

const STARS = (() => {
  const r = rng(hashSeed('stars'));
  return Array.from({ length: 36 }, () => ({ x: r() * 1000, y: r() * 260, r: 0.8 + r() * 1.6, d: r() * 4 }));
})();

const CLOUDS = [
  { x: 120, y: 90, s: 1, d: 0, extra: false },
  { x: 480, y: 140, s: 0.8, d: 1, extra: false },
  { x: 800, y: 70, s: 1.15, d: 2, extra: false },
  { x: 300, y: 50, s: 0.7, d: 3, extra: true },
  { x: 650, y: 125, s: 0.9, d: 4, extra: true },
  { x: 40, y: 160, s: 0.75, d: 5, extra: true },
];

export function SkyLayer({ state }: { state: SceneState }) {
  const { body, t } = state.sky;
  const x = 90 + 820 * t;
  const y = 300 - 210 * Math.sin(Math.PI * t);
  return (
    <g className="layer layer-sky" data-depth="0.15">
      {PHASES.map((p) => (
        <rect key={p} className={`sky sky-${p}`} data-active={state.phase === p} x="-40" y="-40" width="1080" height="500" fill={`url(#sky-${p})`} />
      ))}
      <g className="stars">
        {STARS.map((s, i) => (
          <circle key={i} className="star" cx={s.x} cy={s.y} r={s.r} fill="#fff" style={{ '--delay': `${-s.d}s` } as CSSProperties} />
        ))}
      </g>
      {body === 'sun' ? (
        <g className="sun" transform={`translate(${x} ${y})`}>
          <circle r="120" fill="url(#sun-glow)" />
          <circle r="38" fill="url(#sun)" />
        </g>
      ) : (
        <g className="moon" transform={`translate(${x} ${y})`}>
          <circle r="90" fill="url(#moon-glow)" />
          <circle r="28" fill="url(#moon)" />
          <circle cx="-8" cy="-6" r="5" fill="#cfd6df" opacity="0.6" />
          <circle cx="9" cy="8" r="3.5" fill="#cfd6df" opacity="0.5" />
        </g>
      )}
    </g>
  );
}

function Cloud() {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="60" ry="22" />
      <ellipse cx="-34" cy="6" rx="38" ry="18" />
      <ellipse cx="38" cy="8" rx="42" ry="17" />
      <ellipse cx="6" cy="-14" rx="34" ry="20" />
    </g>
  );
}

export function CloudsLayer() {
  return (
    <g className="layer layer-clouds" data-depth="0.3">
      {CLOUDS.map((c, i) => (
        <g key={i} className={`cloud-drift${c.extra ? ' cloud-extra' : ''}`} style={{ '--delay': `${-c.d * 17}s`, '--dur': `${90 + c.d * 9}s` } as CSSProperties}>
          <g className="cloud" transform={`translate(${c.x} ${c.y}) scale(${c.s})`}>
            <Cloud />
          </g>
        </g>
      ))}
    </g>
  );
}
```

- [ ] **Step 5: Tạo `src/ui/garden/layers/LandLayer.tsx`**

```tsx
const TREE_BLOBS = [
  { x: 120, y: 372, r: 16 }, { x: 150, y: 368, r: 12 }, { x: 760, y: 352, r: 15 },
  { x: 800, y: 350, r: 11 }, { x: 905, y: 366, r: 14 },
];

export function HillsLayer() {
  return (
    <>
      <g className="layer layer-far-hills" data-depth="0.35">
        <path d="M-40 335 C 150 270, 300 305, 450 288 S 750 250, 1040 305 L1040 440 L-40 440Z" fill="url(#far-hill)" />
      </g>
      <g className="layer layer-near-hills" data-depth="0.55">
        <path d="M-40 385 C 200 330, 380 365, 560 342 S 860 332, 1040 370 L1040 470 L-40 470Z" fill="url(#near-hill)" />
        {TREE_BLOBS.map((b, i) => (
          <g key={i}>
            <rect x={b.x - 1.5} y={b.y} width="3" height="9" fill="#5a7d63" />
            <circle cx={b.x} cy={b.y} r={b.r} fill="#4f9e6c" opacity="0.9" />
          </g>
        ))}
      </g>
    </>
  );
}

export function GroundLayer() {
  return (
    <g className="layer layer-ground" data-depth="0.75">
      <path d="M-40 425 C 250 398, 520 432, 1040 402 L1040 640 L-40 640Z" fill="url(#ground)" />
      <ellipse cx="260" cy="520" rx="260" ry="26" fill="#ffffff" opacity="0.06" />
      <ellipse cx="760" cy="560" rx="300" ry="30" fill="#ffffff" opacity="0.05" />
    </g>
  );
}

export function TintLayer() {
  return (
    <g className="layer-tint" aria-hidden="true">
      <rect className="tint tint-dawn" x="-40" y="-40" width="1080" height="680" fill="#ffaabe" />
      <rect className="tint tint-dusk" x="-40" y="-40" width="1080" height="680" fill="#ff8c50" />
      <rect className="tint tint-night" x="-40" y="-40" width="1080" height="680" fill="#081a3c" />
    </g>
  );
}
```

- [ ] **Step 6: Tạo `src/ui/garden/GardenScene.tsx`**

```tsx
import type { CSSProperties } from 'react';
import { describeScene, type SceneState } from '../../domain/scene';
import { Defs } from './Defs';
import { CloudsLayer, SkyLayer } from './layers/SkyLayer';
import { GroundLayer, HillsLayer, TintLayer } from './layers/LandLayer';
import './garden.css';

interface Props {
  state: SceneState;
  name: string;
  wateredTick?: number;
}

export function GardenScene({ state, name }: Props) {
  const cls = ['garden-scene', `phase-${state.phase}`, `weather-${state.weather}`, state.calm ? 'calm' : ''].join(' ').trim();
  return (
    <div
      className={cls}
      role="img"
      aria-label={describeScene(state, name)}
      data-testid="garden-scene"
      style={{ '--sun': state.sunIntensity } as CSSProperties}
    >
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <Defs />
        <SkyLayer state={state} />
        <CloudsLayer />
        <HillsLayer />
        <GroundLayer />
        <TintLayer />
      </svg>
    </div>
  );
}
```

- [ ] **Step 7: Tạo `src/ui/garden/garden.css`** (các task sau bổ sung vào cuối file)

```css
.garden-scene {
  --cloud: #ffffff;
  position: relative;
  width: 100%;
  aspect-ratio: 5 / 3;
  border-radius: 24px;
  overflow: hidden;
  background: #cfe9f7;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 8px 24px rgba(20, 60, 40, 0.18);
}
.garden-scene svg { display: block; width: 100%; height: 100%; }
.weather-cloudy { --cloud: #f1f4f8; }
.weather-rain { --cloud: #cfd8e3; }
.weather-mist { --cloud: #f6f8fa; }
.cloud { fill: var(--cloud); opacity: 0.92; }
.cloud-extra { opacity: 0; }
.weather-cloudy .cloud-extra, .weather-rain .cloud-extra, .weather-mist .cloud-extra { opacity: 1; }

.sky { opacity: 0; transition: opacity 3s ease; }
.sky[data-active='true'] { opacity: 1; }
.stars { opacity: 0; transition: opacity 3s ease; }
.phase-night .stars { opacity: 1; }
.phase-dusk .stars { opacity: 0.35; }
.phase-dawn .stars { opacity: 0.2; }
.phase-day .stars { opacity: 0; }

.tint { opacity: 0; transition: opacity 3s ease; }
.phase-dawn .tint-dawn { opacity: 0.1; }
.phase-dusk .tint-dusk { opacity: 0.16; }
.phase-night .tint-night { opacity: 0.42; }

.calm .sky, .calm .stars, .calm .tint { transition-duration: 150ms; }

.garden-preview { max-width: 900px; margin: 0 auto; padding: 16px; display: grid; gap: 12px; }
.garden-preview .controls { display: flex; flex-wrap: wrap; gap: 12px; }
```

- [ ] **Step 8: Tạo `src/ui/garden/Preview.tsx`**

```tsx
import { useState } from 'react';
import { sceneState, type Effects, type Weather } from '../../domain/scene';
import { GardenScene } from './GardenScene';

export function Preview() {
  const [peak, setPeak] = useState(0);
  const [hour, setHour] = useState(10);
  const [weather, setWeather] = useState<Weather | 'auto'>('auto');
  const [ratio, setRatio] = useState(0);
  const [effects, setEffects] = useState<Effects>('full');

  const base = sceneState({
    peakPoints: peak,
    todayRatio: ratio / 100,
    now: new Date(2026, 9, 9, Math.min(23, Math.max(0, hour)), 0, 0),
    dateKey: '2026-10-07',
    effects,
  });
  const state = weather === 'auto' ? base : { ...base, weather };

  return (
    <main className="garden-preview">
      <h1>Xem thử khu vườn</h1>
      <div className="controls">
        <label>Điểm đỉnh
          <input type="number" min="0" value={peak} onChange={(e) => setPeak(Number(e.target.value) || 0)} />
        </label>
        <label>Giờ
          <input type="number" min="0" max="23" value={hour} onChange={(e) => setHour(Number(e.target.value) || 0)} />
        </label>
        <label>Thời tiết
          <select value={weather} onChange={(e) => setWeather(e.target.value as Weather | 'auto')}>
            <option value="auto">Theo ngày</option>
            <option value="clear">Nắng</option>
            <option value="cloudy">Nhiều mây</option>
            <option value="rain">Mưa nhẹ</option>
            <option value="mist">Sương</option>
          </select>
        </label>
        <label>Tiến độ hôm nay (%)
          <input type="number" min="0" max="100" value={ratio} onChange={(e) => setRatio(Number(e.target.value) || 0)} />
        </label>
        <label>Hiệu ứng
          <select value={effects} onChange={(e) => setEffects(e.target.value as Effects)}>
            <option value="full">Đầy đủ</option>
            <option value="calm">Nhẹ</option>
          </select>
        </label>
      </div>
      <GardenScene state={state} name="Xem thử" />
    </main>
  );
}
```

- [ ] **Step 9: Nối trang xem thử (chỉ dev) trong `src/main.tsx`**

Thay khối `createRoot(...).render(...)` cuối file bằng:

```tsx
const root = createRoot(document.getElementById('root')!);
if (import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === 'garden') {
  import('./ui/garden/Preview').then(({ Preview }) => root.render(<Preview />));
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
```

- [ ] **Step 10: Chạy test**

Run: `npx vitest run tests/ui/garden-scene.test.tsx && npx tsc --noEmit`
Expected: PASS, không lỗi type.

- [ ] **Step 11: Kiểm tra bằng mắt (vòng tinh chỉnh)**

Chạy `npm run dev`, mở `http://localhost:5173/?preview=garden` bằng Chrome automation. Chụp ở 375×700 và 1024×700 cho giờ 6, 12, 18, 23 (điểm 0). Tiêu chí đạt: đường chân trời ở khoảng 55 % chiều cao; ba lớp bầu trời / đồi xa / đồi gần / mặt đất tách bạch về độ sáng (đồi xa nhạt nhất); mặt trời và quầng sáng không bị cắt vô lý; ban đêm thấy sao và trăng, mặt đất tối đi nhưng vẫn đọc được; chuyển pha mượt. Nếu chưa đạt, chỉnh hằng số màu/đường cong trong `Defs.tsx` và `LandLayer.tsx` rồi chụp lại. Ghi vào ledger các chỉnh sửa (không cần test mới cho chỉnh màu).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(garden): layered scene base (sky, clouds, hills, ground) and dev preview"
```

---

### Task 5: Các phần tử trong vườn, đổ bóng và sinh vật

**Files:**
- Create: `src/ui/garden/items/Plants.tsx`, `src/ui/garden/items/Decor.tsx`, `src/ui/garden/items/Creatures.tsx`, `src/ui/garden/items/index.ts`, `src/ui/garden/layers/ElementsLayer.tsx`, `tests/ui/garden-items.test.tsx`
- Modify: `src/ui/garden/GardenScene.tsx`, `src/ui/garden/garden.css`

**Interfaces:**
- Consumes: `growth.ts` (`getItem`), `SceneState`.
- Produces:
  - `interface ArtProps { growth: number; seed: number; fish?: number }`
  - `ITEM_ART: Record<string, { Art: (p: ArtProps) => JSX.Element; shadow: number; min: number }>` (`shadow` = bán kính ngang bóng, `min` = tỷ lệ nhỏ nhất khi `growth = 0`)
  - `depthScale(y: number): number` (0.7 ở y=330 → 1.3 ở y=600, tuyến tính, bị chặn)
  - `ElementsLayer({ state })` — mỗi bản thể là `g[data-item][data-y][data-growth]`, xếp theo `y` tăng dần; `CreaturesLayer({ state })` — `.butterfly`, `.bird`, `.firefly`

- [ ] **Step 1: Viết test thất bại** `tests/ui/garden-items.test.tsx`

```tsx
import { render } from '@testing-library/react';
import { sceneState } from '../../src/domain/scene';
import { GARDEN_ITEMS } from '../../src/domain/growth';
import { GardenScene } from '../../src/ui/garden/GardenScene';
import { depthScale } from '../../src/ui/garden/layers/ElementsLayer';

const make = (peak: number, over: Partial<Parameters<typeof sceneState>[0]> = {}) =>
  sceneState({ peakPoints: peak, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects: 'full', ...over });
const count = (c: HTMLElement, id: string) => c.querySelectorAll(`[data-item="${id}"]`).length;

describe('depthScale', () => {
  it('grows from 0.7 at the horizon to 1.3 at the front and is clamped', () => {
    expect(depthScale(330)).toBeCloseTo(0.7);
    expect(depthScale(600)).toBeCloseTo(1.3);
    expect(depthScale(100)).toBeCloseTo(0.7);
    expect(depthScale(900)).toBeCloseTo(1.3);
    expect(depthScale(465)).toBeGreaterThan(depthScale(400));
  });
});

describe('ElementsLayer', () => {
  // Review Focus 5
  it('is never empty at 0 points (grass and a seedling exist)', () => {
    const { container } = render(<GardenScene state={make(0)} name="v" />);
    expect(count(container, 'grass')).toBe(4);
    expect(count(container, 'daisy')).toBe(0);
  });
  it('adds items as points grow', () => {
    const { container } = render(<GardenScene state={make(45)} name="v" />);
    expect(count(container, 'daisy')).toBe(3);
    expect(count(container, 'bench')).toBe(1);
    expect(count(container, 'sunflower')).toBe(2);
    expect(count(container, 'apple-tree')).toBe(0);
  });
  it('shows every item with its slots past the last unlock', () => {
    const { container } = render(<GardenScene state={make(600)} name="v" />);
    for (const item of GARDEN_ITEMS) expect(count(container, item.id)).toBe(item.slots.length);
  });
  it('draws instances back to front (non-decreasing y)', () => {
    const { container } = render(<GardenScene state={make(600)} name="v" />);
    const ys = [...container.querySelectorAll('[data-item]')].map((n) => Number(n.getAttribute('data-y')));
    expect(ys.length).toBeGreaterThan(10);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
  });
  it('records each instance growth so tests and styles can read it', () => {
    const { container } = render(<GardenScene state={make(80)} name="v" />);
    const apple = container.querySelector('[data-item="apple-tree"]')!;
    expect(Number(apple.getAttribute('data-growth'))).toBeCloseTo(0.25);
  });
});

describe('CreaturesLayer', () => {
  it('adds butterflies and birds by day, more with today progress', () => {
    const none = render(<GardenScene state={make(10)} name="v" />);
    expect(none.container.querySelectorAll('.butterfly')).toHaveLength(0);
    none.unmount();
    const mid = render(<GardenScene state={make(100)} name="v" />);
    expect(mid.container.querySelectorAll('.butterfly')).toHaveLength(2);
    expect(mid.container.querySelectorAll('.bird')).toHaveLength(1);
    expect(mid.container.querySelectorAll('.firefly')).toHaveLength(0);
    mid.unmount();
    const happy = render(<GardenScene state={make(100, { todayRatio: 0.5 })} name="v" />);
    expect(happy.container.querySelectorAll('.butterfly')).toHaveLength(4);
  });
  it('swaps butterflies and birds for fireflies at night', () => {
    const { container } = render(<GardenScene state={make(100, { now: new Date(2026, 9, 9, 22) })} name="v" />);
    expect(container.querySelectorAll('.butterfly')).toHaveLength(0);
    expect(container.querySelectorAll('.bird')).toHaveLength(0);
    expect(container.querySelectorAll('.firefly')).toHaveLength(6);
  });
  it('lets the wildlife rest on a rainy day', () => {
    const { container } = render(<GardenScene state={make(100, { dateKey: '2026-10-09' })} name="v" />);
    expect(container.querySelectorAll('.butterfly')).toHaveLength(0);
    expect(container.querySelectorAll('.bird')).toHaveLength(0);
  });
  it('keeps fish inside the pond only once it exists', () => {
    const early = render(<GardenScene state={make(99)} name="v" />);
    expect(early.container.querySelectorAll('.fish')).toHaveLength(0);
    early.unmount();
    const later = render(<GardenScene state={make(100)} name="v" />);
    expect(later.container.querySelectorAll('.fish')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/ui/garden-items.test.tsx`
Expected: FAIL (thiếu `ElementsLayer`).

- [ ] **Step 3: Tạo `src/ui/garden/items/Plants.tsx`**

```tsx
import type { CSSProperties } from 'react';

export interface ArtProps {
  growth: number;
  seed: number;
  fish?: number;
}

const sway = (seed: number, amp = 1.5): CSSProperties =>
  ({ '--delay': `${-(seed % 7) * 0.6}s`, '--amp': `${amp}deg` }) as CSSProperties;

const PETALS10 = Array.from({ length: 10 }, (_, i) => i * 36);
const PETALS14 = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);

export function Grass({ seed }: ArtProps) {
  return (
    <g className="sway" style={sway(seed)}>
      <path d="M-18 0 Q-16 -24 -8 -38 Q-8 -18 -4 0Z" fill="url(#leaf)" />
      <path d="M-6 0 Q-4 -30 2 -46 Q6 -22 6 0Z" fill="url(#leaf-dark)" />
      <path d="M4 0 Q8 -22 18 -34 Q14 -16 12 0Z" fill="url(#leaf)" />
      <path d="M12 0 Q18 -14 26 -20 Q22 -8 20 0Z" fill="url(#leaf-dark)" />
    </g>
  );
}

export function Daisy({ seed }: ArtProps) {
  return (
    <g className="sway" style={sway(seed, 2.5)}>
      <path d="M0 0 Q3 -18 0 -36" stroke="#3f9d5a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M1 -12 Q14 -22 20 -14 Q10 -8 1 -12Z" fill="url(#leaf)" />
      <g transform="translate(0 -40)">
        {PETALS10.map((a) => (
          <ellipse key={a} cx="0" cy="-10" rx="3.6" ry="9" fill="url(#petal)" stroke="#dfe7ee" strokeWidth="0.6" transform={`rotate(${a})`} />
        ))}
        <circle r="6" fill="url(#yellow)" />
      </g>
    </g>
  );
}

export function Tulip({ seed }: ArtProps) {
  return (
    <g className="sway" style={sway(seed, 2)}>
      <path d="M0 0 Q-2 -22 0 -40" stroke="#3f9d5a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M-1 -4 Q-20 -16 -18 -36 Q-6 -24 -1 -4Z" fill="url(#leaf)" />
      <path d="M1 -4 Q20 -14 19 -32 Q6 -22 1 -4Z" fill="url(#leaf-dark)" />
      <path d="M-10 -40 Q-12 -58 0 -64 Q12 -58 10 -40 Q0 -33 -10 -40Z" fill="url(#tulip)" />
      <path d="M0 -64 Q-3 -52 0 -38 Q3 -52 0 -64Z" fill="#ffffff" opacity="0.25" />
    </g>
  );
}

export function Sunflower({ seed }: ArtProps) {
  return (
    <g className="sway" style={sway(seed, 1.8)}>
      <path d="M0 0 Q4 -30 0 -62" stroke="#3a9657" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M1 -20 Q26 -34 34 -20 Q18 -10 1 -20Z" fill="url(#leaf)" />
      <path d="M-1 -34 Q-24 -48 -32 -34 Q-16 -24 -1 -34Z" fill="url(#leaf-dark)" />
      <g transform="translate(0 -70)">
        {PETALS14.map((a) => (
          <ellipse key={a} cx="0" cy="-17" rx="5" ry="12" fill="url(#yellow)" transform={`rotate(${a})`} />
        ))}
        <circle r="12" fill="#6d4a2f" />
        <circle r="7" fill="#4b3020" />
        <circle cx="-3" cy="-3" r="1.4" fill="#a67c52" />
        <circle cx="3" cy="2" r="1.4" fill="#a67c52" />
      </g>
    </g>
  );
}

export function AppleTree({ growth, seed }: ArtProps) {
  return (
    <g>
      <path d="M-8 0 Q-6 -30 -3 -52 L5 -52 Q8 -30 9 0Z" fill="url(#trunk)" />
      <g className="sway" style={sway(seed, 1)}>
        <circle cx="-26" cy="-70" r="28" fill="url(#leaf-dark)" />
        <circle cx="26" cy="-72" r="26" fill="url(#leaf-dark)" />
        <circle cx="0" cy="-88" r="34" fill="url(#leaf)" />
        <circle cx="-10" cy="-98" r="14" fill="#a6f0b4" opacity="0.45" />
        <g className="fruit" opacity={growth >= 1 ? 1 : 0}>
          <circle cx="-22" cy="-66" r="5" fill="url(#apple)" />
          <circle cx="20" cy="-70" r="5" fill="url(#apple)" />
          <circle cx="2" cy="-84" r="5" fill="url(#apple)" />
        </g>
      </g>
    </g>
  );
}

export function CherryTree({ growth, seed }: ArtProps) {
  return (
    <g>
      <path d="M-7 0 Q-5 -28 -2 -50 L5 -50 Q7 -28 8 0Z" fill="url(#trunk)" />
      <g className="sway" style={sway(seed, 1.2)}>
        <circle cx="-28" cy="-68" r="26" fill="url(#cherry)" />
        <circle cx="28" cy="-70" r="24" fill="url(#cherry)" />
        <circle cx="0" cy="-86" r="32" fill="url(#cherry)" />
        <circle cx="-10" cy="-96" r="13" fill="#ffffff" opacity="0.4" />
        <g opacity={growth >= 1 ? 1 : 0.0}>
          <circle cx="-30" cy="-60" r="2.4" fill="#fff" />
          <circle cx="24" cy="-58" r="2.4" fill="#fff" />
          <circle cx="6" cy="-100" r="2.4" fill="#fff" />
        </g>
      </g>
    </g>
  );
}
```

- [ ] **Step 4: Tạo `src/ui/garden/items/Decor.tsx`**

```tsx
import type { CSSProperties } from 'react';
import type { ArtProps } from './Plants';

export function Stone() {
  return (
    <g>
      <ellipse cx="0" cy="-8" rx="22" ry="13" fill="url(#stone)" />
      <ellipse cx="-14" cy="-4" rx="11" ry="7" fill="url(#stone)" />
      <ellipse cx="-6" cy="-13" rx="9" ry="4" fill="#ffffff" opacity="0.35" />
    </g>
  );
}

export function Bench() {
  return (
    <g>
      <rect x="-40" y="-26" width="80" height="6" rx="2" fill="url(#wood)" />
      <rect x="-40" y="-44" width="80" height="6" rx="2" fill="url(#wood)" />
      <rect x="-36" y="-44" width="5" height="40" fill="#6a452f" />
      <rect x="31" y="-44" width="5" height="40" fill="#6a452f" />
      <rect x="-36" y="-20" width="5" height="20" fill="#6a452f" />
      <rect x="31" y="-20" width="5" height="20" fill="#6a452f" />
    </g>
  );
}

export function Lantern() {
  return (
    <g>
      <rect x="-2" y="-64" width="4" height="64" rx="2" fill="#616161" />
      <circle className="lantern-glow" cy="-72" r="46" fill="url(#sun-glow)" />
      <rect x="-9" y="-86" width="18" height="22" rx="4" fill="#ffd45e" />
      <rect x="-11" y="-90" width="22" height="5" rx="2" fill="#424242" />
      <rect x="-11" y="-66" width="22" height="4" rx="2" fill="#424242" />
    </g>
  );
}

const fishStyle = (i: number): CSSProperties =>
  ({ '--delay': `${-i * 3.2}s`, '--rx': `${40 + i * 10}px`, '--ry': `${10 + i * 4}px` }) as CSSProperties;

export function Pond({ growth, fish = 0 }: ArtProps) {
  const level = 0.55 + 0.45 * growth;
  return (
    <g>
      <ellipse cx="0" cy="0" rx="118" ry="40" fill="#8a8f97" />
      <ellipse cx="0" cy="-3" rx="112" ry="36" fill="#b9c0c8" />
      <g transform={`scale(${level})`}>
        <ellipse cx="0" cy="-3" rx="106" ry="33" fill="url(#water)" />
        <ellipse cx="-30" cy="-12" rx="46" ry="8" fill="#ffffff" opacity="0.28" />
        <g className="ripple">
          <ellipse cx="30" cy="2" rx="22" ry="6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
        </g>
        {Array.from({ length: fish }, (_, i) => (
          <g key={i} className="fish" style={fishStyle(i)}>
            <ellipse cx="0" cy="0" rx="8" ry="3.2" fill="#ff9f5a" />
            <path d="M-7 0 L-13 -3.5 L-13 3.5Z" fill="#ff7a2e" />
          </g>
        ))}
        <ellipse cx="-56" cy="6" rx="14" ry="5" fill="#4aa862" />
        <ellipse cx="46" cy="-8" rx="12" ry="4.4" fill="#4aa862" />
        <circle cx="-56" cy="3" r="3.6" fill="#ffd6e3" />
      </g>
    </g>
  );
}

export function Bridge() {
  return (
    <g>
      <path d="M-124 0 Q0 -66 124 0" stroke="#8a5a36" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M-124 -4 Q0 -70 124 -4" stroke="#c68e5c" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M-106 -22 Q0 -86 106 -22" stroke="#6a452f" strokeWidth="3" fill="none" />
      {[-84, -42, 0, 42, 84].map((x) => (
        <rect key={x} x={x - 2} y={-60 + Math.abs(x) * 0.26} width="4" height="22" fill="#6a452f" />
      ))}
    </g>
  );
}
```

- [ ] **Step 5: Tạo `src/ui/garden/items/Creatures.tsx`**

```tsx
import type { CSSProperties } from 'react';

const V = (vars: Record<string, string>) => vars as unknown as CSSProperties;

const BUTTERFLY_PATHS = [
  { x: 250, y: 400, dx: [60, 120, 40], dy: [-40, 10, -30] },
  { x: 520, y: 450, dx: [-50, 40, -80], dy: [-30, -60, -20] },
  { x: 760, y: 380, dx: [40, -30, 70], dy: [-50, -10, -40] },
  { x: 390, y: 330, dx: [-60, 30, 80], dy: [-20, -50, -10] },
];
const BIRD_ROWS = [150, 110, 190];
const FIREFLIES = [
  { x: 220, y: 420 }, { x: 420, y: 470 }, { x: 640, y: 430 },
  { x: 820, y: 410 }, { x: 330, y: 380 }, { x: 740, y: 500 },
];

export function Butterfly({ index, hue }: { index: number; hue: number }) {
  const p = BUTTERFLY_PATHS[index % BUTTERFLY_PATHS.length];
  return (
    <g transform={`translate(${p.x} ${p.y})`}>
      <g
        className="butterfly"
        style={V({
          '--x1': `${p.dx[0]}px`, '--y1': `${p.dy[0]}px`, '--x2': `${p.dx[1]}px`, '--y2': `${p.dy[1]}px`,
          '--x3': `${p.dx[2]}px`, '--y3': `${p.dy[2]}px`, '--delay': `${-index * 3.1}s`,
        })}
      >
        <g className="wings">
          <ellipse cx="-6" cy="-2" rx="7" ry="5" fill={`hsl(${hue} 85% 65%)`} />
          <ellipse cx="6" cy="-2" rx="7" ry="5" fill={`hsl(${hue} 85% 65%)`} />
          <ellipse cx="-4" cy="4" rx="4.5" ry="3.5" fill={`hsl(${hue} 75% 55%)`} />
          <ellipse cx="4" cy="4" rx="4.5" ry="3.5" fill={`hsl(${hue} 75% 55%)`} />
        </g>
        <rect x="-0.8" y="-6" width="1.6" height="12" rx="0.8" fill="#4b3a2f" />
      </g>
    </g>
  );
}

export function Bird({ index }: { index: number }) {
  return (
    <g transform={`translate(0 ${BIRD_ROWS[index % BIRD_ROWS.length]})`}>
      <g className="bird" style={V({ '--delay': `${-index * 11}s`, '--dur': `${32 + index * 6}s` })}>
        <path d="M-10 0 Q-5 -7 0 0 Q5 -7 10 0" stroke="#34495e" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

export function Firefly({ index }: { index: number }) {
  const f = FIREFLIES[index % FIREFLIES.length];
  return (
    <g transform={`translate(${f.x} ${f.y})`}>
      <g className="firefly" style={V({ '--delay': `${-index * 1.7}s` })}>
        <circle r="9" fill="url(#sun-glow)" />
        <circle r="2.2" fill="#fff6c8" />
      </g>
    </g>
  );
}
```

- [ ] **Step 6: Tạo `src/ui/garden/items/index.ts`**

```ts
import type { ComponentType } from 'react';
import { Bench, Bridge, Lantern, Pond, Stone } from './Decor';
import { AppleTree, CherryTree, Daisy, Grass, Sunflower, Tulip, type ArtProps } from './Plants';

export type { ArtProps };

export const ITEM_ART: Record<string, { Art: ComponentType<ArtProps>; shadow: number; min: number }> = {
  grass: { Art: Grass, shadow: 22, min: 0.35 },
  daisy: { Art: Daisy, shadow: 12, min: 0.3 },
  stone: { Art: Stone, shadow: 26, min: 1 },
  tulip: { Art: Tulip, shadow: 12, min: 0.3 },
  sunflower: { Art: Sunflower, shadow: 20, min: 0.3 },
  bench: { Art: Bench, shadow: 44, min: 1 },
  'apple-tree': { Art: AppleTree, shadow: 50, min: 0.25 },
  lantern: { Art: Lantern, shadow: 12, min: 1 },
  pond: { Art: Pond, shadow: 0, min: 1 },
  'cherry-tree': { Art: CherryTree, shadow: 48, min: 0.25 },
  bridge: { Art: Bridge, shadow: 0, min: 1 },
};
```

- [ ] **Step 7: Tạo `src/ui/garden/layers/ElementsLayer.tsx`**

```tsx
import { getItem } from '../../../domain/growth';
import type { SceneState } from '../../../domain/scene';
import { Bird, Butterfly, Firefly } from '../items/Creatures';
import { ITEM_ART } from '../items';

export function depthScale(y: number): number {
  const t = Math.max(0, Math.min(1, (y - 330) / 270));
  return 0.7 + 0.6 * t;
}

export function ElementsLayer({ state }: { state: SceneState }) {
  const instances = state.items
    .flatMap((si) => {
      const def = getItem(si.id);
      const art = ITEM_ART[si.id];
      if (!def || !art) return [];
      return def.slots.map((slot, i) => ({ key: `${si.id}-${i}`, id: si.id, slot, growth: si.growth, i, art }));
    })
    .sort((a, b) => a.slot.y - b.slot.y);

  return (
    <g className="layer layer-elements" data-depth="1">
      {instances.map(({ key, id, slot, growth, i, art }) => {
        const k = art.min + (1 - art.min) * growth;
        return (
          <g key={key} transform={`translate(${slot.x} ${slot.y})`} data-item={id} data-y={slot.y} data-growth={growth}>
            <g transform={`scale(${depthScale(slot.y)})`}>
              {art.shadow > 0 && <ellipse className="shadow" cx="0" cy="2" rx={art.shadow} ry={art.shadow * 0.28} fill="url(#shadow)" />}
              <g className="grow" style={{ transform: `scale(${k})` }}>
                <art.Art growth={growth} seed={i + slot.x} fish={id === 'pond' ? state.creatures.fish : 0} />
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
}

export function CreaturesLayer({ state }: { state: SceneState }) {
  const butterflies = state.creatures.butterflies + state.extraButterflies;
  return (
    <g className="layer layer-creatures" data-depth="1.1">
      {Array.from({ length: state.creatures.birds }, (_, i) => <Bird key={`b${i}`} index={i} />)}
      {Array.from({ length: butterflies }, (_, i) => <Butterfly key={`f${i}`} index={i} hue={[330, 45, 200, 280][i % 4]} />)}
      {Array.from({ length: state.creatures.fireflies }, (_, i) => <Firefly key={`y${i}`} index={i} />)}
    </g>
  );
}
```

Ghi chú: cá (`.fish`) nằm trong `Pond` nên `fish` chỉ được truyền cho `pond`.

- [ ] **Step 8: Gắn vào `GardenScene.tsx` và thêm CSS nền**

Trong `GardenScene.tsx`, thêm `import { CreaturesLayer, ElementsLayer } from './layers/ElementsLayer';` và đặt hai lớp **trước** `<TintLayer />`:

```tsx
        <GroundLayer />
        <ElementsLayer state={state} />
        <CreaturesLayer state={state} />
        <TintLayer />
```

Thêm vào cuối `garden.css`:

```css
.grow { transform-origin: 0 0; transition: transform 1.2s cubic-bezier(0.22, 1, 0.36, 1); }
.calm .grow { transition-duration: 150ms; }
.lantern-glow { opacity: 0; transition: opacity 3s ease; }
.phase-dusk .lantern-glow, .phase-night .lantern-glow { opacity: 1; }
.firefly { opacity: 0; }
.phase-dusk .firefly, .phase-night .firefly { opacity: 1; }
```

- [ ] **Step 9: Chạy test và kiểm tra bằng mắt**

Run: `npx vitest run tests/ui && npx tsc --noEmit`
Expected: PASS.

Sau đó mở trang xem thử và chụp ảnh ở điểm 0, 45, 100, 190, 600 (giờ 12) và ở giờ 23 điểm 100. Tiêu chí: không phần tử nào chồng lên nhau hoặc nằm đè hồ; cây lớn che cây nhỏ đúng thứ tự gần-xa; bóng tiếp đất thấy rõ nhưng không đen; hồ, cầu và cá đọc được; ban đêm đèn lồng và đom đóm sáng. Chỉnh `slots` trong `src/domain/growth.ts` (giữ test "không xếp chồng" và "y ≥ 330" xanh) và kích thước trong các component cho tới khi bố cục đẹp; ghi chỉnh sửa vào ledger.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(garden): plants, decor, creatures, depth scaling and contact shadows"
```

---

### Task 6: Thời tiết, ánh sáng và tiền cảnh

**Files:**
- Create: `src/ui/garden/layers/WeatherLayer.tsx`, `src/ui/garden/layers/LightLayer.tsx`, `src/ui/garden/layers/ForegroundLayer.tsx`, `tests/ui/garden-weather.test.tsx`
- Modify: `src/ui/garden/Defs.tsx`, `src/ui/garden/GardenScene.tsx`, `src/ui/garden/layers/ElementsLayer.tsx`, `src/ui/garden/items/Decor.tsx`, `src/ui/garden/garden.css`

**Interfaces:**
- Consumes: `SceneState`, `getItem`, `depthScale`, `Firefly`.
- Produces:
  - `WeatherLayer({ state })` — `.raindrop` × 28 chỉ khi `weather === 'rain'` và không `calm`; `.mist` × 3 khi `weather === 'mist'` (cả khi `calm`, đứng yên)
  - `ForegroundLayer({ state })` — `.fg-blade` × 14 luôn có; `.fg-bloom` × `state.bloom * 4`
  - `LightLayer({ state })` — `.sun-rays` (7 `.ray`, khi là mặt trời và không mưa), `.warm` (ấm theo `--sun`), `.lantern-halo` (một vòng cho mỗi đèn lồng đã mở), `.firefly` (chuyển từ lớp sinh vật sang đây để không bị lớp tối đêm làm mờ), `.rainbow[data-visible]`
  - Thứ tự lớp trong `<svg>`: Sky, Clouds, FarHills, NearHills, Ground, Elements, Creatures (bướm, chim), Weather, Foreground, Tint, Light

- [ ] **Step 1: Viết test thất bại** `tests/ui/garden-weather.test.tsx`

```tsx
import { render } from '@testing-library/react';
import { sceneState, type Weather } from '../../src/domain/scene';
import { GardenScene } from '../../src/ui/garden/GardenScene';

const make = (over: Partial<Parameters<typeof sceneState>[0]> = {}, weather?: Weather) => {
  const s = sceneState({ peakPoints: 0, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects: 'full', ...over });
  return weather ? { ...s, weather } : s;
};
const q = (c: HTMLElement, sel: string) => c.querySelectorAll(sel).length;

describe('WeatherLayer', () => {
  it('draws exactly 28 raindrops in the rain, and none otherwise', () => {
    expect(q(render(<GardenScene state={make({}, 'rain')} name="v" />).container, '.raindrop')).toBe(28);
    expect(q(render(<GardenScene state={make({}, 'clear')} name="v" />).container, '.raindrop')).toBe(0);
  });
  // Review Focus 4
  it('draws no rain in calm mode even on a rainy day', () => {
    expect(q(render(<GardenScene state={make({ effects: 'calm' }, 'rain')} name="v" />).container, '.raindrop')).toBe(0);
  });
  it('draws three mist banks on misty mornings, also in calm mode', () => {
    const full = render(<GardenScene state={make({ now: new Date(2026, 9, 9, 6) }, 'mist')} name="v" />);
    expect(q(full.container, '.mist')).toBe(3);
    full.unmount();
    const calm = render(<GardenScene state={make({ now: new Date(2026, 9, 9, 6), effects: 'calm' }, 'mist')} name="v" />);
    expect(q(calm.container, '.mist')).toBe(3);
  });
});

describe('LightLayer', () => {
  it('shows sun rays by day unless it rains, never at night', () => {
    expect(q(render(<GardenScene state={make({}, 'clear')} name="v" />).container, '.ray')).toBe(7);
    expect(q(render(<GardenScene state={make({}, 'rain')} name="v" />).container, '.ray')).toBe(0);
    expect(q(render(<GardenScene state={make({ now: new Date(2026, 9, 9, 23) }, 'clear')} name="v" />).container, '.ray')).toBe(0);
  });
  it('keeps the rainbow element but only marks it visible when every task is done', () => {
    const hidden = render(<GardenScene state={make({ todayRatio: 0.5 })} name="v" />);
    expect(hidden.container.querySelector('.rainbow')).toHaveAttribute('data-visible', 'false');
    hidden.unmount();
    const shown = render(<GardenScene state={make({ todayRatio: 1 })} name="v" />);
    expect(shown.container.querySelector('.rainbow')).toHaveAttribute('data-visible', 'true');
    expect(q(shown.container, '.rainbow .arc')).toBe(7);
  });
  it('puts a halo on each lantern only once lanterns exist', () => {
    expect(q(render(<GardenScene state={make({ peakPoints: 69 })} name="v" />).container, '.lantern-halo')).toBe(0);
    expect(q(render(<GardenScene state={make({ peakPoints: 70 })} name="v" />).container, '.lantern-halo')).toBe(1);
  });
  it('renders fireflies in the light layer, above the night tint', () => {
    const { container } = render(<GardenScene state={make({ peakPoints: 100, now: new Date(2026, 9, 9, 22) })} name="v" />);
    expect(q(container, '.layer-light .firefly')).toBe(6);
    expect(q(container, '.layer-creatures .firefly')).toBe(0);
  });
});

describe('ForegroundLayer', () => {
  it('always has grass blades and adds 4 flowers per bloom level', () => {
    expect(q(render(<GardenScene state={make()} name="v" />).container, '.fg-blade')).toBe(14);
    expect(q(render(<GardenScene state={make()} name="v" />).container, '.fg-bloom')).toBe(0);
    expect(q(render(<GardenScene state={make({ peakPoints: 340 })} name="v" />).container, '.fg-bloom')).toBe(12);
    expect(q(render(<GardenScene state={make({ peakPoints: 5000 })} name="v" />).container, '.fg-bloom')).toBe(24);
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/ui/garden-weather.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Thêm gradient `mist` và `ray` vào `Defs.tsx`**

Thêm hai dòng trước `</defs>`:

```tsx
      <Radial id="mist" pairs={[[0, '#ffffff', 0.55], [1, '#ffffff', 0]]} />
      <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0.5" />
      </linearGradient>
```

- [ ] **Step 4: Tạo `src/ui/garden/layers/WeatherLayer.tsx`**

```tsx
import type { CSSProperties } from 'react';
import { hashSeed, rng } from '../../../domain/suggest';
import type { SceneState } from '../../../domain/scene';

const DROPS = (() => {
  const r = rng(hashSeed('rain'));
  return Array.from({ length: 28 }, () => ({ x: r() * 1060 - 30, delay: r() * 1.2, dur: 0.9 + r() * 0.5 }));
})();

const MIST = [
  { x: 200, y: 430, rx: 340, ry: 46, delay: 0 },
  { x: 620, y: 470, rx: 380, ry: 52, delay: 7 },
  { x: 880, y: 410, rx: 300, ry: 40, delay: 13 },
];

export function WeatherLayer({ state }: { state: SceneState }) {
  const raining = state.weather === 'rain' && !state.calm;
  return (
    <g className="layer layer-weather" data-depth="1.15">
      {state.weather === 'mist' &&
        MIST.map((m, i) => (
          <g key={i} className="mist" style={{ '--delay': `${-m.delay}s` } as CSSProperties}>
            <ellipse cx={m.x} cy={m.y} rx={m.rx} ry={m.ry} fill="url(#mist)" />
          </g>
        ))}
      {raining &&
        DROPS.map((d, i) => (
          <line
            key={i}
            className="raindrop"
            x1={d.x} y1="0" x2={d.x - 5} y2="18"
            stroke="#d6e9ff" strokeWidth="1.4" strokeLinecap="round" opacity="0.7"
            style={{ '--delay': `${-d.delay}s`, '--dur': `${d.dur}s` } as CSSProperties}
          />
        ))}
    </g>
  );
}
```

- [ ] **Step 5: Tạo `src/ui/garden/layers/ForegroundLayer.tsx`**

```tsx
import type { CSSProperties } from 'react';
import { hashSeed, rng } from '../../../domain/suggest';
import type { SceneState } from '../../../domain/scene';

const BLADES = (() => {
  const r = rng(hashSeed('blades'));
  return Array.from({ length: 14 }, (_, i) => ({ x: (i + r() * 0.8) * 72, h: 34 + r() * 30, w: 7 + r() * 5, d: r() * 4 }));
})();

const BLOOMS = (() => {
  const r = rng(hashSeed('bloom'));
  const hues = [330, 45, 280, 200, 12, 160];
  return Array.from({ length: 24 }, (_, i) => ({ x: r() * 1000, y: 565 + r() * 30, hue: hues[i % hues.length], d: r() * 4 }));
})();

export function ForegroundLayer({ state }: { state: SceneState }) {
  return (
    <g className="layer layer-foreground" data-depth="1.4">
      {BLADES.map((b, i) => (
        <path
          key={i}
          className="fg-blade sway"
          d={`M${b.x} 606 Q${b.x + b.w * 0.3} ${606 - b.h * 0.6} ${b.x + b.w} ${606 - b.h} Q${b.x + b.w * 0.9} ${606 - b.h * 0.4} ${b.x + b.w * 1.4} 606Z`}
          fill={i % 2 ? 'url(#leaf-dark)' : 'url(#leaf)'}
          style={{ '--delay': `${-b.d}s`, '--amp': '2.2deg', transformOrigin: `${b.x}px 606px` } as CSSProperties}
        />
      ))}
      {BLOOMS.slice(0, state.bloom * 4).map((f, i) => (
        <g key={i} className="fg-bloom" transform={`translate(${f.x} ${f.y})`}>
          <path d="M0 0 L0 -16" stroke="#2f8a4f" strokeWidth="2" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-22" rx="3.4" ry="6" fill={`hsl(${f.hue} 85% 68%)`} transform={`rotate(${a} 0 -16)`} />
          ))}
          <circle cx="0" cy="-16" r="2.6" fill="#ffe680" />
        </g>
      ))}
    </g>
  );
}
```

Ghi chú: `.fg-blade.sway` đặt `transformOrigin` riêng theo gốc của từng ngọn cỏ vì chúng nằm trực tiếp trong hệ toạ độ của khung, không trong nhóm đã dịch gốc.

- [ ] **Step 6: Tạo `src/ui/garden/layers/LightLayer.tsx`**

```tsx
import { getItem } from '../../../domain/growth';
import type { SceneState } from '../../../domain/scene';
import { Firefly } from '../items/Creatures';
import { depthScale } from './ElementsLayer';

const RAINBOW = ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#748ffc', '#b197fc'];
const RAYS = [-62, -42, -22, -4, 14, 34, 54];

export function LightLayer({ state }: { state: SceneState }) {
  const { body, t } = state.sky;
  const sx = 90 + 820 * t;
  const sy = 300 - 210 * Math.sin(Math.PI * t);
  const showRays = body === 'sun' && state.weather !== 'rain';
  const lanterns = state.items.some((i) => i.id === 'lantern') ? getItem('lantern')!.slots : [];

  return (
    <g className="layer layer-light" data-depth="1.2">
      <rect className="warm" x="-40" y="-40" width="1080" height="680" fill="#ffd9a0" />
      {showRays && (
        <g transform={`translate(${sx} ${sy})`}>
          <g className="sun-rays">
            {RAYS.map((a) => (
              <polygon key={a} className="ray" points="0,0 -16,-340 16,-340" fill="url(#ray)" transform={`rotate(${a})`} />
            ))}
          </g>
        </g>
      )}
      {lanterns.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y - 76 * depthScale(s.y)})`}>
          <circle className="lantern-halo" r={52 * depthScale(s.y)} fill="url(#sun-glow)" />
        </g>
      ))}
      {Array.from({ length: state.creatures.fireflies }, (_, i) => <Firefly key={i} index={i} />)}
      <g className="rainbow" data-visible={state.rainbow}>
        {RAINBOW.map((c, i) => {
          const r = 360 - i * 12;
          return <path key={c} className="arc" d={`M${500 - r} 440 A${r} ${r} 0 0 1 ${500 + r} 440`} stroke={c} strokeWidth="10" fill="none" />;
        })}
      </g>
    </g>
  );
}
```

- [ ] **Step 7: Cập nhật `ElementsLayer.tsx`, `Decor.tsx`, `GardenScene.tsx`**

`ElementsLayer.tsx`: trong `CreaturesLayer` xóa dòng tạo `Firefly` và import `Firefly`; `CreaturesLayer` chỉ còn chim và bướm. Thêm `className="layer-creatures"` đã có sẵn trên `<g>`.

`Decor.tsx` (`Lantern`): xóa dòng `<circle className="lantern-glow" ... />` (quầng sáng chuyển sang `LightLayer`).

`GardenScene.tsx`: thêm import `WeatherLayer`, `ForegroundLayer`, `LightLayer` và sắp lại thứ tự lớp:

```tsx
        <GroundLayer />
        <ElementsLayer state={state} />
        <CreaturesLayer state={state} />
        <WeatherLayer state={state} />
        <ForegroundLayer state={state} />
        <TintLayer />
        <LightLayer state={state} />
```

`garden.css` thêm:

```css
.warm { opacity: 0; fill-opacity: 1; }
.phase-dawn .warm, .phase-day .warm, .phase-dusk .warm { opacity: calc(var(--sun, 0.4) * 0.14); }
.ray { opacity: calc(var(--sun, 0.4) * 0.5); }
.rainbow { opacity: 0; transition: opacity 1.6s ease; }
.rainbow[data-visible='true'] { opacity: 0.5; }
.lantern-halo { opacity: 0; transition: opacity 3s ease; }
.phase-dusk .lantern-halo, .phase-night .lantern-halo { opacity: 1; }
```
và xóa các quy tắc `.lantern-glow` và `.firefly { opacity: 0 }` tạm ở Task 5, thay bằng:

```css
.firefly { opacity: 0; }
.phase-dusk .firefly, .phase-night .firefly { opacity: 1; }
```

- [ ] **Step 8: Chạy test và kiểm tra bằng mắt**

Run: `npx vitest run tests/ui && npx tsc --noEmit`
Expected: PASS (bao gồm `garden-items.test.tsx` vẫn xanh: đếm `.firefly` toàn cảnh vẫn là 6).

Mở trang xem thử, chụp: mưa (giờ 10), sương (giờ 6), hoàng hôn (giờ 18), đêm (giờ 23, điểm 100), tiến độ 100 % (cầu vồng), điểm 340 (hoa tiền cảnh). Tiêu chí: mưa không che khuất phần tử; sương mềm, không như khối trắng; tia nắng nhẹ, không chói; cầu vồng nằm sau cây gần nhưng trên đồi; hoa tiền cảnh không che mất phần tử chính. Chỉnh màu/độ mờ cho tới khi đạt; ghi ledger.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(garden): weather, light, rainbow and foreground bloom layers"
```

---

### Task 7: Chuyển động nền, giảm chuyển động và tạm dừng ngoài tầm nhìn

**Files:**
- Create: `src/ui/garden/useSceneClock.ts`, `src/ui/garden/useAmbientPause.ts`, `tests/ui/garden-motion.test.tsx`
- Modify: `src/ui/garden/GardenScene.tsx`, `src/ui/garden/garden.css`

**Interfaces:**
- Produces:
  - `useSceneClock(intervalMs = 60_000): Date` — cập nhật theo chu kỳ và khi tab hiện lại
  - `useAmbientPause(ref: RefObject<Element>): boolean` — `true` khi `document.hidden` hoặc phần tử ngoài khung nhìn
  - `GardenScene` đặt `data-paused="true|false"` trên `.garden-scene`
  - CSS: token thời lượng/easing; `@keyframes` chỉ dùng `transform`/`opacity`; `.calm *` tắt animation; `@media (prefers-reduced-motion: reduce)` làm tương tự; `[data-paused='true'] *` tạm dừng

- [ ] **Step 1: Viết test thất bại** `tests/ui/garden-motion.test.tsx`

```tsx
import { act, render, renderHook, screen } from '@testing-library/react';
import { sceneState } from '../../src/domain/scene';
import css from '../../src/ui/garden/garden.css?raw';
import { GardenScene } from '../../src/ui/garden/GardenScene';
import { useSceneClock } from '../../src/ui/garden/useSceneClock';

const make = () =>
  sceneState({ peakPoints: 100, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects: 'full' });

function keyframeBlocks(source: string): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 1;
    let i = re.lastIndex;
    while (depth > 0 && i < source.length) {
      if (source[i] === '{') depth += 1;
      if (source[i] === '}') depth -= 1;
      i += 1;
    }
    out.push({ name: m[1], body: source.slice(re.lastIndex, i - 1) });
  }
  return out;
}

describe('CSS motion rules', () => {
  it('has at least the core ambient keyframes', () => {
    const names = keyframeBlocks(css).map((b) => b.name);
    for (const n of ['sway', 'drift', 'flutter', 'flap', 'fly', 'circle', 'glow', 'rain', 'mist-drift', 'spin', 'breathe']) {
      expect(names).toContain(n);
    }
  });
  it('animates only transform and opacity inside keyframes', () => {
    for (const { name, body } of keyframeBlocks(css)) {
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]);
      const bad = props.filter((p) => !['transform', 'opacity'].includes(p));
      expect({ name, bad }).toEqual({ name, bad: [] });
    }
  });
  // Review Focus 4
  it('switches all animation off in calm mode and under prefers-reduced-motion', () => {
    expect(css).toMatch(/\.calm\s+\*[^{]*\{[^}]*animation:\s*none/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
  it('pauses everything when the scene is paused', () => {
    expect(css).toMatch(/\[data-paused='true'\]\s+\*[^{]*\{[^}]*animation-play-state:\s*paused/);
  });
});

describe('useSceneClock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // Review Focus 3
  it('ticks with the wall clock so the sky can change while the app stays open', () => {
    vi.setSystemTime(new Date(2026, 9, 9, 16, 59, 30));
    const { result } = renderHook(() => useSceneClock(60_000));
    expect(result.current.getHours()).toBe(16);
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.getHours()).toBe(17);
  });
  it('refreshes immediately when the tab becomes visible again', () => {
    vi.setSystemTime(new Date(2026, 9, 9, 10, 0, 0));
    const { result } = renderHook(() => useSceneClock(60_000));
    vi.setSystemTime(new Date(2026, 9, 9, 19, 5, 0));
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.getHours()).toBe(19);
  });
});

describe('ambient pause', () => {
  afterEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    vi.unstubAllGlobals();
  });

  it('is running by default', () => {
    render(<GardenScene state={make()} name="v" />);
    expect(screen.getByTestId('garden-scene')).toHaveAttribute('data-paused', 'false');
  });
  it('pauses while the tab is hidden and resumes when it returns', () => {
    render(<GardenScene state={make()} name="v" />);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByTestId('garden-scene')).toHaveAttribute('data-paused', 'true');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByTestId('garden-scene')).toHaveAttribute('data-paused', 'false');
  });
  it('pauses while scrolled out of view', () => {
    let notify: (entries: { isIntersecting: boolean }[]) => void = () => {};
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: (e: { isIntersecting: boolean }[]) => void) { notify = cb; }
      observe() {}
      disconnect() {}
    });
    render(<GardenScene state={make()} name="v" />);
    act(() => notify([{ isIntersecting: false }]));
    expect(screen.getByTestId('garden-scene')).toHaveAttribute('data-paused', 'true');
    act(() => notify([{ isIntersecting: true }]));
    expect(screen.getByTestId('garden-scene')).toHaveAttribute('data-paused', 'false');
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/ui/garden-motion.test.tsx`
Expected: FAIL (thiếu hook và keyframes).

- [ ] **Step 3: Tạo `src/ui/garden/useSceneClock.ts`**

```ts
import { useEffect, useState } from 'react';

export function useSceneClock(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
  return now;
}
```

- [ ] **Step 4: Tạo `src/ui/garden/useAmbientPause.ts`**

```ts
import { useEffect, useState, type RefObject } from 'react';

export function useAmbientPause(ref: RefObject<Element>): boolean {
  const [hidden, setHidden] = useState(() => document.hidden);
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last) setOffscreen(!last.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  return hidden || offscreen;
}
```

- [ ] **Step 5: Gắn vào `GardenScene.tsx`**

Thêm `useRef`, `useAmbientPause`, và đổi phần mở đầu component:

```tsx
import { useRef, type CSSProperties } from 'react';
import { useAmbientPause } from './useAmbientPause';
// ...
export function GardenScene({ state, name }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useAmbientPause(ref);
  const cls = ['garden-scene', `phase-${state.phase}`, `weather-${state.weather}`, state.calm ? 'calm' : ''].join(' ').trim();
  return (
    <div
      ref={ref}
      className={cls}
      role="img"
      aria-label={describeScene(state, name)}
      data-testid="garden-scene"
      data-paused={paused}
      style={{ '--sun': state.sunIntensity } as CSSProperties}
    >
```
(giữ nguyên phần `<svg>` bên trong).

- [ ] **Step 6: Thêm chuyển động vào cuối `garden.css`**

```css
/* ----- Chuyển động nền: chỉ transform và opacity ----- */
.garden-scene {
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-sway: 4s;
}
@keyframes sway {
  0%, 100% { transform: rotate(calc(var(--amp, 1.5) * -1)); }
  50% { transform: rotate(var(--amp, 1.5)); }
}
@keyframes drift {
  from { transform: translateX(-160px); }
  to { transform: translateX(1160px); }
}
@keyframes flutter {
  0% { transform: translate(0, 0); }
  25% { transform: translate(var(--x1), var(--y1)); }
  50% { transform: translate(var(--x2), var(--y2)); }
  75% { transform: translate(var(--x3), var(--y3)); }
  100% { transform: translate(0, 0); }
}
@keyframes flap {
  from { transform: scaleX(1); }
  to { transform: scaleX(0.35); }
}
@keyframes fly {
  from { transform: translateX(-60px); }
  to { transform: translateX(1060px); }
}
@keyframes circle {
  0%, 100% { transform: translate(var(--rx, 40px), 0); }
  25% { transform: translate(0, var(--ry, 12px)); }
  50% { transform: translate(calc(var(--rx, 40px) * -1), 0); }
  75% { transform: translate(0, calc(var(--ry, 12px) * -1)); }
}
@keyframes glow {
  0%, 100% { opacity: 0.2; transform: translate(0, 0); }
  50% { opacity: 1; transform: translate(14px, -10px); }
}
@keyframes rain {
  from { transform: translate(0, -40px); }
  to { transform: translate(-30px, 640px); }
}
@keyframes mist-drift {
  from { transform: translateX(-30px); }
  to { transform: translateX(30px); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes twinkle {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}

.sway { transform-origin: 0 0; animation: sway var(--dur-sway) ease-in-out infinite; animation-delay: var(--delay, 0s); }
.cloud-drift { animation: drift var(--dur, 110s) linear infinite; animation-delay: var(--delay, 0s); }
.butterfly { animation: flutter 16s ease-in-out infinite; animation-delay: var(--delay, 0s); }
.wings { transform-origin: 0 0; animation: flap 0.35s ease-in-out infinite alternate; }
.bird { animation: fly var(--dur, 34s) linear infinite; animation-delay: var(--delay, 0s); }
.fish { animation: circle var(--dur, 12s) ease-in-out infinite; animation-delay: var(--delay, 0s); }
.firefly { animation: glow 5s ease-in-out infinite; animation-delay: var(--delay, 0s); }
.raindrop { animation: rain var(--dur, 1.1s) linear infinite; animation-delay: var(--delay, 0s); }
.mist { animation: mist-drift 20s ease-in-out infinite alternate; animation-delay: var(--delay, 0s); }
.sun-rays { animation: spin 90s linear infinite; }
.lantern-halo, .sun > circle:first-child { transform-origin: 0 0; animation: breathe 8s ease-in-out infinite; }
.star { animation: twinkle 4s ease-in-out infinite; animation-delay: var(--delay, 0s); }

/* Giảm chuyển động: chế độ Nhẹ và cài đặt hệ thống */
.calm * { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  .garden-scene * { animation: none !important; transition-duration: 150ms !important; }
}
/* Tạm dừng khi tab ẩn hoặc cảnh ngoài khung nhìn */
.garden-scene[data-paused='true'] * { animation-play-state: paused !important; }
```

- [ ] **Step 7: Chạy test**

Run: `npx vitest run tests/ui/garden-motion.test.tsx && npx vitest run && npx tsc --noEmit`
Expected: PASS toàn bộ.

- [ ] **Step 8: Kiểm tra chuyển động bằng mắt và đo khung hình**

Mở trang xem thử trong Chrome (điểm 190, giờ 12, mưa). Ghi nhận bằng `javascript_tool`: đo `requestAnimationFrame` trong 3 giây và in số khung hình/giây trung bình; mục tiêu ≥ 55 fps. Ghi lại giá trị đo vào ledger. Kiểm tra bằng mắt: cỏ và lá đung đưa tự nhiên (không đồng bộ), mây trôi chậm, bướm bay đường cong, cá bơi vòng trong hồ, không có phần tử "giật" khi vòng lặp quay lại.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(garden): ambient motion with calm mode, reduced-motion and offscreen pause"
```

---

### Task 8: Phản ứng khi hoàn thành nhiệm vụ và khi mở khóa

**Files:**
- Create: `src/ui/garden/layers/WaterBurst.tsx`, `tests/ui/garden-reactive.test.tsx`
- Modify: `src/ui/garden/GardenScene.tsx`, `src/ui/garden/layers/ElementsLayer.tsx`, `src/ui/garden/garden.css`

**Interfaces:**
- Consumes: `wateredTick` (prop có sẵn nhưng chưa dùng).
- Produces:
  - `GardenScene` nhận thêm `justUnlocked?: string[]` (id món vừa mở)
  - Khi `wateredTick > 0` và không `calm`: `.water-burst` (5 `.drop`) được gắn lại mỗi lần tick đổi; lớp phần tử có `pulse-a` hoặc `pulse-b` luân phiên theo độ chẵn lẻ để khởi động lại animation "nhún"
  - Món trong `justUnlocked` có lớp `unlock-pop` và kèm `.unlock-ring` (không có khi `calm`)

- [ ] **Step 1: Viết test thất bại** `tests/ui/garden-reactive.test.tsx`

```tsx
import { render } from '@testing-library/react';
import { sceneState } from '../../src/domain/scene';
import css from '../../src/ui/garden/garden.css?raw';
import { GardenScene } from '../../src/ui/garden/GardenScene';

const make = (over: Partial<Parameters<typeof sceneState>[0]> = {}) =>
  sceneState({ peakPoints: 50, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects: 'full', ...over });

describe('watering burst', () => {
  it('does nothing before the first completed task', () => {
    const { container } = render(<GardenScene state={make()} name="v" wateredTick={0} />);
    expect(container.querySelector('.water-burst')).toBeNull();
  });
  it('shows five droplets after a completion and restarts on the next one', () => {
    const { container, rerender } = render(<GardenScene state={make()} name="v" wateredTick={1} />);
    expect(container.querySelectorAll('.water-burst .drop')).toHaveLength(5);
    const first = container.querySelector('.layer-elements')!.getAttribute('class');
    rerender(<GardenScene state={make()} name="v" wateredTick={2} />);
    const second = container.querySelector('.layer-elements')!.getAttribute('class');
    expect(first).toContain('pulse-b');
    expect(second).toContain('pulse-a');
  });
  // Review Focus 4
  it('stays still in calm mode', () => {
    const { container } = render(<GardenScene state={make({ effects: 'calm' })} name="v" wateredTick={3} />);
    expect(container.querySelector('.water-burst')).toBeNull();
    expect(container.querySelector('.layer-elements')!.getAttribute('class')).not.toMatch(/pulse-/);
  });
  it('defines both nudge animations and a drop animation with only transform/opacity', () => {
    expect(css).toMatch(/@keyframes\s+nudge-a/);
    expect(css).toMatch(/@keyframes\s+nudge-b/);
    expect(css).toMatch(/@keyframes\s+drop/);
    expect(css).toMatch(/@keyframes\s+pop/);
  });
});

describe('unlock celebration', () => {
  it('pops the freshly unlocked items and rings them', () => {
    const { container } = render(<GardenScene state={make()} name="v" justUnlocked={['sunflower']} />);
    const sunflowers = container.querySelectorAll('[data-item="sunflower"]');
    expect(sunflowers.length).toBeGreaterThan(0);
    sunflowers.forEach((n) => {
      expect(n.querySelector('.unlock-pop')).not.toBeNull();
      expect(n.querySelector('.unlock-ring')).not.toBeNull();
    });
    expect(container.querySelector('[data-item="daisy"] .unlock-pop')).toBeNull();
  });
  it('skips the celebration in calm mode', () => {
    const { container } = render(<GardenScene state={make({ effects: 'calm' })} name="v" justUnlocked={['sunflower']} />);
    expect(container.querySelector('.unlock-pop')).toBeNull();
    expect(container.querySelector('.unlock-ring')).toBeNull();
  });
  it('ignores ids that are not in the scene', () => {
    const { container } = render(<GardenScene state={make({ peakPoints: 0 })} name="v" justUnlocked={['bridge']} />);
    expect(container.querySelector('.unlock-pop')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/ui/garden-reactive.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Tạo `src/ui/garden/layers/WaterBurst.tsx`**

```tsx
import type { CSSProperties } from 'react';

const DROPS = [
  { x: 380, d: 0 }, { x: 470, d: 0.08 }, { x: 560, d: 0.16 }, { x: 650, d: 0.05 }, { x: 740, d: 0.12 },
];

export function WaterBurst({ tick }: { tick: number }) {
  return (
    <g key={tick} className="water-burst" aria-hidden="true">
      {DROPS.map((d, i) => (
        <g key={i} transform={`translate(${d.x} 300)`}>
          <g className="drop" style={{ '--delay': `${d.d}s`, '--dx': `${(i - 2) * 14}px` } as CSSProperties}>
            <path d="M0 -9 Q6 0 0 7 Q-6 0 0 -9Z" fill="#9fdcff" opacity="0.9" />
          </g>
        </g>
      ))}
    </g>
  );
}
```
(`key={tick}` trên phần tử gốc chỉ có tác dụng khi component cha thay nó; trong `GardenScene` gắn bằng `<WaterBurst key={wateredTick} tick={wateredTick} />` để buộc gắn lại.)

- [ ] **Step 4: Cập nhật `GardenScene.tsx` và `ElementsLayer.tsx`**

`GardenScene.tsx`: thêm `justUnlocked?: string[]` vào `Props`, nhận `wateredTick = 0` và `justUnlocked = []` trong chữ ký hàm, import `WaterBurst`, và:

```tsx
        <ElementsLayer state={state} tick={state.calm ? 0 : wateredTick} justUnlocked={state.calm ? [] : justUnlocked} />
        ...
        <ForegroundLayer state={state} />
        {wateredTick > 0 && !state.calm && <WaterBurst key={wateredTick} tick={wateredTick} />}
        <TintLayer />
```

`ElementsLayer.tsx`: đổi chữ ký thành `ElementsLayer({ state, tick = 0, justUnlocked = [] }: { state: SceneState; tick?: number; justUnlocked?: string[] })`; đặt lớp cho `<g className="layer layer-elements">` thành:

```tsx
    <g className={`layer layer-elements${tick > 0 ? (tick % 2 === 1 ? ' pulse-b' : ' pulse-a') : ''}`} data-depth="1">
```
(tick lẻ → `pulse-b`, chẵn → `pulse-a`), bọc `<art.Art .../>` trong:

```tsx
                <g className={`nudge${justUnlocked.includes(id) ? ' unlock-pop' : ''}`}>
                  <art.Art growth={growth} seed={i + slot.x} fish={id === 'pond' ? state.creatures.fish : 0} />
                </g>
                {justUnlocked.includes(id) && <ellipse className="unlock-ring" cx="0" cy="0" rx="46" ry="14" fill="none" stroke="#ffe680" strokeWidth="3" />}
```

- [ ] **Step 5: Thêm vào cuối `garden.css`**

```css
/* ----- Phản ứng một lần ----- */
@keyframes nudge-a {
  0% { transform: scale(1); }
  40% { transform: scale(1.06); }
  100% { transform: scale(1); }
}
@keyframes nudge-b {
  0% { transform: scale(1); }
  40% { transform: scale(1.06); }
  100% { transform: scale(1); }
}
@keyframes drop {
  0% { opacity: 0; transform: translate(0, 0); }
  15% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--dx, 0), 190px); }
}
@keyframes pop {
  0% { transform: scale(0.2); opacity: 0; }
  60% { transform: scale(1.12); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes ring {
  0% { opacity: 0.9; transform: scale(0.4); }
  100% { opacity: 0; transform: scale(1.8); }
}
.nudge { transform-origin: 0 0; }
.pulse-a .nudge { animation: nudge-a 0.42s cubic-bezier(0.34, 1.56, 0.64, 1); }
.pulse-b .nudge { animation: nudge-b 0.42s cubic-bezier(0.34, 1.56, 0.64, 1); }
.drop { animation: drop 0.9s ease-in forwards; animation-delay: var(--delay, 0s); opacity: 0; }
.unlock-pop { animation: pop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.unlock-ring { transform-origin: 0 0; animation: ring 1s ease-out both; }
```
(`.calm *` đã tắt mọi animation; `.pulse-*` và hiệu ứng mở khóa còn bị chặn thêm từ phía React khi `calm`.)

- [ ] **Step 6: Chạy test**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS toàn bộ (kể cả `garden-motion` kiểm tra mọi keyframes chỉ dùng transform/opacity).

- [ ] **Step 7: Kiểm tra bằng mắt**

Trên trang xem thử thêm nút tạm "Tưới" (chỉ trong `Preview.tsx`, tăng `wateredTick` cục bộ) và ô "Vừa mở khóa" (id phân tách bằng dấu phẩy). Bấm "Tưới" vài lần liên tiếp: giọt rơi mượt, cây nhún nhẹ, hiệu ứng khởi động lại mỗi lần. Nhập `sunflower`: món bung ra có vòng sáng. Chụp và ghi ledger.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(garden): watering burst, plant nudge and unlock pop with calm fallbacks"
```

---

### Task 9: Tích hợp vào Hôm nay, Khu vườn và Cài đặt

**Files:**
- Create: `src/ui/garden/useGardenScene.ts`, `src/ui/garden/ConnectedGarden.tsx`, `tests/ui/garden-integration.test.tsx`
- Modify: `src/ui/garden/GardenScene.tsx`, `src/ui/garden/garden.css`, `src/ui/Today.tsx`, `src/ui/GardenScreen.tsx`, `src/ui/SettingsScreen.tsx`

**Interfaces:**
- Consumes: `useStore`, `useSceneClock`, `sceneState`, `todayRatio`, `resolveEffects`, `GARDEN_ITEMS`, `GardenScene`.
- Produces:
  - `usePrefersReducedMotion(): boolean` (an toàn khi không có `matchMedia`)
  - `useGardenScene(): { state: SceneState; name: string; wateredTick: number; justUnlocked: string[] }` — `justUnlocked` giữ các id món vừa mở trong 1,5 giây sau khi `peakPoints` vượt `unlockAt`
  - `ConnectedGarden({ size }: { size: 'compact' | 'large' })`
  - `GardenScene` nhận thêm `size?: 'compact' | 'large'` (thêm lớp CSS cùng tên)

- [ ] **Step 1: Viết test thất bại** `tests/ui/garden-integration.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dateKey } from '../../src/domain/date';
import { DEFAULT_PROFILE, type DayTask } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import GardenScreen from '../../src/ui/GardenScreen';
import SettingsScreen from '../../src/ui/SettingsScreen';
import Today from '../../src/ui/Today';

const D = dateKey(new Date()); // cảnh đọc đồng hồ thật nên dùng ngày thật
const mk = (id: string, title: string, points = 2): DayTask => ({
  id, templateId: id, habit: 'walk', title, minutes: 5, points, status: 'pending',
});

const seed = (tasks: DayTask[], peakPoints = 0, gardenEffects: 'full' | 'calm' | null = null) =>
  useStore.setState({
    data: {
      ...emptyData(),
      profile: DEFAULT_PROFILE,
      days: { [D]: tasks },
      garden: { name: 'Vườn Mai', peakPoints },
      settings: { ...emptyData().settings, gardenEffects },
    },
    storageStatus: 'ok',
    wateredTick: 0,
  });

afterEach(() => vi.unstubAllGlobals());

const stubReducedMotion = () =>
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {},
  }));

describe('Today hero', () => {
  it('shows the live garden above the tasks', () => {
    seed([mk('a', 'Đi bộ')]);
    render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByTestId('garden-scene').getAttribute('aria-label')).toContain('Vườn Mai');
  });
  it('opens the garden tab when the scene is clicked', async () => {
    const open = vi.fn();
    seed([mk('a', 'Đi bộ')]);
    render(<Today date={D} onOpenGarden={open} />);
    await userEvent.click(screen.getByTestId('garden-scene'));
    expect(open).toHaveBeenCalled();
  });
  it('waters the garden right away when a task is completed', async () => {
    seed([mk('a', 'Đi bộ'), mk('b', 'Giãn cơ')]);
    const { container } = render(<Today date={D} onOpenGarden={() => {}} />);
    expect(container.querySelector('.water-burst')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Đi bộ' }));
    expect(container.querySelectorAll('.water-burst .drop')).toHaveLength(5);
  });
  it('raises a rainbow when every task is done', async () => {
    seed([mk('a', 'Đi bộ'), mk('b', 'Giãn cơ')]);
    const { container } = render(<Today date={D} onOpenGarden={() => {}} />);
    expect(container.querySelector('.rainbow')).toHaveAttribute('data-visible', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Đi bộ' }));
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Giãn cơ' }));
    expect(container.querySelector('.rainbow')).toHaveAttribute('data-visible', 'true');
  });
  it('celebrates a freshly unlocked item', async () => {
    seed([mk('big', 'Việc lớn', 10)]);
    const { container } = render(<Today date={D} onOpenGarden={() => {}} />);
    expect(container.querySelector('[data-item="daisy"]')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Việc lớn' }));
    expect(container.querySelector('[data-item="daisy"] .unlock-pop')).not.toBeNull();
  });
  // Review Focus 4
  it('forces calm mode when the system asks for reduced motion, even if the setting says full', async () => {
    stubReducedMotion();
    seed([mk('a', 'Đi bộ')], 0, 'full');
    const { container } = render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByTestId('garden-scene')).toHaveClass('calm');
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành: Đi bộ' }));
    expect(container.querySelector('.water-burst')).toBeNull();
  });
  it('honours an explicit calm setting', () => {
    seed([mk('a', 'Đi bộ')], 0, 'calm');
    render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByTestId('garden-scene')).toHaveClass('calm');
  });
});

describe('Garden tab', () => {
  it('shows the large scene, the name field and the collection', () => {
    seed([], 50);
    render(<GardenScreen />);
    expect(screen.getByTestId('garden-scene')).toHaveClass('large');
    expect(screen.getByDisplayValue('Vườn Mai')).toBeInTheDocument();
    expect(screen.getByText('Hoa cúc · đã trưởng thành')).toBeInTheDocument();
  });
});

describe('Settings: garden effects', () => {
  it('defaults to full and lets the user pick the light mode', async () => {
    seed([]);
    render(<SettingsScreen />);
    expect(screen.getByLabelText('Đầy đủ')).toBeChecked();
    await userEvent.click(screen.getByLabelText('Nhẹ'));
    expect(useStore.getState().data.settings.gardenEffects).toBe('calm');
    expect(screen.getByLabelText('Nhẹ')).toBeChecked();
  });
  it('locks the choice to light when the system prefers reduced motion', () => {
    stubReducedMotion();
    seed([], 0, 'full');
    render(<SettingsScreen />);
    expect(screen.getByLabelText('Nhẹ')).toBeChecked();
    expect(screen.getByLabelText('Nhẹ')).toBeDisabled();
    expect(screen.getByLabelText('Đầy đủ')).toBeDisabled();
    expect(screen.getByText(/giảm chuyển động/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/ui/garden-integration.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Tạo `src/ui/garden/useGardenScene.ts`**

```ts
import { useEffect, useRef, useState } from 'react';
import { dateKey } from '../../domain/date';
import { GARDEN_ITEMS } from '../../domain/growth';
import { resolveEffects, sceneState, todayRatio, type SceneState } from '../../domain/scene';
import { useStore } from '../../state/store';
import { useSceneClock } from './useSceneClock';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export function useGardenScene(): { state: SceneState; name: string; wateredTick: number; justUnlocked: string[] } {
  const now = useSceneClock();
  const key = dateKey(now);
  const peak = useStore((s) => s.data.garden.peakPoints);
  const name = useStore((s) => s.data.garden.name);
  const tasks = useStore((s) => s.data.days[key]);
  const setting = useStore((s) => s.data.settings.gardenEffects);
  const wateredTick = useStore((s) => s.wateredTick);
  const reduced = usePrefersReducedMotion();

  const prev = useRef(peak);
  const [justUnlocked, setJustUnlocked] = useState<string[]>([]);
  useEffect(() => {
    const before = prev.current;
    prev.current = peak;
    const ids = GARDEN_ITEMS.filter((i) => i.unlockAt > before && i.unlockAt <= peak).map((i) => i.id);
    if (ids.length === 0) return;
    setJustUnlocked(ids);
    const t = setTimeout(() => setJustUnlocked([]), 1500);
    return () => clearTimeout(t);
  }, [peak]);

  const state = sceneState({
    peakPoints: peak,
    todayRatio: todayRatio(tasks),
    now,
    dateKey: key,
    effects: resolveEffects(setting, reduced),
  });
  return { state, name, wateredTick, justUnlocked };
}
```

- [ ] **Step 4: Tạo `src/ui/garden/ConnectedGarden.tsx`**

```tsx
import { GardenScene } from './GardenScene';
import { useGardenScene } from './useGardenScene';

export function ConnectedGarden({ size }: { size: 'compact' | 'large' }) {
  const { state, name, wateredTick, justUnlocked } = useGardenScene();
  return <GardenScene state={state} name={name} wateredTick={wateredTick} justUnlocked={justUnlocked} size={size} />;
}
```

- [ ] **Step 5: Cập nhật `GardenScene.tsx` và `garden.css`**

`GardenScene.tsx`: thêm `size?: 'compact' | 'large'` vào `Props`, nhận `size` trong chữ ký, và thêm vào mảng lớp: `size ?? ''`:

```tsx
  const cls = ['garden-scene', `phase-${state.phase}`, `weather-${state.weather}`, state.calm ? 'calm' : '', size ?? '']
    .filter(Boolean)
    .join(' ');
```

`garden.css` thêm:

```css
.garden-scene.compact { aspect-ratio: 16 / 9; max-height: 260px; }
.garden-scene.large { aspect-ratio: 6 / 5; max-height: 62vh; min-height: 280px; }
.hero { cursor: pointer; }
```

- [ ] **Step 6: Cập nhật màn hình**

`src/ui/Today.tsx`: thêm `import { ConnectedGarden } from './garden/ConnectedGarden';` và chèn ngay sau thẻ `</header>`:

```tsx
      <div className="hero" onClick={onOpenGarden}>
        <ConnectedGarden size="compact" />
      </div>
```
(nút "Xem khu vườn" vẫn giữ làm lối đi bằng bàn phím.)

`src/ui/GardenScreen.tsx`: thêm `import { ConnectedGarden } from './garden/ConnectedGarden';` và đặt `<ConnectedGarden size="large" />` làm phần tử đầu tiên trong `<section className="stack">`, trước ô tên vườn.

`src/ui/SettingsScreen.tsx`: thêm `import { usePrefersReducedMotion } from './garden/useGardenScene';`, trong component thêm:

```tsx
  const reduced = usePrefersReducedMotion();
  const effective = reduced ? 'calm' : settings.gardenEffects ?? 'full';
```
và chèn trước đoạn ghi chú về nhắc nhở (sau checkbox thông báo):

```tsx
      <fieldset>
        <legend>Hiệu ứng khu vườn</legend>
        {(['full', 'calm'] as const).map((v) => (
          <label key={v} className="inline">
            <input
              type="radio"
              name="garden-effects"
              checked={effective === v}
              disabled={reduced}
              onChange={() => updateSettings({ gardenEffects: v })}
            />
            {v === 'full' ? 'Đầy đủ' : 'Nhẹ'}
          </label>
        ))}
        {reduced && <p className="note">Thiết bị của bạn đang bật giảm chuyển động nên khu vườn luôn ở chế độ Nhẹ.</p>}
      </fieldset>
```

- [ ] **Step 7: Chạy toàn bộ kiểm tra**

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run e2e`
Expected: PASS. Nếu test `Today` cũ bị ảnh hưởng (ví dụ nhiều phần tử trùng tên), chỉnh truy vấn trong test cũ chứ không đổi giao diện.

- [ ] **Step 8: Kiểm tra bằng mắt trong ứng dụng thật**

Chạy `npm run dev`, vào luồng thật (bỏ qua onboarding, hoàn thành vài nhiệm vụ). Chụp tab Hôm nay và Khu vườn ở 375 px và 768 px, sáng và tối (giả lập bằng DevTools nếu cần), ghi nhận: cảnh không đẩy nội dung ra khỏi màn hình đầu; thanh tab không che cảnh; chữ trên nền sáng/tối vẫn đạt tương phản. Ghi chỉnh sửa vào ledger.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(garden): connect the live scene to Today, Garden tab and Settings"
```

---

### Task 10: Parallax, ngân sách chuyển động và rà soát tiếp cận

**Files:**
- Create: `src/ui/garden/parallax.ts`, `tests/ui/garden-parallax.test.tsx`, `tests/domain/budget.test.ts`
- Modify: `src/domain/scene.ts`, `src/ui/garden/GardenScene.tsx`, `src/ui/garden/garden.css`

**Interfaces:**
- Produces:
  - `parallaxVector(clientX, clientY, rect): { x: number; y: number }` (mỗi trục trong [−1, 1], về 0 khi hình chữ nhật rỗng)
  - `ANIMATION_BUDGET = 70` và `estimateAnimated(state: SceneState): number` trong `scene.ts` (số phần tử có thể đang chuyển động cùng lúc; `0` khi `calm`)
  - `GardenScene` đặt `--px`, `--py` (và `data-px`, `data-py`) khi chuột di chuyển (chỉ chế độ đầy đủ); mỗi lớp `[data-depth]` nhận `--depth`

- [ ] **Step 1: Viết test thất bại** `tests/domain/budget.test.ts`

```ts
import { addDays } from '../../src/domain/date';
import { ANIMATION_BUDGET, estimateAnimated, sceneState, weatherFor, type Weather } from '../../src/domain/scene';

function findDate(weather: Weather, phase: 'dawn' | 'day'): string {
  for (let i = 0; i < 400; i++) {
    const k = addDays('2026-01-01', i);
    if (weatherFor(k, phase) === weather) return k;
  }
  throw new Error(`no ${weather} date found`);
}

const hours = [6, 12, 18, 23];
const peaks = [0, 45, 100, 190, 600];
const weathers: [Weather, 'dawn' | 'day'][] = [['clear', 'day'], ['cloudy', 'day'], ['rain', 'day'], ['mist', 'dawn']];

describe('animation budget', () => {
  it('never exceeds the budget in any reachable state', () => {
    let worst = 0;
    for (const [w, ph] of weathers) {
      const dateKey = findDate(w, ph);
      for (const h of hours) {
        for (const peakPoints of peaks) {
          for (const todayRatio of [0, 0.5, 1]) {
            const s = sceneState({ peakPoints, todayRatio, now: new Date(2026, 9, 9, h), dateKey, effects: 'full' });
            worst = Math.max(worst, estimateAnimated(s));
            expect(estimateAnimated(s)).toBeLessThanOrEqual(ANIMATION_BUDGET);
          }
        }
      }
    }
    expect(worst).toBeGreaterThan(30); // hàm không trả về số 0 vô nghĩa
  });
  it('is zero in calm mode', () => {
    const s = sceneState({ peakPoints: 600, todayRatio: 1, now: new Date(2026, 9, 9, 12), dateKey: '2026-10-07', effects: 'calm' });
    expect(estimateAnimated(s)).toBe(0);
  });
  it('counts rain drops only on rainy days', () => {
    const rain = sceneState({ peakPoints: 0, todayRatio: 0, now: new Date(2026, 9, 9, 12), dateKey: '2026-10-09', effects: 'full' });
    const clear = sceneState({ peakPoints: 0, todayRatio: 0, now: new Date(2026, 9, 9, 12), dateKey: '2026-10-07', effects: 'full' });
    expect(rain.weather).toBe('rain');
    expect(estimateAnimated(rain) - estimateAnimated(clear)).toBeGreaterThanOrEqual(25);
  });
});
```

- [ ] **Step 2: Viết test thất bại** `tests/ui/garden-parallax.test.tsx`

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { sceneState } from '../../src/domain/scene';
import { GardenScene } from '../../src/ui/garden/GardenScene';
import { parallaxVector } from '../../src/ui/garden/parallax';

const rect = { left: 0, top: 0, width: 200, height: 100 };
const make = (effects: 'full' | 'calm') =>
  sceneState({ peakPoints: 0, todayRatio: 0, now: new Date(2026, 9, 9, 10), dateKey: '2026-10-07', effects });

describe('parallaxVector', () => {
  it('is 0 at the centre and ±1 at the corners', () => {
    expect(parallaxVector(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(parallaxVector(200, 100, rect)).toEqual({ x: 1, y: 1 });
    expect(parallaxVector(0, 0, rect)).toEqual({ x: -1, y: -1 });
  });
  it('clamps pointers outside the box and tolerates an empty box', () => {
    expect(parallaxVector(900, -900, rect)).toEqual({ x: 1, y: -1 });
    expect(parallaxVector(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe('GardenScene parallax', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      ...rect, right: 200, bottom: 100, x: 0, y: 0, toJSON() {},
    } as DOMRect);
  });
  afterEach(() => vi.restoreAllMocks());

  it('follows the mouse in full mode and recentres when it leaves', () => {
    render(<GardenScene state={make('full')} name="v" />);
    const scene = screen.getByTestId('garden-scene');
    fireEvent.mouseMove(scene, { clientX: 200, clientY: 0 });
    expect(scene.dataset.px).toBe('1');
    expect(scene.dataset.py).toBe('-1');
    fireEvent.mouseLeave(scene);
    expect(scene.dataset.px).toBe('0');
    expect(scene.dataset.py).toBe('0');
  });
  // Review Focus 4
  it('ignores the mouse entirely in calm mode', () => {
    render(<GardenScene state={make('calm')} name="v" />);
    const scene = screen.getByTestId('garden-scene');
    fireEvent.mouseMove(scene, { clientX: 200, clientY: 0 });
    expect(scene.dataset.px).toBeUndefined();
  });
});
```

- [ ] **Step 3: Chạy để thấy thất bại**

Run: `npx vitest run tests/domain/budget.test.ts tests/ui/garden-parallax.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Thêm `estimateAnimated` vào `src/domain/scene.ts`**

Thêm `getItem` vào dòng import từ `./growth`, rồi thêm cuối file:

```ts
export const ANIMATION_BUDGET = 70;

const SWAYERS = new Set(['grass', 'daisy', 'tulip', 'sunflower', 'apple-tree', 'cherry-tree']);

/**
 * Ước lượng số phần tử có thể đang chạy animation cùng lúc ở chế độ đầy đủ.
 * Phản chiếu các quy tắc trong garden.css (cỏ tiền cảnh chỉ nửa số ngọn đung đưa,
 * chỉ 8 ngôi sao nhấp nháy, sao tắt ban ngày, đom đóm/bướm/chim đã được sceneState lọc).
 */
export function estimateAnimated(state: SceneState): number {
  if (state.calm) return 0;
  const sway = state.items
    .filter((i) => SWAYERS.has(i.id))
    .reduce((n, i) => n + (getItem(i.id)?.slots.length ?? 0), 0);
  const clouds = state.weather === 'clear' ? 3 : 6;
  const butterflies = (state.creatures.butterflies + state.extraButterflies) * 2; // thân + cánh
  const stars = state.phase === 'day' ? 0 : 8;
  const rain = state.weather === 'rain' ? 28 : 0;
  const mist = state.weather === 'mist' ? 3 : 0;
  const sun = state.sky.body === 'sun' ? 1 : 0;
  const rays = state.sky.body === 'sun' && state.weather !== 'rain' ? 1 : 0;
  const halo = state.items.some((i) => i.id === 'lantern') ? 1 : 0;
  return (
    clouds + sway + 7 + butterflies + state.creatures.birds + state.creatures.fish +
    state.creatures.fireflies + stars + rain + mist + sun + rays + halo
  );
}
```

- [ ] **Step 5: Tạo `src/ui/garden/parallax.ts`**

```ts
export function parallaxVector(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return {
    x: clamp(((clientX - rect.left) / rect.width) * 2 - 1),
    y: clamp(((clientY - rect.top) / rect.height) * 2 - 1),
  };
}
```

- [ ] **Step 6: Gắn vào `GardenScene.tsx`**

Thêm `import { useEffect, useRef, ... } from 'react'` (giữ `useRef`), `import { parallaxVector } from './parallax';`, và trong component, sau `const paused = ...`:

```tsx
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.querySelectorAll<SVGElement>('[data-depth]').forEach((el) => {
      el.style.setProperty('--depth', el.dataset.depth ?? '0');
    });
    if (state.calm) return;
    const set = (x: number, y: number) => {
      node.dataset.px = String(x);
      node.dataset.py = String(y);
      node.style.setProperty('--px', String(x));
      node.style.setProperty('--py', String(y));
    };
    const onMove = (e: MouseEvent) => {
      const v = parallaxVector(e.clientX, e.clientY, node.getBoundingClientRect());
      set(v.x, v.y);
    };
    const onLeave = () => set(0, 0);
    node.addEventListener('mousemove', onMove);
    node.addEventListener('mouseleave', onLeave);
    return () => {
      node.removeEventListener('mousemove', onMove);
      node.removeEventListener('mouseleave', onLeave);
    };
  }, [state.calm]);
```

- [ ] **Step 7: CSS: parallax và khớp ngân sách**

Thêm vào cuối `garden.css`:

```css
/* ----- Chiều sâu: parallax theo chuột (chỉ transform) ----- */
.garden-scene .layer[data-depth] {
  transform: translate(calc(var(--px, 0) * var(--depth, 0) * -10px), calc(var(--py, 0) * var(--depth, 0) * -5px));
  transition: transform 0.25s ease-out;
}
.calm .layer[data-depth] { transform: none; transition: none; }

/* ----- Khớp ngân sách chuyển động (xem estimateAnimated) ----- */
.fg-blade:nth-child(even) { animation: none; }
.star:nth-child(n + 9) { animation: none; }
.phase-day .star { animation: none; }
.phase-day .firefly, .phase-dawn .firefly { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .garden-scene .layer[data-depth] { transform: none !important; transition: none !important; }
}
```

- [ ] **Step 8: Chạy test, đo hiệu năng và rà tiếp cận**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

Trong Chrome (trang xem thử, điểm 600, giờ 23, mưa): (a) đo fps bằng `requestAnimationFrame` trong 3 giây, mục tiêu ≥ 55 fps, ghi số đo; (b) chuyển tab ẩn rồi hiện lại để thấy chuyển động dừng/tiếp; (c) bật `Emulate CSS prefers-reduced-motion: reduce` trong DevTools và xác nhận cảnh tĩnh, không mưa, không parallax; (d) điều hướng bằng bàn phím Tab qua Hôm nay → Khu vườn → Cài đặt, mọi điều khiển có viền focus thấy được; (e) chạy đo tương phản chữ ngoài cảnh và nút chính ở chế độ tối (script ở bước kiểm tra cuối). Ghi kết quả vào ledger.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(garden): mouse parallax, animation budget and motion pruning"
```

---

### Task 11: Tài liệu, E2E và kiểm tra cuối

**Files:**
- Modify: `docs/superpowers/specs/2026-10-09-garden-redesign-design.md`, `AGENTS.md`, `README.md`, `e2e/life-garden.spec.ts`

- [ ] **Step 1: Cập nhật spec cho khớp thực tế triển khai**

Trong `2026-10-09-garden-redesign-design.md`:
- Mục 3.3, ngay sau danh sách sinh vật, thêm: "**Sinh vật nghỉ ngơi:** bướm và chim chỉ xuất hiện ban ngày không mưa; đom đóm chỉ xuất hiện lúc hoàng hôn và ban đêm không mưa; cá luôn ở trong hồ."
- Mục 8, đổi "Tối đa khoảng **60** phần tử chuyển động cùng lúc (mưa chỉ trong ngày mưa)" thành "Tối đa **70** phần tử chuyển động cùng lúc (`ANIMATION_BUDGET`), trong đó mưa chiếm 28 và chỉ có trong ngày mưa; sinh vật nghỉ khi mưa hoặc ban đêm; chỉ một nửa ngọn cỏ tiền cảnh và 8 ngôi sao chuyển động".
- Đổi `Trạng thái: chờ duyệt` thành `Trạng thái: đã triển khai`.

- [ ] **Step 2: Cập nhật `AGENTS.md`**

- Mục 4 (cây thư mục): thay dòng `garden.ts` bằng `growth.ts  # GARDEN_ITEMS, growthOf, creatureCounts, bloomDensity, nextUnlock` và thêm `scene.ts  # skyPhase, weatherFor, sceneState, describeScene, estimateAnimated`; thêm `ui/garden/  # GardenScene, các lớp SVG, từng món, hook đồng hồ/tạm dừng, garden.css`.
- Mục 5: `garden: tên vườn, peakPoints (điểm cao nhất từng đạt, chỉ tăng)`; `settings.gardenEffects: 'full' | 'calm' | null`; `version: 2`.
- Mục 6: thay quy tắc 2 bằng "**Vườn lớn theo `garden.peakPoints`**, chỉ tăng (`syncGarden`); bỏ tick không làm cây co lại." và quy tắc 7 bằng "**Khu vườn là cảnh SVG nhiều lớp tự phát triển**; không có đặt/di chuyển/gỡ. Mọi phần tử lớn liên tục theo `peakPoints`; trong ngày chỉ có phản ứng tức thời không lưu (`wateredTick`, nắng ấm, cầu vồng). Thời tiết trang trí cố định theo ngày, luôn đẹp."
- Mục 7 (quy ước): thêm "Chuyển động chỉ dùng `transform`/`opacity`; thêm keyframes mới phải qua test `garden-motion`. Khi thêm phần tử chuyển động hãy cập nhật `estimateAnimated` và giữ ≤ `ANIMATION_BUDGET`." và "Test cảnh dùng `dateKey: '2026-10-07'` (ngày nắng) làm mặc định; `2026-10-09` là ngày mưa."
- Mục 8: bỏ các hạn chế đã hết hiệu lực; thêm "Parallax chỉ theo chuột (chưa theo cảm biến nghiêng)".

- [ ] **Step 3: Cập nhật `README.md`**

Thay gạch đầu dòng "Khu vườn" trong phần Tính năng bằng: "**Khu vườn**: cảnh SVG nhiều lớp tự lớn lên khi bạn hoàn thành nhiệm vụ, có bầu trời theo giờ trong ngày, thời tiết, bướm, chim, hồ cá; không cần đặt gì. Hiệu ứng Đầy đủ hoặc Nhẹ (tự giảm khi hệ thống bật giảm chuyển động)." và thêm mục Hạn chế: "Tranh SVG do mã tạo; có thể thay từng món bằng tranh của họa sĩ trong `src/ui/garden/items/`."

- [ ] **Step 4: Mở rộng E2E** (`e2e/life-garden.spec.ts`)

Trong bài kiểm tra đầu, ngay sau bước bấm "Bắt đầu" và trước khi hoàn thành nhiệm vụ, thêm:

```ts
  await expect(page.getByTestId('garden-scene')).toBeVisible();
  await expect(page.getByTestId('garden-scene')).toHaveAttribute('aria-label', /Khu vườn của tôi/);
```
và ngay sau lần bấm hoàn thành đầu tiên:

```ts
  await expect(page.locator('.water-burst')).toHaveCount(1);
```
Thêm cuối file:

```ts
test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('forces the calm garden', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Bỏ qua' }).click();
    await expect(page.getByTestId('garden-scene')).toHaveClass(/calm/);
    await expect(page.locator('.raindrop')).toHaveCount(0);
  });
});

test('an old v1 save is upgraded without losing the garden level', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('life-garden:v1', JSON.stringify({
      version: 1,
      profile: { goal: 'general', activity: 'low', minutesPerDay: 30 },
      settings: { habits: ['water'], reminderTime: '20:00', notificationsEnabled: false, customTasks: [] },
      days: {},
      garden: { name: 'Vườn cũ', unlockedLevel: 4, placed: [{ cell: 1, itemId: 'daisy' }] },
    }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Khu vườn', exact: true }).click();
  await expect(page.getByDisplayValue('Vườn cũ')).toBeVisible();
  await expect(page.getByText('Cây táo · mới gieo (0%)')).toBeVisible();
});
```
(Cây táo mở ở 70 điểm = ngưỡng level 4 cũ, nên vừa mở và ở mức 0 %.)

- [ ] **Step 5: Kiểm tra tương phản và chạy toàn bộ**

Chạy script đo (chỉ đọc):

```bash
python - <<'EOF'
def lum(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b):
    la,lb=sorted((lum(a),lum(b)),reverse=True); return round((la+0.05)/(lb+0.05),2)
print('light text on bg', cr('#1b2a1b','#f6faf4'))
print('dark  text on bg', cr('#e6efe4','#121a12'))
print('light muted on bg', cr('#5f6f5f','#f6faf4'))
print('dark  muted on card', cr('#9fb09c','#1c271c'))
EOF
```
Expected: mọi số ≥ 4.5 cho chữ. (Ghi chú: cặp chữ trắng trên `#66bb6a` của nút chính chế độ tối là lỗi nền đã biết từ lần đánh giá giao diện; không thuộc phạm vi kế hoạch này, đừng sửa ở đây.)

Run: `npx vitest run && npx tsc --noEmit && npm run build && npm run e2e`
Expected: tất cả PASS.

- [ ] **Step 6: Chụp ảnh kết quả cuối và ghi lại**

Chụp tab Hôm nay và Khu vườn ở 375 px / 768 px, sáng/tối, các pha ban ngày / hoàng hôn / đêm, ngày mưa và ngày nắng, ở điểm 0 / 100 / 600 (qua trang xem thử hoặc đồng hồ giả lập). Liệt kê trong ledger những gì còn chưa đạt chất lượng "sản phẩm thật" để người dùng quyết định có cần họa sĩ hay vòng tinh chỉnh tiếp.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: garden redesign docs, e2e coverage and final verification"
```

---

## Self-Review

**Phủ spec (garden-redesign):**
- §3.1–3.4 mô hình tăng trưởng: Task 1 (`growthOf`, bảng mở khóa, sinh vật, `bloomDensity`), Task 2 (`sceneState`, ratio, rainbow, extra butterflies), Task 3 (`peakPoints`, `wateredTick`).
- §4 bầu trời/thời tiết: Task 2 (`skyPhase`, `celestial`, `weatherFor`), Task 4 (hòa mờ bốn pha), Task 6 (mưa, sương).
- §5 dữ liệu v2 + di trú + chấp nhận v1: Task 3 (và E2E Task 11).
- §6 chín lớp: Task 4 (trời, mây, đồi xa, đồi gần, mặt đất), Task 5 (phần tử + bóng), Task 6 (thời tiết, tiền cảnh, ánh sáng); parallax Task 10.
- §7 chuyển động: Task 7 (nền), Task 8 (phản ứng).
- §8 hiệu năng: Task 7 (tạm dừng), Task 10 (ngân sách, đo fps). Con số ngân sách thực tế là 70 (đã ghi cập nhật spec ở Task 11).
- §9 Đầy đủ/Nhẹ: Task 2 (`resolveEffects`), Task 9 (Cài đặt), Task 7/10 (calm).
- §10 tiếp cận: Task 2 (`describeScene`), Task 3 (`CollectionList`), Task 4 (`role="img"`), Task 9.
- §11 tích hợp màn hình: Task 9; toast: Task 3.
- §12 cấu trúc mã nguồn: các task tương ứng; `ItemArt.tsx` bị xóa ở Task 3.
- §13 kiểm thử và §14 thứ tự mốc: bám sát (mốc 1 = Task 1–3, mốc 2 = Task 4–5, mốc 3 = Task 6–8, mốc 4 = Task 9, mốc 5 = Task 10–11).

**Placeholder:** không có "TBD/TODO". Các bước kiểm tra bằng mắt có tiêu chí đạt cụ thể; việc chỉnh tọa độ/màu ở Task 4–6 là vòng tinh chỉnh có ràng buộc đã nêu (test "không xếp chồng", "y ≥ 330").

**Nhất quán kiểu:** `SceneState` (Task 2) được dùng nguyên văn ở Task 4–10; `GardenScene` props tích lũy: `state`, `name`, `wateredTick` (Task 4), `justUnlocked` (Task 8), `size` (Task 9); `ElementsLayer({ state, tick, justUnlocked })` (Task 8) khớp lời gọi ở `GardenScene`; `depthScale` xuất từ `ElementsLayer` và dùng ở `LightLayer`; ngày mặc định test `2026-10-07` (nắng), `2026-10-09` (mưa) nhất quán.

**Rủi ro còn lại:** chất lượng nghệ thuật của SVG viết tay (Task 4–6, vòng chụp ảnh), hiệu năng thực tế trên điện thoại thật (chỉ đo được trên desktop trong Chrome), jsdom có thể bỏ thuộc tính CSS tùy biến nên test parallax đọc `data-px`/`data-py`.
