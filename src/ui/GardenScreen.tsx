import { useState } from 'react';
import { useStore } from '../state/store';
import { CollectionList } from './garden/CollectionList';

export default function GardenScreen() {
  const name = useStore((s) => s.data.garden.name);
  const peak = useStore((s) => s.data.garden.peakPoints);
  const { renameGarden } = useStore.getState();
  const [draft, setDraft] = useState(name);

  return (
    <section className="stack">
      <label>Tên khu vườn
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            renameGarden(draft);
            if (!draft.trim()) setDraft(name);
          }}
        />
      </label>
      <CollectionList peak={peak} />
    </section>
  );
}
