import type { CSSProperties } from 'react';
import { describeScene, type SceneState } from '../../domain/scene';
import { Defs } from './Defs';
import { CloudsLayer, SkyLayer } from './layers/SkyLayer';
import { GroundLayer, HillsLayer, TintLayer } from './layers/LandLayer';
import './garden.css';

interface Props {
  state: SceneState;
  name: string;
  wateredTick?: number;
}

export function GardenScene({ state, name }: Props) {
  const cls = ['garden-scene', `phase-${state.phase}`, `weather-${state.weather}`, state.calm ? 'calm' : ''].join(' ').trim();
  return (
    <div
      className={cls}
      role="img"
      aria-label={describeScene(state, name)}
      data-testid="garden-scene"
      style={{ '--sun': state.sunIntensity } as CSSProperties}
    >
      <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <Defs />
        <SkyLayer state={state} />
        <CloudsLayer />
        <HillsLayer />
        <GroundLayer />
        <TintLayer />
      </svg>
    </div>
  );
}
