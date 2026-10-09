import { useRef } from 'react';
import { GardenScene } from './GardenScene';
import { useGardenScene } from './useGardenScene';

export function ConnectedGarden({ size }: { size: 'compact' | 'large' }) {
  const { state, name, wateredTick, justUnlocked } = useGardenScene();
  // wateredTick sống suốt phiên; chỉ phát hiệu ứng cho những lần tưới xảy ra khi cảnh đang hiển thị.
  const mountedAt = useRef(wateredTick);
  return (
    <GardenScene
      state={state}
      name={name}
      wateredTick={wateredTick - mountedAt.current}
      justUnlocked={justUnlocked}
      size={size}
    />
  );
}
