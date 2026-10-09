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
