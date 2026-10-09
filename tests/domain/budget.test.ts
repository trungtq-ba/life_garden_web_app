import { addDays } from '../../src/domain/date';
import { ANIMATION_BUDGET, estimateAnimated, sceneState, weatherFor, type Weather } from '../../src/domain/scene';

function findDate(weather: Weather, phase: 'dawn' | 'day'): string {
  for (let i = 0; i < 400; i++) {
    const k = addDays('2026-01-01', i);
    if (weatherFor(k, phase) === weather) return k;
  }
  throw new Error(`no ${weather} date found`);
}

const hours = [6, 12, 18, 23];
const peaks = [0, 45, 100, 190, 600];
const weathers: [Weather, 'dawn' | 'day'][] = [['clear', 'day'], ['cloudy', 'day'], ['rain', 'day'], ['mist', 'dawn']];

describe('animation budget', () => {
  it('never exceeds the budget in any reachable state', () => {
    let worst = 0;
    for (const [w, ph] of weathers) {
      const dateKey = findDate(w, ph);
      for (const h of hours) {
        for (const peakPoints of peaks) {
          for (const todayRatio of [0, 0.5, 1]) {
            const s = sceneState({ peakPoints, todayRatio, now: new Date(2026, 9, 9, h), dateKey, effects: 'full' });
            worst = Math.max(worst, estimateAnimated(s));
            expect(estimateAnimated(s)).toBeLessThanOrEqual(ANIMATION_BUDGET);
          }
        }
      }
    }
    expect(worst).toBeGreaterThan(30); // hàm không trả về số 0 vô nghĩa
  });
  it('is zero in calm mode', () => {
    const s = sceneState({ peakPoints: 600, todayRatio: 1, now: new Date(2026, 9, 9, 12), dateKey: '2026-10-07', effects: 'calm' });
    expect(estimateAnimated(s)).toBe(0);
  });
  it('counts rain drops only on rainy days', () => {
    const rain = sceneState({ peakPoints: 0, todayRatio: 0, now: new Date(2026, 9, 9, 12), dateKey: '2026-10-09', effects: 'full' });
    const clear = sceneState({ peakPoints: 0, todayRatio: 0, now: new Date(2026, 9, 9, 12), dateKey: '2026-10-07', effects: 'full' });
    expect(rain.weather).toBe('rain');
    expect(estimateAnimated(rain) - estimateAnimated(clear)).toBeGreaterThanOrEqual(25);
  });
});
