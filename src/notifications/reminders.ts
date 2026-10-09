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
