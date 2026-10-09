import type { SceneState } from '../../../domain/scene';

const RAINBOW = ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#748ffc', '#b197fc'];

/** Cầu vồng nằm sau đồi: chân vòng cung chìm sau các lớp đồi. */
export function RainbowLayer({ state }: { state: SceneState }) {
  return (
    <g className="layer layer-rainbow" data-depth="0.3">
      <g className="rainbow" data-visible={state.rainbow}>
        {RAINBOW.map((c, i) => {
          const r = 360 - i * 12;
          return <path key={c} className="arc" d={`M${500 - r} 450 A${r} ${r} 0 0 1 ${500 + r} 450`} stroke={c} strokeWidth="10" fill="none" />;
        })}
      </g>
    </g>
  );
}
