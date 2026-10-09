import { useRef, type CSSProperties } from 'react';
import { describeScene, type SceneState } from '../../domain/scene';
import { Defs } from './Defs';
import { CloudsLayer, SkyLayer } from './layers/SkyLayer';
import { CreaturesLayer, ElementsLayer } from './layers/ElementsLayer';
import { ForegroundLayer } from './layers/ForegroundLayer';
import { GroundLayer, HillsLayer, TintLayer } from './layers/LandLayer';
import { LightLayer } from './layers/LightLayer';
import { RainbowLayer } from './layers/RainbowLayer';
import { WaterBurst } from './layers/WaterBurst';
import { WeatherLayer } from './layers/WeatherLayer';
import { useAmbientPause } from './useAmbientPause';
import './garden.css';

interface Props {
  state: SceneState;
  name: string;
  wateredTick?: number;
  justUnlocked?: string[];
  size?: 'compact' | 'large';
}

export function GardenScene({ state, name, wateredTick = 0, justUnlocked = [], size }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useAmbientPause(ref);
  const cls = ['garden-scene', `phase-${state.phase}`, `weather-${state.weather}`, state.calm ? 'calm' : '', size ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <div
      ref={ref}
      className={cls}
      role="img"
      aria-label={describeScene(state, name)}
      data-testid="garden-scene"
      data-paused={paused}
      style={{ '--sun': state.sunIntensity } as CSSProperties}
    >
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <Defs />
        <SkyLayer state={state} />
        <CloudsLayer />
        <RainbowLayer state={state} />
        <HillsLayer />
        <GroundLayer />
        <ElementsLayer state={state} tick={state.calm ? 0 : wateredTick} justUnlocked={state.calm ? [] : justUnlocked} />
        <CreaturesLayer state={state} />
        <WeatherLayer state={state} />
        <ForegroundLayer state={state} />
        {wateredTick > 0 && !state.calm && <WaterBurst key={wateredTick} tick={wateredTick} />}
        <TintLayer />
        <LightLayer state={state} />
      </svg>
    </div>
  );
}
