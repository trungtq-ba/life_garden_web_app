import { addDays } from '../../src/domain/date';
import {
  celestial, describeScene, resolveEffects, sceneState, skyPhase, todayRatio, weatherFor,
} from '../../src/domain/scene';
import type { DayTask } from '../../src/domain/types';

const at = (h: number, m = 0) => new Date(2026, 9, 9, h, m, 0);
const task = (status: DayTask['status']): DayTask => ({
  id: status, templateId: 't', habit: 'walk', title: 't', minutes: 1, points: 1, status,
});

describe('skyPhase', () => {
  // Review Focus 3
  it.each([
    [4, 59, 'night'], [5, 0, 'dawn'], [6, 59, 'dawn'], [7, 0, 'day'], [16, 59, 'day'],
    [17, 0, 'dusk'], [18, 59, 'dusk'], [19, 0, 'night'], [0, 0, 'night'], [23, 59, 'night'],
  ])('%s:%s is %s', (h, m, phase) => {
    expect(skyPhase(at(h as number, m as number))).toBe(phase);
  });
});

describe('celestial', () => {
  it('puts the sun on its arc between 06:00 and 18:00', () => {
    expect(celestial(at(6))).toEqual({ body: 'sun', t: 0 });
    expect(celestial(at(12))).toEqual({ body: 'sun', t: 0.5 });
    expect(celestial(at(17, 59)).body).toBe('sun');
  });
  it('puts the moon on its arc between 18:00 and 06:00', () => {
    expect(celestial(at(18))).toEqual({ body: 'moon', t: 0 });
    expect(celestial(at(0))).toEqual({ body: 'moon', t: 0.5 });
    expect(celestial(at(5, 59)).body).toBe('moon');
  });
});

describe('weatherFor', () => {
  const keys = Array.from({ length: 1000 }, (_, i) => addDays('2024-01-01', i));
  it('is deterministic per date and phase', () => {
    expect(weatherFor('2026-10-09', 'day')).toBe(weatherFor('2026-10-09', 'day'));
  });
  it('follows the intended distribution at dawn (mist possible)', () => {
    const counts = { clear: 0, cloudy: 0, rain: 0, mist: 0 };
    keys.forEach((k) => (counts[weatherFor(k, 'dawn')] += 1));
    expect(counts.clear / 1000).toBeGreaterThan(0.3);
    expect(counts.clear / 1000).toBeLessThan(0.5);
    expect(counts.cloudy / 1000).toBeGreaterThan(0.2);
    expect(counts.cloudy / 1000).toBeLessThan(0.4);
    expect(counts.rain / 1000).toBeGreaterThan(0.07);
    expect(counts.rain / 1000).toBeLessThan(0.23);
    expect(counts.mist / 1000).toBeGreaterThan(0.07);
    expect(counts.mist / 1000).toBeLessThan(0.23);
  });
  it('shows mist only at dawn; otherwise it reads as cloudy', () => {
    for (const k of keys) {
      expect(weatherFor(k, 'day')).not.toBe('mist');
      expect(weatherFor(k, 'night')).not.toBe('mist');
    }
  });
});

describe('todayRatio and resolveEffects', () => {
  it('ignores swapped tasks and is 0 without tasks', () => {
    expect(todayRatio(undefined)).toBe(0);
    expect(todayRatio([])).toBe(0);
    expect(todayRatio([task('done'), task('pending'), task('swapped')])).toBe(0.5);
    expect(todayRatio([task('done'), task('done')])).toBe(1);
  });
  // Review Focus 4
  it('forces calm when the system asks for reduced motion', () => {
    expect(resolveEffects('full', true)).toBe('calm');
    expect(resolveEffects(null, true)).toBe('calm');
    expect(resolveEffects(null, false)).toBe('full');
    expect(resolveEffects('calm', false)).toBe('calm');
  });
});

