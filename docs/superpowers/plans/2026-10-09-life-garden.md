# Life Garden Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây web app Life Garden: nhiệm vụ sống khỏe hằng ngày làm khu vườn ảo phát triển, không phạt khi bỏ lỡ, dữ liệu chỉ nằm trên trình duyệt.

**Architecture:** React + Vite + TypeScript. Logic nghiệp vụ là các module TS thuần trong `src/domain` (gợi ý nhiệm vụ, điểm, vườn, tiến độ), không phụ thuộc React. Một store Zustand trung tâm (`src/state/store.ts`) giữ `AppData` và tự lưu vào localStorage. Màn hình trong `src/ui` chỉ là lớp hiển thị mỏng.

**Tech Stack:** React 18, Vite 5, TypeScript 5, Zustand 4, Vitest + Testing Library + jsdom, Playwright, vite-plugin-pwa.

**Spec:** `docs/superpowers/specs/2026-10-09-life-garden-design.md`

## Global Constraints

- Chỉ lưu trên trình duyệt: không tài khoản, không server, không phân tích bên thứ ba.
- React + Vite + TypeScript; store Zustand; logic nghiệp vụ là module TS thuần.
- Điểm vườn = tổng điểm các nhiệm vụ đang `done`, tính từ `days`, không lưu riêng. Bỏ tick thì thu hồi; bỏ lỡ ngày không trừ.
- `garden.unlockedLevel` chỉ tăng. Món đã mở khóa được giữ.
- Không có streak, không có thứ gì héo hay mất khi bỏ lỡ một ngày.
- Mỗi ngày gợi ý 3–5 nhiệm vụ, tổng thời lượng không vượt quỹ thời gian rảnh; sinh một lần/ngày với hạt giống theo ngày rồi ghi vào `days`.
- Lưới vườn vuông, bắt đầu 6×6, mở rộng dần, chạm để đặt (không kéo thả).
- Lịch sử `days` giữ vô thời hạn. `AppData.version` = 1.
- Ghi chú "gợi ý không thay thế tư vấn y tế" hiện ở màn chào mừng và Cài đặt.
- Nhắc nhở: Web Notification khi app mở/nằm nền + nhắc trong app; xin quyền thông báo khi người dùng chọn giờ nhắc, không xin lúc mở app.
- Kiểm thử: Vitest (logic), Testing Library (màn hình), Playwright (đầu-cuối).
- Ngôn ngữ giao diện: tiếng Việt.

## Review Focus

Các tình huống spec ngụ ý nhưng dễ bị bỏ sót (mỗi dòng có test ở task sở hữu):

1. Hồ sơ bỏ qua hoặc trống (không cân nặng, `profile` mặc định) → gợi ý không ra `NaN`/`{ml}` trong tiêu đề (Task 3).
2. Quỹ thời gian rất nhỏ hoặc danh sách thói quen rỗng → vẫn có ít nhất 1 nhiệm vụ, không crash (Task 3).
3. Đổi nhiệm vụ khi không còn mẫu thay thế → giữ nguyên danh sách, không crash (Task 3).
4. Nhập tệp sai/hỏng → không ghi đè dữ liệu hiện có; dữ liệu localStorage hỏng → không bị ghi đè âm thầm (Task 6).
5. Đặt món vào ô ngoài lưới / ô đã có / vượt `maxCount` / món chưa mở khóa → bị từ chối với lý do (Task 4).

## File Structure

```
package.json, tsconfig.json, vite.config.ts, index.html, .gitignore
playwright.config.ts
public/icon.svg
src/main.tsx, src/App.tsx, src/styles.css
src/domain/types.ts       # kiểu dữ liệu + hằng số dùng chung
src/domain/date.ts        # dateKey, parseKey, addDays, weekStart
src/domain/catalog.ts     # CATALOG nhiệm vụ + personalize()
src/domain/suggest.ts     # suggestTasks(), swapTask()
src/domain/garden.ts      # ITEMS, LEVEL_THRESHOLDS, canPlace/placeItem/removeAt/moveItem
src/domain/scoring.ts     # dayPoints, totalPoints, syncGarden
src/domain/progress.ts    # weeklySummary, habitCounts, milestones, historyDays
src/state/storage.ts      # emptyData, parseData, loadData, saveData
src/state/store.ts        # useStore + startPersistence
src/notifications/reminders.ts
src/ui/ItemArt.tsx, ProfileForm.tsx, Welcome.tsx, Recovery.tsx, Today.tsx,
       GardenScreen.tsx, ProgressScreen.tsx, SettingsScreen.tsx, useToday.ts
tests/domain/*.test.ts, tests/state/*.test.ts, tests/ui/*.test.tsx, tests/setup.ts
e2e/life-garden.spec.ts
```

---

### Task 1: Scaffold dự án

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `tests/setup.ts`, `tests/smoke.test.tsx`

**Interfaces:**
- Produces: `npm run dev|build|test` hoạt động; alias không dùng, import tương đối.

- [ ] **Step 1: Tạo `package.json`**

```json
{
  "name": "life-garden",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "e2e": "playwright test"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vite-plugin-pwa": "^0.20.5",
    "vitest": "^2.1.2"
  }
}
```

- [ ] **Step 2: Tạo `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vitest/globals", "vite/client", "vite-plugin-pwa/client"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Tạo `vite.config.ts`** (PWA được thêm ở Task 12)

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 4: Tạo `index.html`, `.gitignore`, `tests/setup.ts`**

`index.html`:
```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#2e7d32" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <title>Life Garden</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules
dist
playwright-report
test-results
```

`tests/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

- [ ] **Step 5: Tạo `src/App.tsx`, `src/main.tsx` tối thiểu và smoke test**

`src/App.tsx`:
```tsx
export default function App() {
  return <h1>Life Garden</h1>;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`tests/smoke.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import App from '../src/App';

it('renders the app title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Life Garden' })).toBeInTheDocument();
});
```

- [ ] **Step 6: Cài và chạy**

Run: `npm install && npm test && npm run build`
Expected: smoke test PASS; build thành công. (Thêm tạm `public/icon.svg` là Task 12; nếu build cảnh báo thiếu icon thì bỏ qua.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React TypeScript project with Vitest"
```

---

### Task 2: Kiểu dữ liệu và tiện ích ngày

**Files:**
- Create: `src/domain/types.ts`, `src/domain/date.ts`, `tests/domain/date.test.ts`

**Interfaces:**
- Produces (`types.ts`): `Habit`, `ALL_HABITS`, `HABIT_LABEL`, `Goal`, `Activity`, `Gender`, `TaskStatus`, `Profile`, `DEFAULT_PROFILE`, `TaskTemplate`, `DayTask`, `Settings`, `PlacedItem`, `Garden`, `AppData`.
- Produces (`date.ts`): `dateKey(d: Date): string`, `parseKey(k: string): Date`, `addDays(k: string, n: number): string`, `weekStart(k: string): string` (thứ Hai).

- [ ] **Step 1: Viết test thất bại** `tests/domain/date.test.ts`

```ts
import { addDays, dateKey, parseKey, weekStart } from '../../src/domain/date';

describe('date utils', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 9, 9))).toBe('2026-10-09');
  });
  it('parses a key back to a local date', () => {
    const d = parseKey('2026-01-05');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 0, 5]);
  });
  it('adds days across month boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('returns Monday as week start', () => {
    expect(weekStart('2026-10-09')).toBe('2026-10-05'); // Friday
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // Sunday
    expect(weekStart('2026-10-05')).toBe('2026-10-05'); // Monday
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/domain/date.test.ts`
Expected: FAIL (không tìm thấy module `date`).

- [ ] **Step 3: Tạo `src/domain/types.ts`**

```ts
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
```

- [ ] **Step 4: Tạo `src/domain/date.ts`**

```ts
const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function weekStart(k: string): string {
  const dow = (parseKey(k).getDay() + 6) % 7; // Monday = 0
  return addDays(k, -dow);
}
```

- [ ] **Step 5: Chạy test**

Run: `npx vitest run tests/domain/date.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/domain tests/domain
git commit -m "feat(domain): add shared types and date utilities"
```

---

### Task 3: Danh mục nhiệm vụ và bộ gợi ý

**Files:**
- Create: `src/domain/catalog.ts`, `src/domain/suggest.ts`, `tests/domain/suggest.test.ts`

**Interfaces:**
- Consumes: `types.ts`.
- Produces (`catalog.ts`): `CATALOG: TaskTemplate[]`, `personalize(t: TaskTemplate, p: Profile | null): string`.
- Produces (`suggest.ts`):
  - `hashSeed(s: string): number`, `rng(seed: number): () => number`
  - `interface SuggestInput { profile: Profile | null; settings: Settings; date: string; previous?: DayTask[]; catalog?: TaskTemplate[] }`
  - `suggestTasks(input: SuggestInput): DayTask[]`
  - `swapTask(tasks: DayTask[], taskId: string, input: Omit<SuggestInput, 'previous'>): DayTask[]`

- [ ] **Step 1: Tạo `src/domain/catalog.ts`**

```ts
import type { Activity, Profile, TaskTemplate } from './types';

export const CATALOG: TaskTemplate[] = [
  { id: 'water-1', habit: 'water', title: 'Uống {ml} ml nước trong ngày', minutes: 2, points: 2 },
  { id: 'water-2', habit: 'water', title: 'Uống một cốc nước ngay khi thức dậy', minutes: 1, points: 1 },
  { id: 'water-3', habit: 'water', title: 'Mang theo chai nước và uống đều trong ngày', minutes: 2, points: 2 },
  { id: 'walk-1', habit: 'walk', title: 'Đi bộ 10 phút', minutes: 10, points: 3 },
  { id: 'walk-2', habit: 'walk', title: 'Đi bộ nhẹ nhàng đạt {steps} bước', minutes: 20, points: 4 },
  { id: 'walk-3', habit: 'walk', title: 'Đi cầu thang thay vì thang máy', minutes: 3, points: 2 },
  { id: 'ex-1', habit: 'exercise', title: 'Giãn cơ 5 phút', minutes: 5, points: 2 },
  { id: 'ex-2', habit: 'exercise', title: 'Hít thở sâu và vươn vai 3 phút', minutes: 3, points: 1 },
  { id: 'ex-3', habit: 'exercise', title: 'Tập thể dục nhẹ 15 phút', minutes: 15, points: 4, minActivity: 'medium' },
  { id: 'ex-4', habit: 'exercise', title: 'Chạy bộ hoặc đạp xe 20 phút', minutes: 20, points: 5, minActivity: 'high' },
  { id: 'sleep-1', habit: 'sleep', title: 'Tắt màn hình trước giờ ngủ 30 phút', minutes: 5, points: 3 },
  { id: 'sleep-2', habit: 'sleep', title: 'Chuẩn bị đi ngủ đúng giờ', minutes: 5, points: 3 },
  { id: 'sleep-3', habit: 'sleep', title: 'Đọc vài trang sách trước khi ngủ', minutes: 10, points: 2 },
];

const STEPS: Record<Activity, number> = { low: 3000, medium: 5000, high: 7000 };

export function personalize(t: TaskTemplate, p: Profile | null): string {
  let ml = 2000;
  if (p?.weightKg && p.weightKg > 0) {
    ml = Math.min(3000, Math.max(1500, Math.round((p.weightKg * 30) / 100) * 100));
  }
  const steps = STEPS[p?.activity ?? 'low'];
  return t.title.replace('{ml}', String(ml)).replace('{steps}', String(steps));
}
```

- [ ] **Step 2: Viết test thất bại** `tests/domain/suggest.test.ts`

