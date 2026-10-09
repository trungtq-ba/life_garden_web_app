import { GARDEN_ITEMS, growthOf, isUnlocked, stageOf, type Stage } from '../../domain/growth';

const STAGE_LABEL: Record<Stage, string> = {
  seed: 'mới gieo', sprout: 'mới nảy mầm', growing: 'đang lớn', mature: 'đã trưởng thành',
};

export function CollectionList({ peak }: { peak: number }) {
  return (
    <section aria-labelledby="collection-title" className="stack">
      <h2 id="collection-title">Trong vườn của bạn</h2>
      <ul className="collection">
        {GARDEN_ITEMS.map((item) => {
          if (!isUnlocked(item, peak)) {
            return (
              <li key={item.id} className="locked">
                {`${item.name} · còn ${item.unlockAt - peak} điểm`}
              </li>
            );
          }
          const growth = growthOf(item, peak);
          const pct = item.growSpan > 0 && growth < 1 ? ` (${Math.round(growth * 100)}%)` : '';
          return (
            <li key={item.id} className="unlocked">
              {`${item.name} · ${STAGE_LABEL[stageOf(growth)]}${pct}`}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