describe('sceneState', () => {
  const base = { peakPoints: 0, todayRatio: 0, now: at(10), dateKey: '2026-10-07', effects: 'full' as const };

  it('is never empty at 0 points', () => {
    const s = sceneState(base);
    expect(s.items.map((i) => i.id)).toContain('grass');
    expect(s.creatures.butterflies).toBe(0);
  });
  it('grows items with peak points and keeps stages consistent', () => {
    const s = sceneState({ ...base, peakPoints: 80 });
    const daisy = s.items.find((i) => i.id === 'daisy')!;
    expect(daisy.growth).toBe(1);
    expect(daisy.stage).toBe('mature');
    const apple = s.items.find((i) => i.id === 'apple-tree')!;
    expect(apple.growth).toBeCloseTo(0.25);
    expect(apple.stage).toBe('sprout');
    expect(s.items.find((i) => i.id === 'pond')).toBeUndefined();
  });
  it('lights the scene up with today progress, never darkening it', () => {
    expect(sceneState({ ...base, todayRatio: 0 }).sunIntensity).toBeCloseTo(0.4);
    expect(sceneState({ ...base, todayRatio: 1 }).sunIntensity).toBeCloseTo(1);
    expect(sceneState({ ...base, todayRatio: 0 }).weather).toBe(sceneState({ ...base, todayRatio: 1 }).weather);
  });
  it('adds extra butterflies at half progress only once butterflies exist', () => {
    expect(sceneState({ ...base, peakPoints: 10, todayRatio: 0.5 }).extraButterflies).toBe(0);
    expect(sceneState({ ...base, peakPoints: 30, todayRatio: 0.4 }).extraButterflies).toBe(0);
    expect(sceneState({ ...base, peakPoints: 30, todayRatio: 0.5 }).extraButterflies).toBe(2);
  });
  it('shows the rainbow only when every task is done', () => {
    expect(sceneState({ ...base, todayRatio: 0.99 }).rainbow).toBe(false);
    expect(sceneState({ ...base, todayRatio: 1 }).rainbow).toBe(true);
  });
  it('hides butterflies and birds at night and in the rain; fireflies only after dusk and dry', () => {
    const day = sceneState({ ...base, peakPoints: 100 });
    expect(day.weather).toBe('clear');
    expect(day.creatures).toMatchObject({ butterflies: 2, birds: 1, fish: 3, fireflies: 0 });
    const night = sceneState({ ...base, peakPoints: 100, now: at(22) });
    expect(night.creatures).toMatchObject({ butterflies: 0, birds: 0, fish: 3, fireflies: 6 });
    const rainy = sceneState({ ...base, peakPoints: 100, dateKey: '2026-10-09' });
    expect(rainy.weather).toBe('rain');
    expect(rainy.creatures).toMatchObject({ butterflies: 0, birds: 0, fireflies: 0 });
    const rainyNight = sceneState({ ...base, peakPoints: 100, todayRatio: 0.5, now: at(22), dateKey: '2026-10-09' });
    expect(rainyNight.creatures.fireflies).toBe(0);
    expect(rainyNight.extraButterflies).toBe(0);
  });
  it('reports calm mode and valid layout past the last unlock', () => {
    const s = sceneState({ ...base, peakPoints: 600, effects: 'calm' });
    expect(s.calm).toBe(true);
    expect(s.bloom).toBe(6);
    expect(s.items).toHaveLength(11);
  });
});

describe('describeScene', () => {
  it('names the garden, sky and weather in plain Vietnamese', () => {
    const s = sceneState({ peakPoints: 0, todayRatio: 0, now: at(10), dateKey: '2026-10-07', effects: 'full' });
    const text = describeScene(s, 'Vườn Mai');
    expect(text).toContain('Vườn Mai');
    expect(text).toContain('ban ngày');
  });
  it('lists growing plants and counts mature items', () => {
    const s = sceneState({ peakPoints: 80, todayRatio: 0, now: at(10), dateKey: '2026-10-07', effects: 'full' });
    const text = describeScene(s, 'Vườn Mai');
    expect(text).toContain('đang lớn');
    expect(text).toContain('Cây táo');
  });
});
