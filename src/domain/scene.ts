import { bloomDensity, creatureCounts, GARDEN_ITEMS, growthOf, isUnlocked, stageOf, type Stage } from './growth';
import { hashSeed, rng } from './suggest';
import type { DayTask } from './types';

export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'mist';
export type Effects = 'full' | 'calm';

export function skyPhase(d: Date): SkyPhase {
  const h = d.getHours();
  if (h >= 5 && h < 7) return 'dawn';
  if (h >= 7 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'dusk';
  return 'night';
}

export function celestial(d: Date): { body: 'sun' | 'moon'; t: number } {
  const hours = d.getHours() + d.getMinutes() / 60;
  if (hours >= 6 && hours < 18) return { body: 'sun', t: (hours - 6) / 12 };
  return { body: 'moon', t: ((hours - 18 + 24) % 24) / 12 };
}

export function weatherFor(dateKey: string, phase: SkyPhase): Weather {
  const v = rng(hashSeed(`weather:${dateKey}`))();
  const base: Weather = v < 0.4 ? 'clear' : v < 0.7 ? 'cloudy' : v < 0.85 ? 'rain' : 'mist';
  return base === 'mist' && phase !== 'dawn' ? 'cloudy' : base;
}

export function todayRatio(tasks: DayTask[] | undefined): number {
  const real = (tasks ?? []).filter((t) => t.status !== 'swapped');
  if (real.length === 0) return 0;
  return real.filter((t) => t.status === 'done').length / real.length;
}

export function resolveEffects(setting: Effects | null, prefersReduced: boolean): Effects {
  if (prefersReduced) return 'calm';
  return setting ?? 'full';
}

export interface SceneItem {
  id: string;
  growth: number;
  stage: Stage;
}
export interface SceneState {
  phase: SkyPhase;
  weather: Weather;
  sky: { body: 'sun' | 'moon'; t: number };
  items: SceneItem[];
  creatures: ReturnType<typeof creatureCounts>;
  extraButterflies: number;
  bloom: number;
  sunIntensity: number;
  rainbow: boolean;
  calm: boolean;
}

export function sceneState(input: {
  peakPoints: number;
  todayRatio: number;
  now: Date;
  dateKey: string;
  effects: Effects;
}): SceneState {
  const { peakPoints: peak, todayRatio: ratio } = input;
  const phase = skyPhase(input.now);
  const weather = weatherFor(input.dateKey, phase);
  const raw = creatureCounts(peak);
  // Bướm và chim nghỉ khi trời mưa hoặc ban đêm; đom đóm chỉ ra lúc hoàng hôn/đêm không mưa.
  const daytimeDry = phase !== 'night' && weather !== 'rain';
  const creatures = {
    ...raw,
    butterflies: daytimeDry ? raw.butterflies : 0,
    birds: daytimeDry ? raw.birds : 0,
    fireflies: (phase === 'dusk' || phase === 'night') && weather !== 'rain' ? raw.fireflies : 0,
  };
  return {
    phase,
    weather,
    sky: celestial(input.now),
    items: GARDEN_ITEMS.filter((i) => isUnlocked(i, peak)).map((i) => {
      const growth = growthOf(i, peak);
      return { id: i.id, growth, stage: stageOf(growth) };
    }),
    creatures,
    extraButterflies: ratio >= 0.5 && creatures.butterflies > 0 ? 2 : 0,
    bloom: bloomDensity(peak),
    sunIntensity: 0.4 + 0.6 * ratio,
    rainbow: ratio >= 1,
    calm: input.effects === 'calm',
  };
}

const PHASE_LABEL: Record<SkyPhase, string> = {
  dawn: 'bình minh', day: 'ban ngày', dusk: 'hoàng hôn', night: 'ban đêm',
};
const WEATHER_LABEL: Record<Weather, string> = {
  clear: 'trời nắng đẹp', cloudy: 'trời nhiều mây', rain: 'mưa nhẹ', mist: 'sương sớm',
};

export function describeScene(state: SceneState, gardenName: string): string {
  const names = new Map(GARDEN_ITEMS.map((i) => [i.id, i.name]));
  const growing = state.items.filter((i) => i.stage !== 'mature').map((i) => names.get(i.id)!);
  const mature = state.items.length - growing.length;
  const parts = [`${gardenName}: ${PHASE_LABEL[state.phase]}, ${WEATHER_LABEL[state.weather]}`];
  parts.push(mature > 0 ? `${mature} món đã trưởng thành` : 'khu vườn vừa bắt đầu');
  if (growing.length > 0) parts.push(`đang lớn: ${growing.join(', ')}`);
  return `${parts.join('. ')}.`;
}