```ts
import { CATALOG, personalize } from '../../src/domain/catalog';
import { suggestTasks, swapTask } from '../../src/domain/suggest';
import { ALL_HABITS, DEFAULT_PROFILE, type Profile, type Settings } from '../../src/domain/types';

const settings = (over: Partial<Settings> = {}): Settings => ({
  habits: ALL_HABITS,
  reminderTime: '20:00',
  notificationsEnabled: false,
  customTasks: [],
  ...over,
});
const busy: Profile = { ...DEFAULT_PROFILE, activity: 'high', minutesPerDay: 60 };
const D = '2026-10-09';

describe('personalize', () => {
  it('scales water with weight and falls back without it', () => {
    const water = CATALOG.find((t) => t.id === 'water-1')!;
    expect(personalize(water, { ...DEFAULT_PROFILE, weightKg: 70 })).toContain('2100');
    expect(personalize(water, DEFAULT_PROFILE)).toContain('2000');
    expect(personalize(water, null)).toContain('2000');
  });
});

describe('suggestTasks', () => {
  it('is deterministic for the same date and input', () => {
    const a = suggestTasks({ profile: busy, settings: settings(), date: D });
    const b = suggestTasks({ profile: busy, settings: settings(), date: D });
    expect(a).toEqual(b);
  });

  it('returns 3 to 5 pending tasks within the time budget', () => {
    for (let i = 1; i <= 20; i++) {
      const date = `2026-10-${String(i).padStart(2, '0')}`;
      const tasks = suggestTasks({ profile: busy, settings: settings(), date });
      expect(tasks.length).toBeGreaterThanOrEqual(3);
      expect(tasks.length).toBeLessThanOrEqual(5);
      expect(tasks.reduce((s, t) => s + t.minutes, 0)).toBeLessThanOrEqual(60);
      expect(tasks.every((t) => t.status === 'pending')).toBe(true);
    }
  });

  it('uses unique task ids within a day', () => {
    const tasks = suggestTasks({ profile: busy, settings: settings(), date: D });
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
  });

  it('only picks selected habits', () => {
    const tasks = suggestTasks({ profile: busy, settings: settings({ habits: ['water', 'sleep'] }), date: D });
    expect(tasks.every((t) => t.habit === 'water' || t.habit === 'sleep')).toBe(true);
  });

  it('respects activity level (no high-intensity task for low activity)', () => {
    const low: Profile = { ...DEFAULT_PROFILE, activity: 'low', minutesPerDay: 120 };
    for (let i = 1; i <= 15; i++) {
      const tasks = suggestTasks({ profile: low, settings: settings(), date: `2026-10-${String(i).padStart(2, '0')}` });
      expect(tasks.some((t) => t.templateId === 'ex-3' || t.templateId === 'ex-4')).toBe(false);
    }
  });

  it('puts the goal habit first when it fits the budget', () => {
    const p: Profile = { ...busy, goal: 'sleep' };
    const withSleep = Array.from({ length: 10 }, (_, i) =>
      suggestTasks({ profile: p, settings: settings(), date: `2026-10-${String(i + 1).padStart(2, '0')}` }),
    ).filter((tasks) => tasks.some((t) => t.habit === 'sleep'));
    expect(withSleep.length).toBe(10);
  });

  it('avoids yesterday templates when an alternative exists', () => {
    const yesterday = suggestTasks({ profile: busy, settings: settings(), date: '2026-10-08' });
    const today = suggestTasks({ profile: busy, settings: settings(), date: D, previous: yesterday });
    for (const h of ALL_HABITS) {
      const y = yesterday.filter((t) => t.habit === h);
      if (y.length === 1) {
        expect(today.some((t) => t.templateId === y[0].templateId)).toBe(false);
      }
    }
  });

  // Review Focus 1
  it('never leaks placeholders or NaN with an empty profile', () => {
    for (const profile of [null, DEFAULT_PROFILE, { ...DEFAULT_PROFILE, weightKg: Number.NaN }]) {
      const tasks = suggestTasks({ profile, settings: settings(), date: D });
      for (const t of tasks) {
        expect(t.title).not.toMatch(/NaN|\{|\}/);
      }
    }
  });

  // Review Focus 2
  it('still returns at least one task for a tiny budget or empty habit list', () => {
    const tiny: Profile = { ...DEFAULT_PROFILE, minutesPerDay: 1 };
    expect(suggestTasks({ profile: tiny, settings: settings(), date: D }).length).toBeGreaterThanOrEqual(1);
    const none = suggestTasks({ profile: busy, settings: settings({ habits: [] }), date: D });
    expect(none.length).toBeGreaterThanOrEqual(3);
  });

  it('includes user custom tasks in the pool', () => {
    const custom = { id: 'custom-1', habit: 'walk' as const, title: 'Dắt chó đi dạo', minutes: 10, points: 2 };
    const seen = new Set<string>();
    for (let i = 1; i <= 28; i++) {
      const tasks = suggestTasks({
        profile: busy,
        settings: settings({ habits: ['walk'], customTasks: [custom] }),
        date: `2026-10-${String(i).padStart(2, '0')}`,
      });
      tasks.forEach((t) => seen.add(t.templateId));
    }
    expect(seen.has('custom-1')).toBe(true);
  });
});

describe('swapTask', () => {
  const base = () => suggestTasks({ profile: busy, settings: settings(), date: D });

  it('marks the old task swapped and adds a different task of the same habit', () => {
    const tasks = base();
    const target = tasks[0];
    const next = swapTask(tasks, target.id, { profile: busy, settings: settings(), date: D });
    expect(next.find((t) => t.id === target.id)!.status).toBe('swapped');
    const added = next.filter((t) => !tasks.some((o) => o.id === t.id));
    expect(added).toHaveLength(1);
    expect(added[0].habit).toBe(target.habit);
    expect(added[0].templateId).not.toBe(target.templateId);
    expect(added[0].status).toBe('pending');
  });

  it('does not swap tasks that are not pending', () => {
    const tasks = base().map((t, i) => (i === 0 ? { ...t, status: 'done' as const } : t));
    expect(swapTask(tasks, tasks[0].id, { profile: busy, settings: settings(), date: D })).toBe(tasks);
  });

  // Review Focus 3
  it('keeps the list unchanged when no alternative template exists', () => {
    const only = [{ id: 'only', habit: 'water' as const, title: 'x', minutes: 1, points: 1 }];
    const tasks = suggestTasks({ profile: busy, settings: settings({ habits: ['water'] }), date: D, catalog: only });
    const next = swapTask(tasks, tasks[0].id, { profile: busy, settings: settings({ habits: ['water'] }), date: D, catalog: only });
    expect(next).toBe(tasks);
  });
});
```

- [ ] **Step 3: Chạy để thấy thất bại**

Run: `npx vitest run tests/domain/suggest.test.ts`
Expected: FAIL (không tìm thấy `suggest`).

- [ ] **Step 4: Tạo `src/domain/suggest.ts`**

```ts
import { CATALOG, personalize } from './catalog';
import type { Activity, DayTask, Goal, Habit, Profile, Settings, TaskTemplate } from './types';

const RANK: Record<Activity, number> = { low: 0, medium: 1, high: 2 };
const GOAL_HABIT: Partial<Record<Goal, Habit>> = { fitness: 'exercise', weight: 'walk', sleep: 'sleep' };

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SuggestInput {
  profile: Profile | null;
  settings: Settings;
  date: string;
  previous?: DayTask[];
  catalog?: TaskTemplate[];
}

function poolFor(input: Omit<SuggestInput, 'previous'>): TaskTemplate[] {
  const level = RANK[input.profile?.activity ?? 'low'];
  const { habits, customTasks } = input.settings;
  return [...(input.catalog ?? CATALOG), ...customTasks].filter(
    (t) => (habits.length === 0 || habits.includes(t.habit)) && RANK[t.minActivity ?? 'low'] <= level,
  );
}

function toDayTask(t: TaskTemplate, profile: Profile | null, id: string): DayTask {
  return {
    id,
    templateId: t.id,
    habit: t.habit,
    title: personalize(t, profile),
    minutes: t.minutes,
    points: t.points,
    status: 'pending',
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function suggestTasks(input: SuggestInput): DayTask[] {
  const pool = poolFor(input);
  if (pool.length === 0) return [];
  const budget = input.profile?.minutesPerDay ?? 30;
  const rand = rng(hashSeed(input.date));
  const prevIds = new Set((input.previous ?? []).map((t) => t.templateId));

  let habits = shuffle([...new Set(pool.map((t) => t.habit))], rand);
  const goalHabit = input.profile ? GOAL_HABIT[input.profile.goal] : undefined;
  if (goalHabit && habits.includes(goalHabit)) {
    habits = [goalHabit, ...habits.filter((h) => h !== goalHabit)];
  }

  const target = 3 + Math.floor(rand() * 3); // 3..5
  const picks: TaskTemplate[] = [];
  let used = 0;
  for (let round = 0; round < 3 && picks.length < target; round++) {
    for (const h of habits) {
      if (picks.length >= target) break;
      const options = pool.filter((t) => t.habit === h && !picks.includes(t));
      if (options.length === 0) continue;
      const fresh = options.filter((t) => !prevIds.has(t.id));
      const list = fresh.length > 0 ? fresh : options;
      const t = list[Math.floor(rand() * list.length)];
      if (used + t.minutes <= budget) {
        picks.push(t);
        used += t.minutes;
      }
    }
  }
  if (picks.length === 0) {
    picks.push([...pool].sort((a, b) => a.minutes - b.minutes)[0]);
  }
  return picks.map((t, i) => toDayTask(t, input.profile, `${input.date}-${i}`));
}

export function swapTask(
  tasks: DayTask[],
  taskId: string,
  input: Omit<SuggestInput, 'previous'>,
): DayTask[] {
  const old = tasks.find((t) => t.id === taskId);
  if (!old || old.status !== 'pending') return tasks;
  const used = new Set(tasks.filter((t) => t.status !== 'swapped').map((t) => t.templateId));
  const options = poolFor(input).filter((t) => t.habit === old.habit && !used.has(t.id));
  if (options.length === 0) return tasks;
  const rand = rng(hashSeed(`${input.date}:${taskId}:${tasks.length}`));
  const t = options[Math.floor(rand() * options.length)];
  const next = toDayTask(t, input.profile, `${input.date}-${tasks.length}`);
  return tasks.flatMap((x) => (x.id === taskId ? [{ ...x, status: 'swapped' as const }, next] : [x]));
}
```

- [ ] **Step 5: Chạy test**

Run: `npx vitest run tests/domain/suggest.test.ts`
Expected: PASS. Nếu test "3 to 5 tasks" fail ở ngày nào đó vì quỹ 60 phút không đủ chỗ cho 3 nhiệm vụ, điều chỉnh `minutes` của mẫu lớn nhất trong `CATALOG` chứ không nới lỏng test.

- [ ] **Step 6: Commit**

```bash
git add src/domain tests/domain
git commit -m "feat(domain): task catalog, deterministic daily suggestion and swap"
```

---

### Task 4: Vườn, điểm và mở khóa

**Files:**
- Create: `src/domain/garden.ts`, `src/domain/scoring.ts`, `tests/domain/garden.test.ts`, `tests/domain/scoring.test.ts`

**Interfaces:**
- Consumes: `types.ts`.
- Produces (`garden.ts`):
  - `LEVEL_THRESHOLDS: number[]`, `levelForPoints(p: number): number`, `pointsToLevel(level: number): number | null`
  - `gridSize(level: number): number`
  - `interface GardenItem { id: string; name: string; kind: 'plant' | 'decor'; level: number; maxCount: number | null; art: string }`
  - `ITEMS: GardenItem[]`, `getItem(id: string): GardenItem | undefined`
  - `growthStage(item: GardenItem, unlockedLevel: number): 0 | 1 | 2`
  - `canPlace(g: Garden, itemId: string, cell: number): { ok: true } | { ok: false; reason: string }`
  - `placeItem(g, itemId, cell): Garden`, `removeAt(g, cell): Garden`, `moveItem(g, from, to): Garden`
- Produces (`scoring.ts`): `dayPoints(tasks: DayTask[]): number`, `totalPoints(days: Record<string, DayTask[]>): number`, `syncGarden(data: AppData): AppData`.

- [ ] **Step 1: Viết test thất bại** `tests/domain/scoring.test.ts`

```ts
import { dayPoints, syncGarden, totalPoints } from '../../src/domain/scoring';
import { levelForPoints } from '../../src/domain/garden';
import type { AppData, DayTask } from '../../src/domain/types';

const task = (id: string, points: number, status: DayTask['status']): DayTask => ({
  id, templateId: id, habit: 'walk', title: id, minutes: 5, points, status,
});
const data = (days: AppData['days'], unlockedLevel = 0): AppData => ({
  version: 1,
  profile: null,
  settings: { habits: [], reminderTime: '20:00', notificationsEnabled: false, customTasks: [] },
  days,
  garden: { name: 'v', unlockedLevel, placed: [] },
});

describe('scoring', () => {
  it('counts only done tasks', () => {
    expect(dayPoints([task('a', 3, 'done'), task('b', 5, 'pending'), task('c', 2, 'skipped'), task('d', 4, 'swapped')])).toBe(3);
  });
  it('sums across days and ignores empty/missed days', () => {
    expect(totalPoints({ '2026-10-01': [task('a', 3, 'done')], '2026-10-02': [], '2026-10-03': [task('b', 2, 'pending')] })).toBe(3);
  });
  it('maps points to levels', () => {
    expect(levelForPoints(0)).toBe(0);
    expect(levelForPoints(9)).toBe(0);
    expect(levelForPoints(10)).toBe(1);
    expect(levelForPoints(25)).toBe(2);
    expect(levelForPoints(10000)).toBe(7);
  });
  it('raises unlockedLevel when points grow', () => {
    const next = syncGarden(data({ d: [task('a', 12, 'done')] }));
    expect(next.garden.unlockedLevel).toBe(1);
  });
  it('never lowers unlockedLevel when points drop', () => {
    const next = syncGarden(data({ d: [task('a', 12, 'pending')] }, 3));
    expect(next.garden.unlockedLevel).toBe(3);
  });
});
```

