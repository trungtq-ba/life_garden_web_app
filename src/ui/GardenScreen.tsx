import { useState } from 'react';
import { getItem, gridSize, growthStage, ITEMS, LEVEL_THRESHOLDS } from '../domain/garden';
import { totalPoints } from '../domain/scoring';
import { useStore } from '../state/store';
import { ItemArt } from './ItemArt';

export default function GardenScreen() {
  const garden = useStore((s) => s.data.garden);
  const days = useStore((s) => s.data.days);
  const { placeItem, removeItem, moveItem, renameGarden } = useStore.getState();
  const [selected, setSelected] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState(garden.name);

  const size = gridSize(garden.unlockedLevel);
  const at = (cell: number) => garden.placed.find((p) => p.cell === cell);
  const unlocked = ITEMS.filter((i) => i.level <= garden.unlockedLevel);
  const next = ITEMS.filter((i) => i.level > garden.unlockedLevel).sort((a, b) => a.level - b.level)[0];
  const remaining = next ? LEVEL_THRESHOLDS[next.level] - totalPoints(days) : 0;
  const selectedPlaced = selected !== null ? at(selected) : undefined;

  const onCell = (cell: number) => {
    setMsg('');
    if (moving && selected !== null && !at(cell)) {
      moveItem(selected, cell);
      setSelected(cell);
      setMoving(false);
      return;
    }
    setMoving(false);
    setSelected(cell);
  };

  return (
    <section className="stack">
      <label>Tên khu vườn
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => renameGarden(name)} />
      </label>

      <div className="grid" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array.from({ length: size * size }, (_, cell) => {
          const p = at(cell);
          const item = p ? getItem(p.itemId) : undefined;
          return (
            <button
              key={cell}
              className="cell"
              aria-pressed={selected === cell}
              aria-label={item ? `Ô ${cell + 1}: ${item.name}` : `Ô ${cell + 1}`}
              onClick={() => onCell(cell)}
            >
              {item && <ItemArt item={item} stage={growthStage(item, garden.unlockedLevel)} />}
            </button>
          );
        })}
      </div>

      {msg && <p role="alert">{msg}</p>}

      {selected !== null && !selectedPlaced && (
        <div className="card stack">
          <strong>Đặt vào ô {selected + 1}</strong>
          <div className="row">
            {unlocked.map((item) => {
              const count = garden.placed.filter((p) => p.itemId === item.id).length;
              const full = item.maxCount !== null && count >= item.maxCount;
              return (
                <button key={item.id} disabled={full} aria-label={`Đặt ${item.name}`} onClick={() => setMsg(placeItem(item.id, selected) ?? '')}>
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected !== null && selectedPlaced && (
        <div className="card row">
          <button onClick={() => setMoving(true)}>Di chuyển</button>
          <button onClick={() => { removeItem(selected); setSelected(null); }}>Gỡ</button>
          {moving && <span className="note">Chọn một ô trống để chuyển tới.</span>}
        </div>
      )}

      {next && <p className="note">Sắp mở khóa: {next.name} (còn {remaining} điểm)</p>}
    </section>
  );
}
