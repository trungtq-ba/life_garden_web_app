import type { ReactNode } from 'react';

export type TabId = 'today' | 'garden' | 'progress' | 'settings';

// Nét mảnh 24x24; phần `tab-fill` được tô nhạt khi tab đang chọn (xem .tabs trong styles.css).
const ICONS: Record<TabId, ReactNode> = {
  today: (
    <>
      <rect className="tab-fill" x="3.5" y="5" width="17" height="15.5" rx="4" />
      <path d="M8 3v4M16 3v4M3.5 10h17M8.5 15l2.5 2.5 4.5-5" />
    </>
  ),
  garden: (
    <>
      <path className="tab-fill" d="M12 20v-8c0-4 2.6-6.8 7-7 .2 4.4-2.6 7-7 7z" />
      <path d="M12 20v-6c0-3.2-2.2-5.4-6-5.6-.1 3.6 2.2 5.6 6 5.6M12 20h-3M12 20h3" />
    </>
  ),
  progress: (
    <>
      <rect className="tab-fill" x="13.5" y="4" width="5" height="16" rx="2" />
      <path d="M5.5 20v-6M11 20V9M16 20V4M3.5 20h17" />
    </>
  ),
  settings: (
    <>
      <circle className="tab-fill" cx="9" cy="8" r="2.6" />
      <path d="M4 8h2.4M11.6 8H20M4 16h8.4M17.6 16H20" />
      <circle cx="9" cy="8" r="2.6" />
      <circle className="tab-fill" cx="15" cy="16" r="2.6" />
      <circle cx="15" cy="16" r="2.6" />
    </>
  ),
};

export function TabIcon({ id }: { id: TabId }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {ICONS[id]}
    </svg>
  );
}