- [ ] **Step 2: Viết test thất bại** `tests/domain/garden.test.ts`

```ts
import { canPlace, getItem, gridSize, growthStage, ITEMS, moveItem, placeItem, removeAt } from '../../src/domain/garden';
import type { Garden } from '../../src/domain/types';

const g = (unlockedLevel: number, placed: Garden['placed'] = []): Garden => ({ name: 'v', unlockedLevel, placed });

describe('garden grid', () => {
  it('starts at 6x6 and grows slowly up to 8x8', () => {
    expect(gridSize(0)).toBe(6);
    expect(gridSize(2)).toBe(6);
    expect(gridSize(3)).toBe(7);
    expect(gridSize(6)).toBe(8);
    expect(gridSize(99)).toBe(8);
  });
});

describe('placement rules', () => {
  // Review Focus 5
  it('rejects unknown item, locked item, out-of-grid cell and occupied cell', () => {
    expect(canPlace(g(0), 'nope', 0)).toMatchObject({ ok: false });
    expect(canPlace(g(0), 'daisy', 0)).toMatchObject({ ok: false }); // daisy level 1
    expect(canPlace(g(1), 'daisy', 36)).toMatchObject({ ok: false }); // 6x6 => 0..35
    expect(canPlace(g(1), 'daisy', -1)).toMatchObject({ ok: false });
    expect(canPlace(g(1), 'daisy', 1.5)).toMatchObject({ ok: false });
    expect(canPlace(g(1, [{ cell: 0, itemId: 'grass' }]), 'daisy', 0)).toMatchObject({ ok: false });
  });
  it('enforces maxCount', () => {
    const placed = [{ cell: 0, itemId: 'pond' }];
    expect(canPlace(g(5, placed), 'pond', 1)).toMatchObject({ ok: false });
    expect(canPlace(g(5, placed), 'grass', 1)).toEqual({ ok: true });
  });
  it('places, removes and moves without mutating the input', () => {
    const start = g(1);
    const placed = placeItem(start, 'daisy', 3);
    expect(start.placed).toHaveLength(0);
    expect(placed.placed).toEqual([{ cell: 3, itemId: 'daisy' }]);
    expect(moveItem(placed, 3, 5).placed).toEqual([{ cell: 5, itemId: 'daisy' }]);
    expect(moveItem(placed, 3, 99)).toBe(placed);
    expect(removeAt(placed, 3).placed).toEqual([]);
  });
  it('returns the same garden object for an invalid placement', () => {
    const start = g(0);
    expect(placeItem(start, 'daisy', 0)).toBe(start);
  });
});

describe('growth stages', () => {
  it('grows plants with level and keeps decor fully grown', () => {
    const daisy = getItem('daisy')!; // level 1
    expect(growthStage(daisy, 1)).toBe(0);
    expect(growthStage(daisy, 2)).toBe(1);
    expect(growthStage(daisy, 5)).toBe(2);
    expect(growthStage(getItem('bench')!, 3)).toBe(2);
  });
  it('has unique item ids', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });
});
```

- [ ] **Step 3: Chạy để thấy thất bại**

Run: `npx vitest run tests/domain/garden.test.ts tests/domain/scoring.test.ts`
Expected: FAIL (thiếu module).

- [ ] **Step 4: Tạo `src/domain/garden.ts`**

```ts
import type { Garden } from './types';

export const LEVEL_THRESHOLDS = [0, 10, 25, 45, 70, 100, 140, 190];

export function levelForPoints(p: number): number {
  let level = 0;
  LEVEL_THRESHOLDS.forEach((th, i) => {
    if (p >= th) level = i;
  });
  return level;
}

export function pointsToLevel(level: number): number | null {
  return level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : null;
}

export function gridSize(level: number): number {
  return Math.min(8, 6 + Math.floor(level / 3));
}

export interface GardenItem {
  id: string;
  name: string;
  kind: 'plant' | 'decor';
  level: number;
  maxCount: number | null;
  art: string; // markup SVG bên trong viewBox 0 0 48 48
}

const STEM = '<rect x="23" y="22" width="2" height="18" fill="#388e3c"/>';

export const ITEMS: GardenItem[] = [
  { id: 'grass', name: 'Cỏ xanh', kind: 'plant', level: 0, maxCount: null,
    art: '<path d="M14 40 L18 22 L22 40 M24 40 L24 16 L28 40 M30 40 L36 24 L38 40" fill="#4caf50"/>' },
  { id: 'daisy', name: 'Hoa cúc', kind: 'plant', level: 1, maxCount: null,
    art: `${STEM}<circle cx="24" cy="18" r="6" fill="#fff" stroke="#bdbdbd"/><circle cx="24" cy="18" r="3" fill="#fbc02d"/>` },
  { id: 'stone', name: 'Hòn đá', kind: 'decor', level: 1, maxCount: null,
    art: '<ellipse cx="24" cy="34" rx="10" ry="6" fill="#9e9e9e"/>' },
  { id: 'tulip', name: 'Hoa tulip', kind: 'plant', level: 2, maxCount: null,
    art: `${STEM}<path d="M17 12 Q24 30 31 12 L27 16 L24 10 L21 16 Z" fill="#e91e63"/>` },
  { id: 'sunflower', name: 'Hướng dương', kind: 'plant', level: 3, maxCount: null,
    art: `${STEM}<circle cx="24" cy="16" r="8" fill="#fdd835"/><circle cx="24" cy="16" r="4" fill="#6d4c41"/>` },
  { id: 'bench', name: 'Ghế đá', kind: 'decor', level: 3, maxCount: 2,
    art: '<rect x="10" y="26" width="28" height="5" fill="#8d6e63"/><rect x="12" y="31" width="3" height="8" fill="#5d4037"/><rect x="33" y="31" width="3" height="8" fill="#5d4037"/>' },
  { id: 'apple-tree', name: 'Cây táo', kind: 'plant', level: 4, maxCount: 4,
    art: '<rect x="21" y="26" width="6" height="14" fill="#6d4c41"/><circle cx="24" cy="18" r="12" fill="#43a047"/><circle cx="19" cy="16" r="2" fill="#e53935"/><circle cx="29" cy="20" r="2" fill="#e53935"/>' },
  { id: 'lantern', name: 'Đèn lồng', kind: 'decor', level: 4, maxCount: null,
    art: '<rect x="23" y="12" width="2" height="26" fill="#616161"/><rect x="19" y="8" width="10" height="10" rx="2" fill="#ffca28"/>' },
  { id: 'pond', name: 'Hồ nước', kind: 'decor', level: 5, maxCount: 1,
    art: '<ellipse cx="24" cy="30" rx="18" ry="10" fill="#4fc3f7"/><ellipse cx="24" cy="30" rx="12" ry="6" fill="#81d4fa"/>' },
  { id: 'cherry-tree', name: 'Cây anh đào', kind: 'plant', level: 6, maxCount: 2,
    art: '<rect x="21" y="26" width="6" height="14" fill="#6d4c41"/><circle cx="24" cy="18" r="12" fill="#f48fb1"/>' },
  { id: 'bridge', name: 'Cây cầu nhỏ', kind: 'decor', level: 7, maxCount: 1,
    art: '<path d="M6 32 Q24 12 42 32" stroke="#8d6e63" stroke-width="5" fill="none"/>' },
];

export function getItem(id: string): GardenItem | undefined {
  return ITEMS.find((i) => i.id === id);
}

export function growthStage(item: GardenItem, unlockedLevel: number): 0 | 1 | 2 {
  if (item.kind === 'decor') return 2;
  return Math.max(0, Math.min(2, unlockedLevel - item.level)) as 0 | 1 | 2;
}

export type PlaceCheck = { ok: true } | { ok: false; reason: string };

export function canPlace(g: Garden, itemId: string, cell: number): PlaceCheck {
  const item = getItem(itemId);
  if (!item) return { ok: false, reason: 'Món này không tồn tại.' };
  if (item.level > g.unlockedLevel) return { ok: false, reason: 'Món này chưa được mở khóa.' };
  const size = gridSize(g.unlockedLevel);
  if (!Number.isInteger(cell) || cell < 0 || cell >= size * size) return { ok: false, reason: 'Ô này không nằm trong khu vườn.' };
  if (g.placed.some((p) => p.cell === cell)) return { ok: false, reason: 'Ô này đã có món khác.' };
  if (item.maxCount !== null && g.placed.filter((p) => p.itemId === itemId).length >= item.maxCount) {
    return { ok: false, reason: `Chỉ đặt được tối đa ${item.maxCount} ${item.name}.` };
  }
  return { ok: true };
}

export function placeItem(g: Garden, itemId: string, cell: number): Garden {
  if (!canPlace(g, itemId, cell).ok) return g;
  return { ...g, placed: [...g.placed, { cell, itemId }] };
}

export function removeAt(g: Garden, cell: number): Garden {
  return { ...g, placed: g.placed.filter((p) => p.cell !== cell) };
}

export function moveItem(g: Garden, from: number, to: number): Garden {
  const found = g.placed.find((p) => p.cell === from);
  if (!found) return g;
  const size = gridSize(g.unlockedLevel);
  if (!Number.isInteger(to) || to < 0 || to >= size * size || g.placed.some((p) => p.cell === to)) return g;
  return { ...g, placed: g.placed.map((p) => (p.cell === from ? { ...p, cell: to } : p)) };
}
```

- [ ] **Step 5: Tạo `src/domain/scoring.ts`**

```ts
import { levelForPoints } from './garden';
import type { AppData, DayTask } from './types';

export const dayPoints = (tasks: DayTask[]): number =>
  tasks.filter((t) => t.status === 'done').reduce((s, t) => s + t.points, 0);

export const totalPoints = (days: Record<string, DayTask[]>): number =>
  Object.values(days).reduce((s, tasks) => s + dayPoints(tasks), 0);

/** Nâng unlockedLevel nếu điểm đạt ngưỡng mới; không bao giờ hạ. */
export function syncGarden(data: AppData): AppData {
  const level = levelForPoints(totalPoints(data.days));
  return level > data.garden.unlockedLevel
    ? { ...data, garden: { ...data.garden, unlockedLevel: level } }
    : data;
}
```

- [ ] **Step 6: Chạy test**

Run: `npx vitest run tests/domain`
Expected: PASS toàn bộ.

- [ ] **Step 7: Commit**

```bash
git add src/domain tests/domain
git commit -m "feat(domain): garden items, placement rules, scoring and level sync"
```

---

### Task 5: Số liệu Tiến độ

**Files:**
- Create: `src/domain/progress.ts`, `tests/domain/progress.test.ts`

**Interfaces:**
- Consumes: `date.ts` (`addDays`, `weekStart`), `types.ts`.
- Produces:
  - `weeklySummary(days, anyDateInWeek: string): { weekStart: string; done: number; total: number; points: number; perDay: { date: string; done: number; total: number }[] }`
  - `habitCounts(days, anyDate: string, weeks?: number): { weekStart: string; counts: Record<Habit, number> }[]` (cũ → mới)
  - `milestones(days): { id: string; label: string; reached: boolean }[]`
  - `historyDays(days): { date: string; done: number; total: number }[]` (mới → cũ, chỉ ngày có nhiệm vụ)
- "Total" không tính nhiệm vụ `swapped`. "Giờ ngủ" được thể hiện bằng số lần hoàn thành nhiệm vụ thói quen `sleep`.

- [ ] **Step 1: Viết test thất bại** `tests/domain/progress.test.ts`

```ts
import { habitCounts, historyDays, milestones, weeklySummary } from '../../src/domain/progress';
import type { DayTask, Habit } from '../../src/domain/types';

const t = (id: string, habit: Habit, status: DayTask['status'], points = 2): DayTask => ({
  id, templateId: id, habit, title: id, minutes: 5, points, status,
});

const days = {
  '2026-10-05': [t('a', 'walk', 'done', 3), t('b', 'water', 'pending'), t('c', 'sleep', 'swapped')],
  '2026-10-07': [t('d', 'walk', 'done', 3), t('e', 'exercise', 'done', 4)],
  '2026-09-29': [t('f', 'walk', 'done', 3)],
};

describe('weeklySummary', () => {
  it('summarises the Monday-based week, excluding swapped tasks from total', () => {
    const w = weeklySummary(days, '2026-10-09');
    expect(w.weekStart).toBe('2026-10-05');
    expect(w.done).toBe(3);
    expect(w.total).toBe(4);
    expect(w.points).toBe(10);
    expect(w.perDay).toHaveLength(7);
    expect(w.perDay[0]).toEqual({ date: '2026-10-05', done: 1, total: 2 });
    expect(w.perDay[1]).toEqual({ date: '2026-10-06', done: 0, total: 0 });
  });
});

describe('habitCounts', () => {
  it('counts done tasks per habit per week, oldest first', () => {
    const rows = habitCounts(days, '2026-10-09', 2);
    expect(rows.map((r) => r.weekStart)).toEqual(['2026-09-28', '2026-10-05']);
    expect(rows[0].counts.walk).toBe(1);
    expect(rows[1].counts.walk).toBe(2);
    expect(rows[1].counts.exercise).toBe(1);
    expect(rows[1].counts.sleep).toBe(0);
  });
});

describe('milestones', () => {
  it('marks reached milestones from totals only', () => {
    const m = milestones(days);
    expect(m.find((x) => x.id === 'first')!.reached).toBe(true);
    expect(m.find((x) => x.id === 'done10')!.reached).toBe(false);
  });
  it('is not reached for an empty history', () => {
    expect(milestones({}).every((x) => !x.reached)).toBe(true);
  });
});

describe('historyDays', () => {
  it('lists days with tasks, newest first', () => {
    const h = historyDays({ ...days, '2026-10-06': [] });
    expect(h.map((x) => x.date)).toEqual(['2026-10-07', '2026-10-05', '2026-09-29']);
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/domain/progress.test.ts`
Expected: FAIL.

