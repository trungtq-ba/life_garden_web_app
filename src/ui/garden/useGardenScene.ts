import { useEffect, useRef, useState } from 'react';
import { dateKey } from '../../domain/date';
import { GARDEN_ITEMS } from '../../domain/growth';
import { resolveEffects, sceneState, todayRatio, type SceneState } from '../../domain/scene';
import { useStore } from '../../state/store';
import { useSceneClock } from './useSceneClock';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(QUERY);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export function useGardenScene(): { state: SceneState; name: string; wateredTick: number; justUnlocked: string[] } {
  const now = useSceneClock();
  const key = dateKey(now);
  const peak = useStore((s) => s.data.garden.peakPoints);
  const name = useStore((s) => s.data.garden.name);
  const tasks = useStore((s) => s.data.days[key]);
  const setting = useStore((s) => s.data.settings.gardenEffects);
  const wateredTick = useStore((s) => s.wateredTick);
  const reduced = usePrefersReducedMotion();

  const prev = useRef(peak);
  const [justUnlocked, setJustUnlocked] = useState<string[]>([]);
  useEffect(() => {
    const before = prev.current;
    prev.current = peak;
    const ids = GARDEN_ITEMS.filter((i) => i.unlockAt > before && i.unlockAt <= peak).map((i) => i.id);
    if (ids.length === 0) return;
    setJustUnlocked(ids);
    const t = setTimeout(() => setJustUnlocked([]), 1500);
    return () => clearTimeout(t);
  }, [peak]);

  const state = sceneState({
    peakPoints: peak,
    todayRatio: todayRatio(tasks),
    now,
    dateKey: key,
    effects: resolveEffects(setting, reduced),
  });
  return { state, name, wateredTick, justUnlocked };
}
