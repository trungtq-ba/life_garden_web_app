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