- [ ] **Step 3: Tạo `src/domain/progress.ts`**

```ts
import { addDays, weekStart } from './date';
import { ALL_HABITS, type DayTask, type Habit } from './types';

type Days = Record<string, DayTask[]>;
const real = (tasks: DayTask[] = []) => tasks.filter((t) => t.status !== 'swapped');
const doneOf = (tasks: DayTask[] = []) => tasks.filter((t) => t.status === 'done');

export function weeklySummary(days: Days, anyDateInWeek: string) {
  const start = weekStart(anyDateInWeek);
  const perDay = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, done: doneOf(days[date]).length, total: real(days[date]).length };
  });
  const points = perDay.reduce(
    (s, d) => s + doneOf(days[d.date]).reduce((a, t) => a + t.points, 0),
    0,
  );
  return {
    weekStart: start,
    done: perDay.reduce((s, d) => s + d.done, 0),
    total: perDay.reduce((s, d) => s + d.total, 0),
    points,
    perDay,
  };
}

export function habitCounts(days: Days, anyDate: string, weeks = 4) {
  const current = weekStart(anyDate);
  return Array.from({ length: weeks }, (_, w) => {
    const start = addDays(current, -7 * (weeks - 1 - w));
    const counts = Object.fromEntries(ALL_HABITS.map((h) => [h, 0])) as Record<Habit, number>;
    for (let i = 0; i < 7; i++) {
      for (const t of doneOf(days[addDays(start, i)])) counts[t.habit] += 1;
    }
    return { weekStart: start, counts };
  });
}

export function milestones(days: Days) {
  const all = Object.values(days);
  const doneCount = all.reduce((s, d) => s + doneOf(d).length, 0);
  const activeDays = all.filter((d) => doneOf(d).length > 0).length;
  return [
    { id: 'first', label: 'Nhiệm vụ đầu tiên', reached: doneCount >= 1 },
    { id: 'done10', label: '10 nhiệm vụ hoàn thành', reached: doneCount >= 10 },
    { id: 'done50', label: '50 nhiệm vụ hoàn thành', reached: doneCount >= 50 },
    { id: 'done100', label: '100 nhiệm vụ hoàn thành', reached: doneCount >= 100 },
    { id: 'days7', label: '7 ngày có hoạt động', reached: activeDays >= 7 },
    { id: 'days30', label: '30 ngày có hoạt động', reached: activeDays >= 30 },
  ];
}

export function historyDays(days: Days) {
  return Object.keys(days)
    .filter((d) => real(days[d]).length > 0)
    .sort()
    .reverse()
    .map((date) => ({ date, done: doneOf(days[date]).length, total: real(days[date]).length }));
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run tests/domain/progress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain tests/domain
git commit -m "feat(domain): derive weekly summary, trends, milestones and history from days"
```

---

### Task 6: Lưu trữ và store trung tâm

**Files:**
- Create: `src/state/storage.ts`, `src/state/store.ts`, `tests/state/storage.test.ts`, `tests/state/store.test.ts`

**Interfaces:**
- Consumes: `types.ts`, `suggest.ts` (`suggestTasks`, `swapTask`), `garden.ts` (`canPlace`, `placeItem`, `removeAt`, `moveItem`), `scoring.ts` (`syncGarden`).
- Produces (`storage.ts`):
  - `STORAGE_KEY = 'life-garden:v1'`
  - `emptyData(): AppData` (tạo object mới mỗi lần)
  - `parseData(text: string): AppData` (ném `Error` nếu không hợp lệ)
  - `type LoadStatus = 'ok' | 'empty' | 'corrupt' | 'unavailable'`
  - `loadData(): { status: LoadStatus; data: AppData }`
  - `saveData(data: AppData): boolean`
- Produces (`store.ts`): `useStore` với state `{ data: AppData; storageStatus: LoadStatus }` và actions:
  - `completeSetup(profile: Profile, settings: Partial<Settings>): void`
  - `updateProfile(patch: Partial<Profile>): void`, `updateSettings(patch: Partial<Settings>): void`
  - `ensureDay(date: string): void`
  - `toggleDone(date, taskId)`, `skipTask(date, taskId)`, `swap(date, taskId)`: `void`
  - `addCustomTask(date, input: { title: string; minutes: number; habit: Habit }): boolean`
  - `placeItem(itemId, cell): string | null` (trả lý do lỗi hoặc `null`), `removeItem(cell)`, `moveItem(from, to)`, `renameGarden(name)`
  - `exportText(): string`, `importText(text): { ok: boolean; error?: string }`, `resetAll(): void`
  - `startPersistence(): () => void`

- [ ] **Step 1: Viết test thất bại** `tests/state/storage.test.ts`

```ts
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
```

- [ ] **Step 2: Viết test thất bại** `tests/state/store.test.ts`

```ts
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
```

- [ ] **Step 3: Chạy để thấy thất bại**

Run: `npx vitest run tests/state`
Expected: FAIL (thiếu module).

- [ ] **Step 4: Tạo `src/state/storage.ts`**

```ts
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
```

- [ ] **Step 5: Tạo `src/state/store.ts`**

```ts
import { create } from 'zustand';
import { canPlace, moveItem as moveInGarden, placeItem as placeInGarden, removeAt } from '../domain/garden';
import { syncGarden } from '../domain/scoring';
import { suggestTasks, swapTask } from '../domain/suggest';
import {
  DEFAULT_PROFILE, type AppData, type DayTask, type Habit, type Profile, type Settings,
} from '../domain/types';
import { emptyData, loadData, parseData, saveData, type LoadStatus } from './storage';

interface State {
  data: AppData;
  storageStatus: LoadStatus;
  completeSetup(profile: Profile, settings: Partial<Settings>): void;
  updateProfile(patch: Partial<Profile>): void;
  updateSettings(patch: Partial<Settings>): void;
  ensureDay(date: string): void;
  toggleDone(date: string, taskId: string): void;
  skipTask(date: string, taskId: string): void;
  swap(date: string, taskId: string): void;
  addCustomTask(date: string, input: { title: string; minutes: number; habit: Habit }): boolean;
  placeItem(itemId: string, cell: number): string | null;
  removeItem(cell: number): void;
  moveItem(from: number, to: number): void;
  renameGarden(name: string): void;
  exportText(): string;
  importText(text: string): { ok: boolean; error?: string };
  resetAll(): void;
}

export const useStore = create<State>()((set, get) => {
  const loaded = loadData();
  const commit = (data: AppData) => set({ data: syncGarden(data) });
  const patchDay = (date: string, fn: (tasks: DayTask[], data: AppData) => DayTask[]) => {
    const { data } = get();
    const tasks = data.days[date];
    if (!tasks) return;
    commit({ ...data, days: { ...data.days, [date]: fn(tasks, data) } });
  };
  const mapTask = (date: string, id: string, fn: (t: DayTask) => DayTask) =>
    patchDay(date, (tasks) => tasks.map((t) => (t.id === id ? fn(t) : t)));

  return {
    data: loaded.data,
    storageStatus: loaded.status,

    completeSetup: (profile, settings) => {
      const { data } = get();
      commit({ ...data, profile, settings: { ...data.settings, ...settings } });
    },
    updateProfile: (patch) => {
      const { data } = get();
      commit({ ...data, profile: { ...(data.profile ?? DEFAULT_PROFILE), ...patch } });
    },
    updateSettings: (patch) => {
      const { data } = get();
      commit({ ...data, settings: { ...data.settings, ...patch } });
    },

    ensureDay: (date) => {
      const { data } = get();
      if (!data.profile || data.days[date]) return;
      const prevKey = Object.keys(data.days).filter((k) => k < date).sort().pop();
      const tasks = suggestTasks({
        profile: data.profile,
        settings: data.settings,
        date,
        previous: prevKey ? data.days[prevKey] : undefined,
      });
      commit({ ...data, days: { ...data.days, [date]: tasks } });
    },

    toggleDone: (date, id) =>
      mapTask(date, id, (t) =>
        t.status === 'done' ? { ...t, status: 'pending' }
        : t.status === 'pending' || t.status === 'skipped' ? { ...t, status: 'done' }
        : t),
    skipTask: (date, id) =>
      mapTask(date, id, (t) =>
        t.status === 'pending' ? { ...t, status: 'skipped' }
        : t.status === 'skipped' ? { ...t, status: 'pending' }
        : t),
    swap: (date, id) =>
      patchDay(date, (tasks, data) =>
        swapTask(tasks, id, { profile: data.profile, settings: data.settings, date })),

    addCustomTask: (date, { title, minutes, habit }) => {
      const name = title.trim();
      if (!name || !Number.isInteger(minutes) || minutes <= 0) return false;
      get().ensureDay(date);
      const { data } = get();
      if (!data.days[date]) return false;
      const template = {
        id: `custom-${Date.now()}`, habit, title: name, minutes, points: Math.max(1, Math.round(minutes / 5)),
      };
      const task: DayTask = {
        id: `${date}-${data.days[date].length}`, templateId: template.id, habit, title: name,
        minutes, points: template.points, status: 'pending',
      };
      commit({
        ...data,
        settings: { ...data.settings, customTasks: [...data.settings.customTasks, template] },
        days: { ...data.days, [date]: [...data.days[date], task] },
      });
      return true;
    },

    placeItem: (itemId, cell) => {
      const { data } = get();
      const check = canPlace(data.garden, itemId, cell);
      if (!check.ok) return check.reason;
      commit({ ...data, garden: placeInGarden(data.garden, itemId, cell) });
      return null;
    },
    removeItem: (cell) => {
      const { data } = get();
      commit({ ...data, garden: removeAt(data.garden, cell) });
    },
    moveItem: (from, to) => {
      const { data } = get();
      commit({ ...data, garden: moveInGarden(data.garden, from, to) });
    },
    renameGarden: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const { data } = get();
      commit({ ...data, garden: { ...data.garden, name: trimmed } });
    },

    exportText: () => JSON.stringify(get().data, null, 2),
    importText: (text) => {
      try {
        set({ data: syncGarden(parseData(text)), storageStatus: 'ok' });
        return { ok: true };
      } catch {
        return { ok: false, error: 'Tệp không hợp lệ nên chưa thay đổi gì.' };
      }
    },
    resetAll: () => set({ data: emptyData(), storageStatus: 'ok' }),
  };
});

/** Tự lưu mỗi khi dữ liệu đổi; không ghi đè khi dữ liệu cũ bị hỏng. */
export function startPersistence(): () => void {
  return useStore.subscribe((state, prev) => {
    if (state.data === prev.data || state.storageStatus === 'corrupt') return;
    if (!saveData(state.data) && state.storageStatus !== 'unavailable') {
      useStore.setState({ storageStatus: 'unavailable' });
    }
  });
}
```

- [ ] **Step 6: Chạy test**

Run: `npx vitest run tests/state`
Expected: PASS. Lưu ý: test "swap" ghi đè `data.days` rồi `ensureDay` lại để dùng hồ sơ `high`/60 phút; nếu danh sách có thói quen duy nhất không đổi được thì chỉnh seed của test chứ không đổi logic.

- [ ] **Step 7: Commit**

```bash
git add src/state tests/state
git commit -m "feat(state): local storage layer and central Zustand store"
```

---

### Task 7: Nhắc nhở

**Files:**
- Create: `src/notifications/reminders.ts`, `tests/domain/reminders.test.ts`

**Interfaces:**
- Consumes: `types.ts` (`DayTask`).
- Produces:
  - `parseTime(t: string): { h: number; m: number } | null`
  - `msUntil(time: string, now: Date): number` (> 0; về lần kế tiếp)
  - `isReminderDue(now: Date, time: string, tasks: DayTask[] | undefined, enabled: boolean): boolean`
  - `ensurePermission(): Promise<NotificationPermission | 'unsupported'>`
  - `startReminders(read: () => { enabled: boolean; time: string; pendingCount: number }, show?: (msg: string) => void): { rearm(): void; stop(): void }`

