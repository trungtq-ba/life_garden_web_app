import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { dateKey } from './domain/date';
import { startReminders } from './notifications/reminders';
import { startPersistence, useStore } from './state/store';
import './styles.css';

startPersistence();

const pendingToday = () =>
  useStore.getState().data.days[dateKey(new Date())]?.filter((t) => t.status === 'pending').length ?? 0;
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
