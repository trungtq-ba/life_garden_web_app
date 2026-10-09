import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { dateKey } from './domain/date';
import { registerSW } from 'virtual:pwa-register';
import { startReminders } from './notifications/reminders';
import { startPersistence, useStore } from './state/store';
import './styles.css';

startPersistence();
registerSW({ immediate: true });

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