- [ ] **Step 1: Viết test thất bại** `tests/domain/reminders.test.ts`

```ts
import { isReminderDue, msUntil, parseTime, startReminders } from '../../src/notifications/reminders';
import type { DayTask } from '../../src/domain/types';

const pending: DayTask = { id: 'a', templateId: 'a', habit: 'walk', title: 'a', minutes: 1, points: 1, status: 'pending' };
const done: DayTask = { ...pending, status: 'done' };

describe('parseTime', () => {
  it('parses valid and rejects invalid times', () => {
    expect(parseTime('07:05')).toEqual({ h: 7, m: 5 });
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('7pm')).toBeNull();
    expect(parseTime('')).toBeNull();
  });
});

describe('msUntil', () => {
  it('returns time until later today', () => {
    expect(msUntil('20:00', new Date(2026, 9, 9, 19, 0, 0))).toBe(3600_000);
  });
  it('rolls over to tomorrow when the time has passed or is now', () => {
    expect(msUntil('08:00', new Date(2026, 9, 9, 20, 0, 0))).toBe(12 * 3600_000);
    expect(msUntil('20:00', new Date(2026, 9, 9, 20, 0, 0))).toBe(24 * 3600_000);
  });
  it('falls back to 20:00 for an invalid time', () => {
    expect(msUntil('xx', new Date(2026, 9, 9, 19, 0, 0))).toBe(3600_000);
  });
});

describe('isReminderDue', () => {
  const at = (h: number) => new Date(2026, 9, 9, h, 0, 0);
  it('is due after the reminder time while tasks are pending', () => {
    expect(isReminderDue(at(21), '20:00', [pending], true)).toBe(true);
  });
  it('is not due before the time, when disabled, or when nothing is pending', () => {
    expect(isReminderDue(at(19), '20:00', [pending], true)).toBe(false);
    expect(isReminderDue(at(21), '20:00', [pending], false)).toBe(false);
    expect(isReminderDue(at(21), '20:00', [done], true)).toBe(false);
    expect(isReminderDue(at(21), '20:00', undefined, true)).toBe(false);
  });
});

describe('startReminders', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires at the reminder time when tasks are pending and re-arms for the next day', () => {
    vi.setSystemTime(new Date(2026, 9, 9, 19, 0, 0));
    const show = vi.fn();
    const r = startReminders(() => ({ enabled: true, time: '20:00', pendingCount: 2 }), show);
    r.rearm();
    vi.advanceTimersByTime(3600_000);
    expect(show).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(24 * 3600_000);
    expect(show).toHaveBeenCalledTimes(2);
    r.stop();
  });
  it('stays silent when disabled or nothing is pending', () => {
    vi.setSystemTime(new Date(2026, 9, 9, 19, 0, 0));
    const show = vi.fn();
    let state = { enabled: false, time: '20:00', pendingCount: 2 };
    const r = startReminders(() => state, show);
    r.rearm();
    vi.advanceTimersByTime(3600_000);
    expect(show).not.toHaveBeenCalled();
    state = { enabled: true, time: '20:00', pendingCount: 0 };
    r.rearm();
    vi.advanceTimersByTime(24 * 3600_000);
    expect(show).not.toHaveBeenCalled();
    r.stop();
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/domain/reminders.test.ts`
Expected: FAIL.

- [ ] **Step 3: Tạo `src/notifications/reminders.ts`**

```ts
import type { DayTask } from '../domain/types';

export function parseTime(t: string): { h: number; m: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(t);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h < 24 && m < 60 ? { h, m } : null;
}

export function msUntil(time: string, now: Date): number {
  const { h, m } = parseTime(time) ?? { h: 20, m: 0 };
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function isReminderDue(now: Date, time: string, tasks: DayTask[] | undefined, enabled: boolean): boolean {
  if (!enabled || !tasks?.some((t) => t.status === 'pending')) return false;
  const { h, m } = parseTime(time) ?? { h: 20, m: 0 };
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

export async function ensurePermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

function defaultShow(message: string) {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('Life Garden', { body: message });
  }
}

export function startReminders(
  read: () => { enabled: boolean; time: string; pendingCount: number },
  show: (msg: string) => void = defaultShow,
): { rearm(): void; stop(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const rearm = () => {
    stop();
    const { enabled, time } = read();
    if (!enabled) return;
    timer = setTimeout(() => {
      if (read().pendingCount > 0) show('Đến giờ chăm sóc khu vườn của bạn rồi 🌱');
      rearm();
    }, msUntil(time, new Date()));
  };
  return { rearm, stop };
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run tests/domain/reminders.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notifications tests/domain
git commit -m "feat: reminder scheduling and in-app due check"
```

---

### Task 8: Khung giao diện, form hồ sơ, chào mừng, khôi phục

**Files:**
- Create: `src/ui/useToday.ts`, `src/ui/ProfileForm.tsx`, `src/ui/Welcome.tsx`, `src/ui/Recovery.tsx`, `src/ui/ItemArt.tsx`, `src/styles.css`, `tests/ui/welcome.test.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`, `tests/smoke.test.tsx` (thay bằng test App mới)

**Interfaces:**
- Consumes: `useStore`, `DEFAULT_PROFILE`, `ALL_HABITS`, `HABIT_LABEL`.
- Produces:
  - `useToday(): string` (cập nhật khi qua nửa đêm hoặc khi tab hiện lại)
  - `ProfileForm` props: `{ initial: FormValue; submitLabel: string; onSubmit(v: FormValue): void; children?: ReactNode }`, `interface FormValue { profile: Profile; habits: Habit[]; reminderTime: string }`
  - `ItemArt` props: `{ item: GardenItem; stage: 0 | 1 | 2; size?: number }`
  - `Welcome`, `Recovery` (không props)
  - `App` điều phối: `corrupt → Recovery`, `profile null → Welcome`, còn lại → Shell có 4 tab (`Hôm nay`, `Khu vườn`, `Tiến độ`, `Cài đặt`) và toast mở khóa. Các màn `Today`, `GardenScreen`, `ProgressScreen`, `SettingsScreen` do Task 9–11 tạo; trong task này `App` import chúng qua file tạm rỗng (xem Step 5).

- [ ] **Step 1: Viết test thất bại** `tests/ui/welcome.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import Welcome from '../../src/ui/Welcome';

beforeEach(() => useStore.setState({ data: emptyData(), storageStatus: 'empty' }));

describe('Welcome', () => {
  it('shows the medical disclaimer', () => {
    render(<Welcome />);
    expect(screen.getByText(/không thay thế tư vấn y tế/i)).toBeInTheDocument();
  });

  it('skipping creates a default profile with no personal data', async () => {
    render(<Welcome />);
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua' }));
    expect(useStore.getState().data.profile).toEqual(DEFAULT_PROFILE);
  });

  it('saves entered profile and chosen habits', async () => {
    render(<Welcome />);
    await userEvent.type(screen.getByLabelText('Cân nặng (kg)'), '65');
    await userEvent.selectOptions(screen.getByLabelText('Mục tiêu'), 'sleep');
    await userEvent.click(screen.getByLabelText('Đi bộ')); // bỏ chọn
    await userEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    const { profile, settings } = useStore.getState().data;
    expect(profile).toMatchObject({ weightKg: 65, goal: 'sleep' });
    expect(settings.habits).not.toContain('walk');
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/ui/welcome.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Tạo `src/ui/useToday.ts`**

```ts
import { useEffect, useState } from 'react';
import { dateKey } from '../domain/date';

export function useToday(): string {
  const [today, setToday] = useState(() => dateKey(new Date()));
  useEffect(() => {
    const tick = () => setToday(dateKey(new Date()));
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return today;
}
```

- [ ] **Step 4: Tạo `src/ui/ProfileForm.tsx`**

```tsx
import { useState, type ReactNode } from 'react';
import { ALL_HABITS, HABIT_LABEL, type Habit, type Profile } from '../domain/types';

export interface FormValue {
  profile: Profile;
  habits: Habit[];
  reminderTime: string;
}
interface Props {
  initial: FormValue;
  submitLabel: string;
  onSubmit(v: FormValue): void;
  children?: ReactNode;
}

const num = (s: string) => (s.trim() === '' ? undefined : Number(s));

export function ProfileForm({ initial, submitLabel, onSubmit, children }: Props) {
  const [p, setP] = useState<Profile>(initial.profile);
  const [habits, setHabits] = useState<Habit[]>(initial.habits);
  const [time, setTime] = useState(initial.reminderTime);
  const toggle = (h: Habit) => setHabits((x) => (x.includes(h) ? x.filter((y) => y !== h) : [...x, h]));

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          profile: { ...p, minutesPerDay: Math.max(5, p.minutesPerDay || 30) },
          habits,
          reminderTime: time,
        });
      }}
    >
      <label>Cân nặng (kg)
        <input type="number" min="0" value={p.weightKg ?? ''} onChange={(e) => setP({ ...p, weightKg: num(e.target.value) })} />
      </label>
      <label>Chiều cao (cm)
        <input type="number" min="0" value={p.heightCm ?? ''} onChange={(e) => setP({ ...p, heightCm: num(e.target.value) })} />
      </label>
      <label>Tuổi
        <input type="number" min="0" value={p.age ?? ''} onChange={(e) => setP({ ...p, age: num(e.target.value) })} />
      </label>
      <label>Giới tính
        <select value={p.gender ?? ''} onChange={(e) => setP({ ...p, gender: (e.target.value || undefined) as Profile['gender'] })}>
          <option value="">Không nói</option>
          <option value="female">Nữ</option>
          <option value="male">Nam</option>
          <option value="other">Khác</option>
        </select>
      </label>
      <label>Mục tiêu
        <select value={p.goal} onChange={(e) => setP({ ...p, goal: e.target.value as Profile['goal'] })}>
          <option value="general">Sống khỏe tổng quát</option>
          <option value="fitness">Tăng thể lực</option>
          <option value="weight">Quản lý cân nặng</option>
          <option value="sleep">Ngủ ngon hơn</option>
        </select>
      </label>
      <label>Mức độ vận động
        <select value={p.activity} onChange={(e) => setP({ ...p, activity: e.target.value as Profile['activity'] })}>
          <option value="low">Ít</option>
          <option value="medium">Vừa</option>
          <option value="high">Nhiều</option>
        </select>
      </label>
      <label>Thời gian rảnh mỗi ngày (phút)
        <input type="number" min="5" value={p.minutesPerDay} onChange={(e) => setP({ ...p, minutesPerDay: Number(e.target.value) })} />
      </label>
      <fieldset>
        <legend>Thói quen muốn xây dựng</legend>
        {ALL_HABITS.map((h) => (
          <label key={h} className="inline">
            <input type="checkbox" checked={habits.includes(h)} onChange={() => toggle(h)} />
            {HABIT_LABEL[h]}
          </label>
        ))}
      </fieldset>
      <label>Giờ nhắc nhở
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </label>
      <div className="row">
        <button type="submit" className="primary">{submitLabel}</button>
        {children}
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Tạo `Welcome`, `Recovery`, `ItemArt`**

`src/ui/Welcome.tsx`:
```tsx
import { ALL_HABITS, DEFAULT_PROFILE } from '../domain/types';
import { useStore } from '../state/store';
import { ProfileForm } from './ProfileForm';

export default function Welcome() {
  const completeSetup = useStore((s) => s.completeSetup);
  return (
    <main className="page">
      <h1>Chào mừng đến Life Garden 🌱</h1>
      <p>Mỗi ngày làm vài việc nhỏ cho sức khỏe, khu vườn của bạn sẽ lớn dần. Bỏ lỡ một ngày cũng không sao.</p>
      <ProfileForm
        initial={{ profile: DEFAULT_PROFILE, habits: ALL_HABITS, reminderTime: '20:00' }}
        submitLabel="Bắt đầu"
        onSubmit={({ profile, habits, reminderTime }) => completeSetup(profile, { habits, reminderTime })}
      >
        <button
          type="button"
          onClick={() => completeSetup(DEFAULT_PROFILE, { habits: ALL_HABITS, reminderTime: '20:00' })}
        >
          Bỏ qua
        </button>
      </ProfileForm>
      <p className="note">Gợi ý chỉ hỗ trợ xây dựng thói quen, không thay thế tư vấn y tế. Dữ liệu của bạn chỉ nằm trên thiết bị này.</p>
    </main>
  );
}
```

`src/ui/Recovery.tsx`:
```tsx
import { useState } from 'react';
import { useStore } from '../state/store';

export default function Recovery() {
  const importText = useStore((s) => s.importText);
  const resetAll = useStore((s) => s.resetAll);
  const [msg, setMsg] = useState('');
  return (
    <main className="page">
      <h1>Không đọc được dữ liệu đã lưu</h1>
      <p>Dữ liệu trên thiết bị có vẻ bị hỏng. Chúng tôi chưa xóa gì. Bạn có thể khôi phục từ tệp đã xuất trước đó hoặc bắt đầu lại.</p>
      <label>Khôi phục từ tệp
        <input
          type="file"
          accept="application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const r = importText(await file.text());
            if (!r.ok) setMsg(r.error ?? '');
          }}
        />
      </label>
      {msg && <p role="alert">{msg}</p>}
      <button onClick={resetAll}>Bắt đầu lại</button>
    </main>
  );
}
```

