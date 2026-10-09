import { GardenScene } from './GardenScene';
import { useGardenScene } from './useGardenScene';

export function ConnectedGarden({ size }: { size: 'compact' | 'large' }) {
  const { state, name, wateredTick, justUnlocked } = useGardenScene();
  return <GardenScene state={state} name={name} wateredTick={wateredTick} justUnlocked={justUnlocked} size={size} />;
}
