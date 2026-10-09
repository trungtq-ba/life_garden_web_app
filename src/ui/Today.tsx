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