`src/ui/ItemArt.tsx`:
```tsx
import type { GardenItem } from '../domain/garden';

const SCALE = [0.5, 0.75, 1];

export function ItemArt({ item, stage, size = 40 }: { item: GardenItem; stage: 0 | 1 | 2; size?: number }) {
  const s = item.kind === 'plant' ? SCALE[stage] : 1;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={item.name}>
      <g
        transform={`translate(24 40) scale(${s}) translate(-24 -40)`}
        dangerouslySetInnerHTML={{ __html: item.art }}
      />
    </svg>
  );
}
```

- [ ] **Step 6: Tạo các màn tạm để App biên dịch được** (được thay thế thật ở Task 9–11)

`src/ui/Today.tsx`, `src/ui/GardenScreen.tsx`, `src/ui/ProgressScreen.tsx`, `src/ui/SettingsScreen.tsx` đều tạm là:
```tsx
export default function Placeholder() {
  return null;
}
```
(Today nhận prop `date: string` ở Task 9; tạm `export default function Today(_: { date: string }) { return null; }` với `_` đổi thành `{ date }: { date: string }` + `void date;` nếu `noUnusedParameters` báo lỗi.)

- [ ] **Step 7: Viết `src/App.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { ITEMS } from './domain/garden';
import { useStore } from './state/store';
import GardenScreen from './ui/GardenScreen';
import ProgressScreen from './ui/ProgressScreen';
import Recovery from './ui/Recovery';
import SettingsScreen from './ui/SettingsScreen';
import Today from './ui/Today';
import { useToday } from './ui/useToday';
import Welcome from './ui/Welcome';

type Tab = 'today' | 'garden' | 'progress' | 'settings';
const TABS: [Tab, string][] = [
  ['today', 'Hôm nay'],
  ['garden', 'Khu vườn'],
  ['progress', 'Tiến độ'],
  ['settings', 'Cài đặt'],
];

function Shell() {
  const [tab, setTab] = useState<Tab>('today');
  const today = useToday();
  const ensureDay = useStore((s) => s.ensureDay);
  const level = useStore((s) => s.data.garden.unlockedLevel);
  const status = useStore((s) => s.storageStatus);
  const prev = useRef(level);
  const [toast, setToast] = useState('');

  useEffect(() => ensureDay(today), [today, ensureDay]);
  useEffect(() => {
    if (level > prev.current) {
      const names = ITEMS.filter((i) => i.level > prev.current && i.level <= level).map((i) => i.name);
      setToast(`Bạn vừa mở khóa: ${names.join(', ')} 🎉`);
      const id = setTimeout(() => setToast(''), 5000);
      prev.current = level;
      return () => clearTimeout(id);
    }
    prev.current = level;
  }, [level]);

  return (
    <div className="shell">
      {status === 'unavailable' && (
        <p role="alert" className="banner">Không lưu được dữ liệu trên trình duyệt này. Tiến độ chỉ giữ trong phiên hiện tại.</p>
      )}
      {toast && <p role="status" className="toast">{toast}</p>}
      <main className="page">
        {tab === 'today' && <Today date={today} onOpenGarden={() => setTab('garden')} />}
        {tab === 'garden' && <GardenScreen />}
        {tab === 'progress' && <ProgressScreen date={today} />}
        {tab === 'settings' && <SettingsScreen />}
      </main>
      <nav className="tabs" aria-label="Điều hướng chính">
        {TABS.map(([id, label]) => (
          <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const status = useStore((s) => s.storageStatus);
  const profile = useStore((s) => s.data.profile);
  if (status === 'corrupt') return <Recovery />;
  if (!profile) return <Welcome />;
  return <Shell />;
}
```
Cập nhật tạm `Today` placeholder nhận `{ date: string; onOpenGarden(): void }`, `ProgressScreen` nhận `{ date: string }`.

- [ ] **Step 8: Viết `src/styles.css`** và nối vào `main.tsx`

`src/styles.css`:
```css
:root {
  --bg: #f6faf4; --fg: #1b2a1b; --card: #fff; --accent: #2e7d32; --muted: #5f6f5f; --line: #d6e3d3;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #121a12; --fg: #e6efe4; --card: #1c271c; --accent: #66bb6a; --muted: #9fb09c; --line: #2c3a2c; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; }
.shell { min-height: 100vh; padding-bottom: 64px; }
.page { max-width: 640px; margin: 0 auto; padding: 16px; }
.stack { display: grid; gap: 12px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
label { display: grid; gap: 4px; }
label.inline { display: inline-flex; align-items: center; gap: 6px; margin-right: 12px; }
input, select, button { font: inherit; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); color: var(--fg); }
button { cursor: pointer; min-height: 40px; }
button.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px; margin: 8px 0; }
.note { color: var(--muted); font-size: 14px; }
.tabs { position: fixed; bottom: 0; left: 0; right: 0; display: flex; background: var(--card); border-top: 1px solid var(--line); }
.tabs button { flex: 1; border: 0; border-radius: 0; background: transparent; }
.tabs button[aria-current='page'] { color: var(--accent); font-weight: 600; }
.banner, .toast { margin: 0; padding: 8px 16px; background: var(--accent); color: #fff; text-align: center; }
progress { width: 100%; }
.task { display: grid; gap: 8px; }
.task.done .title { text-decoration: line-through; color: var(--muted); }
.grid { display: grid; gap: 4px; }
.cell { aspect-ratio: 1; padding: 0; display: grid; place-items: center; min-height: 0; }
.cell[aria-pressed='true'] { outline: 3px solid var(--accent); }
.bar { display: flex; align-items: flex-end; gap: 4px; height: 80px; }
.bar > div { flex: 1; background: var(--accent); border-radius: 4px 4px 0 0; min-height: 2px; }
```

`src/main.tsx` (thay toàn bộ):
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { dateKey } from './domain/date';
import { startReminders } from './notifications/reminders';
import { startPersistence, useStore } from './state/store';
import './styles.css';

startPersistence();

