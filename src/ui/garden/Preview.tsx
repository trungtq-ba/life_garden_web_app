import { useState } from 'react';
import { sceneState, type Effects, type Weather } from '../../domain/scene';
import { GardenScene } from './GardenScene';

export function Preview() {
  const [peak, setPeak] = useState(0);
  const [hour, setHour] = useState(10);
  const [weather, setWeather] = useState<Weather | 'auto'>('auto');
  const [ratio, setRatio] = useState(0);
  const [effects, setEffects] = useState<Effects>('full');
  const [tick, setTick] = useState(0);
  const [unlocked, setUnlocked] = useState('');

  const base = sceneState({
    peakPoints: peak,
    todayRatio: ratio / 100,
    now: new Date(2026, 9, 9, Math.min(23, Math.max(0, hour)), 0, 0),
    dateKey: '2026-10-07',
    effects,
  });
  const state = weather === 'auto' ? base : { ...base, weather };

  return (
    <main className="garden-preview">
      <h1>Xem thử khu vườn</h1>
      <div className="controls">
        <label>Điểm đỉnh
          <input type="number" min="0" value={peak} onChange={(e) => setPeak(Number(e.target.value) || 0)} />
        </label>
        <label>Giờ
          <input type="number" min="0" max="23" value={hour} onChange={(e) => setHour(Number(e.target.value) || 0)} />
        </label>
        <label>Thời tiết
          <select value={weather} onChange={(e) => setWeather(e.target.value as Weather | 'auto')}>
            <option value="auto">Theo ngày</option>
            <option value="clear">Nắng</option>
            <option value="cloudy">Nhiều mây</option>
            <option value="rain">Mưa nhẹ</option>
            <option value="mist">Sương</option>
          </select>
        </label>
        <label>Tiến độ hôm nay (%)
          <input type="number" min="0" max="100" value={ratio} onChange={(e) => setRatio(Number(e.target.value) || 0)} />
        </label>
        <label>Hiệu ứng
          <select value={effects} onChange={(e) => setEffects(e.target.value as Effects)}>
            <option value="full">Đầy đủ</option>
            <option value="calm">Nhẹ</option>
          </select>
        </label>
        <label>Vừa mở khóa (id, cách nhau dấu phẩy)
          <input value={unlocked} onChange={(e) => setUnlocked(e.target.value)} />
        </label>
        <button type="button" onClick={() => setTick((t) => t + 1)}>Tưới</button>
      </div>
      <GardenScene
        state={state}
        name="Xem thử"
        wateredTick={tick}
        justUnlocked={unlocked.split(',').map((x) => x.trim()).filter(Boolean)}
      />
    </main>
  );
}
