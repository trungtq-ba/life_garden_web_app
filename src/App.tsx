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