const pendingToday = () => useStore.getState().data.days[dateKey(new Date())]?.filter((t) => t.status === 'pending').length ?? 0;
const reminders = startReminders(() => {
  const { settings } = useStore.getState().data;
  return { enabled: settings.notificationsEnabled, time: settings.reminderTime, pendingCount: pendingToday() };
});
reminders.rearm();
useStore.subscribe((s, p) => {
  if (s.data.settings !== p.data.settings) reminders.rearm();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 9: Thay `tests/smoke.test.tsx`** bằng test App

```tsx
import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { DEFAULT_PROFILE } from '../src/domain/types';
import { emptyData, STORAGE_KEY } from '../src/state/storage';
import { useStore } from '../src/state/store';

describe('App routing', () => {
  it('shows Welcome when there is no profile', () => {
    useStore.setState({ data: emptyData(), storageStatus: 'empty' });
    render(<App />);
    expect(screen.getByRole('heading', { name: /Chào mừng/ })).toBeInTheDocument();
  });
  it('shows the tab bar once the profile exists', () => {
    useStore.setState({ data: { ...emptyData(), profile: DEFAULT_PROFILE }, storageStatus: 'ok' });
    render(<App />);
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument();
  });
  it('shows recovery for corrupt data', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    useStore.setState({ storageStatus: 'corrupt' });
    render(<App />);
    expect(screen.getByRole('heading', { name: /Không đọc được dữ liệu/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Chạy test và build**

Run: `npx vitest run && npm run build`
Expected: toàn bộ PASS; build thành công.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(ui): app shell, profile form, welcome and recovery screens"
```

---

### Task 9: Màn hình Hôm nay

**Files:**
- Modify: `src/ui/Today.tsx` (thay placeholder)
- Create: `tests/ui/today.test.tsx`

**Interfaces:**
- Consumes: store (`toggleDone`, `skipTask`, `swap`, `addCustomTask`), `dayPoints`, `isReminderDue`, `HABIT_LABEL`.
- Produces: `Today` với props `{ date: string; onOpenGarden(): void }`. Nút có tên truy cập: `Hoàn thành: {title}` (`aria-pressed` = đã xong), `Đổi: {title}`, `Bỏ qua: {title}`. Dòng tiến độ `"{done}/{total} nhiệm vụ"` (không tính `swapped`).

- [ ] **Step 1: Viết test thất bại** `tests/ui/today.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE, type DayTask } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import Today from '../../src/ui/Today';

const D = '2026-10-09';
const mk = (id: string, title: string): DayTask => ({
  id, templateId: id, habit: 'walk', title, minutes: 5, points: 2, status: 'pending',
});

beforeEach(() => {
  useStore.setState({
    data: {
      ...emptyData(),
      profile: DEFAULT_PROFILE,
      days: { [D]: [mk('a', 'Đi bộ 10 phút'), mk('b', 'Giãn cơ 5 phút'), mk('c', 'Uống nước')] },
    },
    storageStatus: 'ok',
  });
});

describe('Today', () => {
  it('shows tasks and progress', () => {
    render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByText('0/3 nhiệm vụ')).toBeInTheDocument();
    expect(screen.getByText('Giãn cơ 5 phút')).toBeInTheDocument();
  });

  it('completes and un-completes a task', async () => {
    render(<Today date={D} onOpenGarden={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Hoàn thành: Đi bộ 10 phút' });
    await userEvent.click(btn);
    expect(screen.getByText('1/3 nhiệm vụ')).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(btn);
    expect(screen.getByText('0/3 nhiệm vụ')).toBeInTheDocument();
  });

  it('skips a task without penalty wording', async () => {
    render(<Today date={D} onOpenGarden={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bỏ qua: Giãn cơ 5 phút' }));
    expect(useStore.getState().data.days[D][1].status).toBe('skipped');
    expect(screen.queryByText(/thất bại|bỏ lỡ|mất/i)).not.toBeInTheDocument();
  });

  it('adds a custom task', async () => {
    render(<Today date={D} onOpenGarden={() => {}} />);
    await userEvent.type(screen.getByLabelText('Tên nhiệm vụ riêng'), 'Dắt chó đi dạo');
    await userEvent.clear(screen.getByLabelText('Số phút'));
    await userEvent.type(screen.getByLabelText('Số phút'), '15');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('Dắt chó đi dạo')).toBeInTheDocument();
  });

  it('opens the garden shortcut', async () => {
    const open = vi.fn();
    render(<Today date={D} onOpenGarden={open} />);
    await userEvent.click(screen.getByRole('button', { name: 'Xem khu vườn' }));
    expect(open).toHaveBeenCalled();
  });

  it('shows a gentle in-app reminder only when enabled, due and pending', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 9, 21, 0, 0));
    useStore.setState((s) => ({ data: { ...s.data, settings: { ...s.data.settings, notificationsEnabled: true, reminderTime: '20:00' } } }));
    render(<Today date={D} onOpenGarden={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Đến giờ chăm sóc khu vườn');
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/ui/today.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Viết `src/ui/Today.tsx`**

```tsx
import { useState } from 'react';
import { parseKey } from '../domain/date';
import { dayPoints } from '../domain/scoring';
import { ALL_HABITS, HABIT_LABEL, type Habit } from '../domain/types';
import { isReminderDue } from '../notifications/reminders';
import { useStore } from '../state/store';

function greeting(h: number) {
  return h < 11 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}

export default function Today({ date, onOpenGarden }: { date: string; onOpenGarden(): void }) {
  const tasks = useStore((s) => s.data.days[date]);
  const settings = useStore((s) => s.data.settings);
  const { toggleDone, skipTask, swap, addCustomTask } = useStore.getState();
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('10');
  const [habit, setHabit] = useState<Habit>('walk');
  const [error, setError] = useState('');

  const visible = (tasks ?? []).filter((t) => t.status !== 'swapped');
  const done = visible.filter((t) => t.status === 'done').length;
  const dateLabel = parseKey(date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <section className="stack">
      <header>
        <h1>{greeting(new Date().getHours())} 🌿</h1>
        <p className="note">{dateLabel}</p>
      </header>

      {isReminderDue(new Date(), settings.reminderTime, tasks, settings.notificationsEnabled) && (
        <p role="status" className="card">Đến giờ chăm sóc khu vườn của bạn rồi, làm một việc nhỏ thôi cũng được 🌱</p>
      )}

      <div>
        <p>{done}/{visible.length} nhiệm vụ</p>
        <progress value={done} max={Math.max(1, visible.length)} aria-label="Tiến độ hôm nay" />
        <p className="note">+{dayPoints(tasks ?? [])} điểm vườn hôm nay</p>
      </div>

      <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {visible.map((t) => (
          <li key={t.id} className={`card task ${t.status === 'done' ? 'done' : ''}`}>
            <div>
              <span className="title">{t.title}</span>
              <div className="note">{HABIT_LABEL[t.habit]} · {t.minutes} phút · +{t.points} điểm{t.status === 'skipped' ? ' · đã bỏ qua' : ''}</div>
            </div>
            <div className="row">
              <button className="primary" aria-pressed={t.status === 'done'} aria-label={`Hoàn thành: ${t.title}`} onClick={() => toggleDone(date, t.id)}>
                {t.status === 'done' ? 'Đã xong ✓' : 'Hoàn thành'}
              </button>
              {t.status !== 'done' && (
                <>
                  <button aria-label={`Đổi: ${t.title}`} onClick={() => swap(date, t.id)}>Đổi</button>
                  <button aria-label={`Bỏ qua: ${t.title}`} onClick={() => skipTask(date, t.id)}>
                    {t.status === 'skipped' ? 'Hoàn tác' : 'Bỏ qua'}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <button onClick={onOpenGarden}>Xem khu vườn</button>

      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          const ok = addCustomTask(date, { title, minutes: Number(minutes), habit });
          setError(ok ? '' : 'Hãy nhập tên và số phút hợp lệ.');
          if (ok) setTitle('');
        }}
      >
        <strong>Thêm nhiệm vụ riêng</strong>
        <label>Tên nhiệm vụ riêng
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>Số phút
          <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
        <label>Thói quen
          <select value={habit} onChange={(e) => setHabit(e.target.value as Habit)}>
            {ALL_HABITS.map((h) => <option key={h} value={h}>{HABIT_LABEL[h]}</option>)}
          </select>
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit">Thêm</button>
      </form>
    </section>
  );
}
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run tests/ui/today.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui tests/ui
git commit -m "feat(ui): Today screen with complete, swap, skip and custom tasks"
```

---

### Task 10: Màn hình Khu vườn

**Files:**
- Modify: `src/ui/GardenScreen.tsx` (thay placeholder)
- Create: `tests/ui/garden.test.tsx`

**Interfaces:**
- Consumes: store (`placeItem`, `removeItem`, `moveItem`, `renameGarden`), `ITEMS`, `getItem`, `gridSize`, `growthStage`, `LEVEL_THRESHOLDS`, `totalPoints`, `ItemArt`.
- Produces: `GardenScreen`. Ô lưới là nút `Ô {n}` (n từ 1), có `aria-pressed` khi đang chọn. Khi chọn ô trống: nút `Đặt {tên món}` cho từng món đã mở. Khi chọn ô có món: `Gỡ`, `Di chuyển`. Ở chế độ di chuyển, bấm ô trống để chuyển. Hiển thị `Sắp mở khóa: {tên} (còn {n} điểm)`.

- [ ] **Step 1: Viết test thất bại** `tests/ui/garden.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import GardenScreen from '../../src/ui/GardenScreen';

const seed = (unlockedLevel: number, placed: { cell: number; itemId: string }[] = []) =>
  useStore.setState({
    data: { ...emptyData(), profile: DEFAULT_PROFILE, garden: { name: 'Vườn thử', unlockedLevel, placed } },
    storageStatus: 'ok',
  });

describe('GardenScreen', () => {
  it('renders a 6x6 grid at level 0 and shows the garden name', () => {
    seed(0);
    render(<GardenScreen />);
    expect(screen.getAllByRole('button', { name: /^Ô \d+/ })).toHaveLength(36);
    expect(screen.getByDisplayValue('Vườn thử')).toBeInTheDocument();
  });

  it('places an unlocked item in a selected empty cell', async () => {
    seed(1);
    render(<GardenScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Ô 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Đặt Hoa cúc' }));
    expect(useStore.getState().data.garden.placed).toEqual([{ cell: 0, itemId: 'daisy' }]);
  });

  it('does not offer locked items', async () => {
    seed(0);
    render(<GardenScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Ô 1' }));
    expect(screen.queryByRole('button', { name: 'Đặt Hoa cúc' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Đặt Cỏ xanh' })).toBeInTheDocument();
  });

  it('disables an item that reached its max count', async () => {
    seed(5, [{ cell: 0, itemId: 'pond' }]);
    render(<GardenScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Ô 2/ }));
    expect(screen.getByRole('button', { name: 'Đặt Hồ nước' })).toBeDisabled();
  });

  it('removes and moves a placed item', async () => {
    seed(1, [{ cell: 0, itemId: 'daisy' }]);
    render(<GardenScreen />);
    await userEvent.click(screen.getByRole('button', { name: /^Ô 1/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Di chuyển' }));
    await userEvent.click(screen.getByRole('button', { name: /^Ô 3/ }));
    expect(useStore.getState().data.garden.placed).toEqual([{ cell: 2, itemId: 'daisy' }]);
    await userEvent.click(screen.getByRole('button', { name: /^Ô 3/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Gỡ' }));
    expect(useStore.getState().data.garden.placed).toHaveLength(0);
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

  it('hints at the next unlock', () => {
    seed(0);
    render(<GardenScreen />);
    expect(screen.getByText(/Sắp mở khóa: Hoa cúc \(còn 10 điểm\)/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/ui/garden.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Viết `src/ui/GardenScreen.tsx`**

Tên truy cập của ô: `Ô {n}` khi trống, `Ô {n}: {tên món}` khi có món (test dùng regex `^Ô n`).

```tsx
import { useState } from 'react';
import { getItem, gridSize, growthStage, ITEMS, LEVEL_THRESHOLDS } from '../domain/garden';
import { totalPoints } from '../domain/scoring';
import { useStore } from '../state/store';
import { ItemArt } from './ItemArt';

export default function GardenScreen() {
  const garden = useStore((s) => s.data.garden);
  const days = useStore((s) => s.data.days);
  const { placeItem, removeItem, moveItem, renameGarden } = useStore.getState();
  const [selected, setSelected] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState(garden.name);

  const size = gridSize(garden.unlockedLevel);
  const at = (cell: number) => garden.placed.find((p) => p.cell === cell);
  const unlocked = ITEMS.filter((i) => i.level <= garden.unlockedLevel);
  const next = ITEMS.filter((i) => i.level > garden.unlockedLevel).sort((a, b) => a.level - b.level)[0];
  const remaining = next ? LEVEL_THRESHOLDS[next.level] - totalPoints(days) : 0;
  const selectedPlaced = selected !== null ? at(selected) : undefined;

  const onCell = (cell: number) => {
    setMsg('');
    if (moving && selected !== null && !at(cell)) {
      moveItem(selected, cell);
      setSelected(cell);
      setMoving(false);
      return;
    }
    setMoving(false);
    setSelected(cell);
  };

  return (
    <section className="stack">
      <label>Tên khu vườn
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => renameGarden(name)} />
      </label>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array.from({ length: size * size }, (_, cell) => {
          const p = at(cell);
          const item = p ? getItem(p.itemId) : undefined;
          return (
            <button
              key={cell}
              className="cell"
              aria-pressed={selected === cell}
              aria-label={item ? `Ô ${cell + 1}: ${item.name}` : `Ô ${cell + 1}`}
              onClick={() => onCell(cell)}
            >
              {item && <ItemArt item={item} stage={growthStage(item, garden.unlockedLevel)} />}
            </button>
          );
        })}
      </div>

      {msg && <p role="alert">{msg}</p>}

      {selected !== null && !selectedPlaced && (
        <div className="card stack">
          <strong>Đặt vào ô {selected + 1}</strong>
          <div className="row">
            {unlocked.map((item) => {
              const count = garden.placed.filter((p) => p.itemId === item.id).length;
              const full = item.maxCount !== null && count >= item.maxCount;
              return (
                <button key={item.id} disabled={full} aria-label={`Đặt ${item.name}`} onClick={() => setMsg(placeItem(item.id, selected) ?? '')}>
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected !== null && selectedPlaced && (
        <div className="card row">
          <button onClick={() => setMoving(true)}>Di chuyển</button>
          <button onClick={() => { removeItem(selected); setSelected(null); }}>Gỡ</button>
          {moving && <span className="note">Chọn một ô trống để chuyển tới.</span>}
        </div>
      )}

      {next && <p className="note">Sắp mở khóa: {next.name} (còn {remaining} điểm)</p>}
    </section>
  );
}
```
Lưu ý: tên accessible của nút "Đặt …" có `aria-label` nên khớp test; ô có món có label `Ô n: tên` nên test dùng regex `/^Ô 1/`.

- [ ] **Step 4: Chạy test**

Run: `npx vitest run tests/ui/garden.test.tsx`
Expected: PASS. Nếu `Ô 1` (exact string) không khớp vì label dạng `Ô 1` có thể trùng `Ô 10`..: `getByRole('button', { name: 'Ô 1' })` dùng khớp chính xác nên chỉ khớp ô 1; giữ nguyên.

- [ ] **Step 5: Commit**

```bash
git add src/ui tests/ui
git commit -m "feat(ui): garden grid with placing, moving, removing and rename"
```

---

### Task 11: Màn hình Tiến độ và Cài đặt

**Files:**
- Modify: `src/ui/ProgressScreen.tsx`, `src/ui/SettingsScreen.tsx` (thay placeholder)
- Create: `tests/ui/progress-settings.test.tsx`

**Interfaces:**
- Consumes: `weeklySummary`, `habitCounts`, `milestones`, `historyDays`, `HABIT_LABEL`, store, `ensurePermission`, `ProfileForm`, `dateKey`.
- Produces: `ProgressScreen({ date })`, `SettingsScreen()`.
  - Progress hiển thị: `Tuần này: {done}/{total} nhiệm vụ · {points} điểm`, bảng xu hướng 4 tuần theo thói quen, danh sách cột mốc (có/chưa), lịch sử ngày.
  - Settings: `ProfileForm` (lưu hồ sơ + thói quen + giờ nhắc), công tắc `Bật thông báo nhắc nhở`, nút `Xuất dữ liệu`, input file `Nhập dữ liệu`, nút `Xóa toàn bộ dữ liệu` (hai bước: bấm rồi `Xác nhận xóa`), ghi chú y tế.

- [ ] **Step 1: Viết test thất bại** `tests/ui/progress-settings.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PROFILE, type DayTask } from '../../src/domain/types';
import { emptyData } from '../../src/state/storage';
import { useStore } from '../../src/state/store';
import ProgressScreen from '../../src/ui/ProgressScreen';
import SettingsScreen from '../../src/ui/SettingsScreen';

const t = (id: string, status: DayTask['status']): DayTask => ({
  id, templateId: id, habit: 'walk', title: id, minutes: 5, points: 3, status,
});

describe('ProgressScreen', () => {
  it('shows the weekly summary and reached milestones', () => {
    useStore.setState({
      data: { ...emptyData(), profile: DEFAULT_PROFILE, days: { '2026-10-05': [t('a', 'done'), t('b', 'pending')] } },
      storageStatus: 'ok',
    });
    render(<ProgressScreen date="2026-10-09" />);
    expect(screen.getByText('Tuần này: 1/2 nhiệm vụ · 3 điểm')).toBeInTheDocument();
    expect(screen.getByText('Nhiệm vụ đầu tiên')).toBeInTheDocument();
  });

  it('is gentle and empty-safe with no history', () => {
    useStore.setState({ data: { ...emptyData(), profile: DEFAULT_PROFILE }, storageStatus: 'ok' });
    render(<ProgressScreen date="2026-10-09" />);
    expect(screen.getByText('Tuần này: 0/0 nhiệm vụ · 0 điểm')).toBeInTheDocument();
    expect(screen.getByText(/Chưa có lịch sử/)).toBeInTheDocument();
  });
});

describe('SettingsScreen', () => {
  beforeEach(() =>
    useStore.setState({ data: { ...emptyData(), profile: DEFAULT_PROFILE }, storageStatus: 'ok' }));

  it('shows the medical disclaimer', () => {
    render(<SettingsScreen />);
    expect(screen.getByText(/không thay thế tư vấn y tế/i)).toBeInTheDocument();
  });

  it('saves profile, habits and reminder time', async () => {
    render(<SettingsScreen />);
    await userEvent.type(screen.getByLabelText('Cân nặng (kg)'), '70');
    const time = screen.getByLabelText('Giờ nhắc nhở');
    await userEvent.clear(time);
    await userEvent.type(time, '07:30');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    const { profile, settings } = useStore.getState().data;
    expect(profile?.weightKg).toBe(70);
    expect(settings.reminderTime).toBe('07:30');
  });

  it('toggles notifications even if permission is unsupported (in-app reminders still work)', async () => {
    render(<SettingsScreen />);
    await userEvent.click(screen.getByLabelText('Bật thông báo nhắc nhở'));
    expect(useStore.getState().data.settings.notificationsEnabled).toBe(true);
  });

  it('requires a second confirmation before wiping data', async () => {
    useStore.setState((s) => ({ data: { ...s.data, garden: { ...s.data.garden, name: 'Giữ lại' } } }));
    render(<SettingsScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Xóa toàn bộ dữ liệu' }));
    expect(useStore.getState().data.garden.name).toBe('Giữ lại');
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
    expect(useStore.getState().data.profile).toBeNull();
  });

  // Review Focus 4
  it('shows an error and keeps data when an invalid file is imported', async () => {
    render(<SettingsScreen />);
    const file = new File(['{"nonsense":true}'], 'bad.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText('Nhập dữ liệu'), file);
    expect(await screen.findByRole('alert')).toHaveTextContent('Tệp không hợp lệ');
    expect(useStore.getState().data.profile).not.toBeNull();
  });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npx vitest run tests/ui/progress-settings.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Viết `src/ui/ProgressScreen.tsx`**

```tsx
import { parseKey } from '../domain/date';
import { habitCounts, historyDays, milestones, weeklySummary } from '../domain/progress';
import { ALL_HABITS, HABIT_LABEL } from '../domain/types';
import { useStore } from '../state/store';

const short = (d: string) => parseKey(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });

export default function ProgressScreen({ date }: { date: string }) {
  const days = useStore((s) => s.data.days);
  const week = weeklySummary(days, date);
  const trend = habitCounts(days, date, 4);
  const history = historyDays(days);
  const maxDay = Math.max(1, ...week.perDay.map((d) => d.total));

  return (
    <section className="stack">
      <h1>Tiến độ</h1>

      <div className="card">
        <p>Tuần này: {week.done}/{week.total} nhiệm vụ · {week.points} điểm</p>
        <div className="bar" aria-hidden="true">
          {week.perDay.map((d) => <div key={d.date} style={{ height: `${(d.done / maxDay) * 100}%` }} title={`${short(d.date)}: ${d.done}`} />)}
        </div>
      </div>

      <div className="card">
        <strong>Xu hướng theo tuần</strong>
        <table>
          <thead>
            <tr><th>Tuần</th>{ALL_HABITS.map((h) => <th key={h}>{HABIT_LABEL[h]}</th>)}</tr>
          </thead>
          <tbody>
            {trend.map((r) => (
              <tr key={r.weekStart}>
                <td>{short(r.weekStart)}</td>
                {ALL_HABITS.map((h) => <td key={h}>{r.counts[h]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <strong>Cột mốc</strong>
        <ul>
          {milestones(days).map((m) => (
            <li key={m.id} style={{ color: m.reached ? undefined : 'var(--muted)' }}>
              {m.reached ? '🌟 ' : '○ '}<span>{m.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <strong>Lịch sử</strong>
        {history.length === 0 ? (
          <p className="note">Chưa có lịch sử. Bắt đầu từ một việc nhỏ hôm nay nhé.</p>
        ) : (
          <ul>
            {history.map((h) => <li key={h.date}>{short(h.date)}: {h.done}/{h.total} nhiệm vụ</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
```
Cột mốc hiển thị `🌟 ` trong phần tử riêng nên text khớp `getByText('Nhiệm vụ đầu tiên')` nhờ `<span>`.

- [ ] **Step 4: Viết `src/ui/SettingsScreen.tsx`**

```tsx
import { useState } from 'react';
import { dateKey } from '../domain/date';
import { DEFAULT_PROFILE } from '../domain/types';
import { ensurePermission } from '../notifications/reminders';
import { useStore } from '../state/store';
import { ProfileForm } from './ProfileForm';

export default function SettingsScreen() {
  const profile = useStore((s) => s.data.profile);
  const settings = useStore((s) => s.data.settings);
  const { updateProfile, updateSettings, exportText, importText, resetAll } = useStore.getState();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportText()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-garden-${dateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleNotifications = async (on: boolean) => {
    setMsg('');
    if (on && (await ensurePermission()) !== 'granted') {
      setMsg('Chưa được cấp quyền thông báo. Bạn vẫn nhận nhắc nhở trong ứng dụng khi mở lại.');
    }
    updateSettings({ notificationsEnabled: on });
  };

  return (
    <section className="stack">
      <h1>Hồ sơ và cài đặt</h1>

      <ProfileForm
        initial={{ profile: profile ?? DEFAULT_PROFILE, habits: settings.habits, reminderTime: settings.reminderTime }}
        submitLabel="Lưu thay đổi"
        onSubmit={({ profile: p, habits, reminderTime }) => {
          updateProfile(p);
          updateSettings({ habits, reminderTime });
          setMsg('Đã lưu. Thay đổi áp dụng từ ngày mai.');
        }}
      />

      <label className="inline">
        <input type="checkbox" checked={settings.notificationsEnabled} onChange={(e) => toggleNotifications(e.target.checked)} />
        Bật thông báo nhắc nhở
      </label>
      <p className="note">Nhắc nhở hoạt động tốt nhất khi ứng dụng được cài và đang mở nền. Khi bạn mở lại, ứng dụng vẫn nhắc nhẹ nhàng.</p>
      {msg && <p role="status">{msg}</p>}

      <div className="card stack">
        <strong>Dữ liệu của bạn</strong>
        <p className="note">Mọi dữ liệu chỉ nằm trên thiết bị này, không gửi đi đâu.</p>
        <button onClick={download}>Xuất dữ liệu</button>
        <label>Nhập dữ liệu
          <input
            type="file"
            accept="application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const r = importText(await file.text());
              setError(r.ok ? '' : r.error ?? '');
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
        {confirming ? (
          <div className="row">
            <button onClick={() => { resetAll(); setConfirming(false); }}>Xác nhận xóa</button>
            <button onClick={() => setConfirming(false)}>Hủy</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)}>Xóa toàn bộ dữ liệu</button>
        )}
      </div>

      <p className="note">Gợi ý chỉ hỗ trợ xây dựng thói quen, không thay thế tư vấn y tế.</p>
    </section>
  );
}
```

- [ ] **Step 5: Chạy toàn bộ test và build**

Run: `npx vitest run && npm run build`
Expected: PASS; build thành công.

- [ ] **Step 6: Commit**

```bash
git add src/ui tests/ui
git commit -m "feat(ui): progress and settings screens with export, import and reset"
```

---

### Task 12: PWA

**Files:**
- Create: `public/icon.svg`
- Modify: `vite.config.ts`, `src/main.tsx`

**Interfaces:**
- Produces: web manifest + service worker (precache) qua `vite-plugin-pwa`; app cài được và mở offline.

- [ ] **Step 1: Tạo `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2e7d32"/>
  <rect x="244" y="250" width="24" height="150" fill="#a5d6a7"/>
  <circle cx="256" cy="200" r="96" fill="#66bb6a"/>
  <circle cx="226" cy="180" r="34" fill="#81c784"/>
</svg>
```

- [ ] **Step 2: Sửa `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Life Garden',
        short_name: 'Life Garden',
        description: 'Xây thói quen sống khỏe, nuôi khu vườn của bạn.',
        lang: 'vi',
        theme_color: '#2e7d32',
        background_color: '#f6faf4',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: Đăng ký service worker trong `src/main.tsx`**

Thêm import ở đầu file và gọi sau `startPersistence()`:
```ts
import { registerSW } from 'virtual:pwa-register';
// ...
registerSW({ immediate: true });
```

- [ ] **Step 4: Build và kiểm tra**

Run: `npm run build && ls dist`
Expected: `dist` chứa `manifest.webmanifest`, `sw.js`, `icon.svg`. Chạy `npx vitest run` vẫn PASS (test không import `virtual:pwa-register` vì chỉ `main.tsx` dùng).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: installable offline PWA"
```

---

### Task 13: Kiểm thử đầu-cuối

**Files:**
- Create: `playwright.config.ts`, `e2e/life-garden.spec.ts`

**Interfaces:**
- Consumes: giao diện thật (các nhãn truy cập đã định nghĩa ở Task 8–11).

- [ ] **Step 1: Tạo `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  webServer: { command: 'npm run dev -- --port 5173', url: 'http://localhost:5173', reuseExistingServer: true },
  use: { baseURL: 'http://localhost:5173' },
});
```

- [ ] **Step 2: Viết `e2e/life-garden.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('onboard, complete a task, see progress, and keep data after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Chào mừng/ })).toBeVisible();

  await page.getByLabel('Cân nặng (kg)').fill('65');
  await page.getByRole('button', { name: 'Bắt đầu' }).click();

  await expect(page.getByText(/\d+\/\d+ nhiệm vụ/)).toBeVisible();
  const firstDone = page.getByRole('button', { name: /^Hoàn thành: / }).first();
  await firstDone.click();
  await expect(page.getByText(/^1\/\d+ nhiệm vụ$/)).toBeVisible();

  await page.getByRole('button', { name: 'Tiến độ' }).click();
  await expect(page.getByText(/Tuần này: 1\/\d+ nhiệm vụ/)).toBeVisible();

  await page.getByRole('button', { name: 'Khu vườn' }).click();
  await page.getByRole('button', { name: 'Ô 1', exact: true }).click();
  await page.getByRole('button', { name: 'Đặt Cỏ xanh' }).click();
  await expect(page.getByRole('button', { name: 'Ô 1: Cỏ xanh' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
  await page.getByRole('button', { name: 'Khu vườn' }).click();
  await expect(page.getByRole('button', { name: 'Ô 1: Cỏ xanh' })).toBeVisible();
  await page.getByRole('button', { name: 'Hôm nay' }).click();
  await expect(page.getByText(/^1\/\d+ nhiệm vụ$/)).toBeVisible();
});

test('skipping setup works and missing a day loses nothing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bỏ qua' }).click();
  await expect(page.getByRole('navigation', { name: 'Điều hướng chính' })).toBeVisible();
  await page.getByRole('button', { name: /^Hoàn thành: / }).first().click();
  await expect(page.getByText(/thất bại|héo|mất/i)).toHaveCount(0);
});
```

- [ ] **Step 3: Cài trình duyệt và chạy**

Run: `npx playwright install chromium && npm run e2e`
Expected: 2 test PASS.

- [ ] **Step 4: Chạy toàn bộ kiểm tra cuối**

Run: `npx vitest run && npm run build && npm run e2e`
Expected: tất cả PASS, build sạch.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(e2e): onboarding, task completion, garden placement and persistence"
```

---

## Self-Review (đã chạy)

**Phủ spec:**
- §3 kiến trúc, store, module thuần → Task 1, 3–6.
- §4 dữ liệu và quy tắc điểm/mở khóa (thu hồi khi bỏ tick, level chỉ tăng, tiến độ tính từ `days`, lịch sử vô hạn) → Task 2, 4, 5, 6.
- §5 gợi ý (3–5, quỹ thời gian, cá nhân hóa, xoay vòng, hạt giống, đổi/bỏ qua, tự tạo, ổn định) → Task 3, 6, 9.
- §6 vườn (lưới 6×6 mở rộng, chạm đặt, mở khóa, giai đoạn lớn, tên, không phạt, SVG, mô tả chữ) → Task 4, 8 (`ItemArt` có `aria-label`), 10. Chế độ sáng/tối ở Task 8 (`prefers-color-scheme`).
- §7 PWA và nhắc nhở → Task 7, 9 (nhắc trong app), 11 (quyền khi bật công tắc), 12.
- §8 quyền riêng tư (xuất/nhập/xóa, ghi chú y tế) → Task 8, 11.
- §9 xử lý lỗi (hỏng, không lưu được, từ chối quyền) → Task 6, 8 (`Recovery`, banner), 11.
- §10 kiểm thử → mọi task có test; Task 13 là Playwright.
- §11 năm màn hình → Task 8–11.

**Placeholder:** không còn "TBD"/"TODO". Các màn tạm ở Task 8 Step 6 là bước dựng giàn rõ ràng và được thay thế bởi Task 9–11.

**Nhất quán kiểu:** `Today({date,onOpenGarden})`, `ProgressScreen({date})`, `ProfileForm`/`FormValue`, `completeSetup(profile, Partial<Settings>)`, `placeItem(itemId, cell): string|null`, `suggestTasks`/`swapTask` đều dùng thống nhất ở các task sau.

**Diễn giải cần người dùng biết:** "giờ ngủ" ở phần xu hướng được thể hiện bằng số lần hoàn thành nhiệm vụ thói quen ngủ (app không thu thập giờ ngủ thực tế).

## Cách thực hiện sau khi duyệt

1. Sao chép file này thành `docs/superpowers/plans/2026-10-09-life-garden.md` và commit.
2. Thực hiện tuần tự Task 1 → 13 theo phương án người dùng chọn (subagent-driven hoặc native).
3. Kiểm chứng cuối: `npx vitest run && npm run build && npm run e2e`, rồi mở `npm run dev` kiểm tra bằng tay luồng chào mừng → hoàn thành nhiệm vụ → đặt cây → tải lại trang.
