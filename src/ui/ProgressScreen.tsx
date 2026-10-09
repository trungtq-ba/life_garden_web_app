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
