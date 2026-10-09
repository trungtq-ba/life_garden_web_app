const TREE_BLOBS = [
  { x: 120, y: 372, r: 16 }, { x: 150, y: 368, r: 12 }, { x: 760, y: 352, r: 15 },
  { x: 800, y: 350, r: 11 }, { x: 905, y: 366, r: 14 },
];

export function HillsLayer() {
  return (
    <>
      <g className="layer layer-far-hills" data-depth="0.35">
        <path d="M-40 335 C 150 270, 300 305, 450 288 S 750 250, 1040 305 L1040 440 L-40 440Z" fill="url(#far-hill)" />
      </g>
      <g className="layer layer-near-hills" data-depth="0.55">
        <path d="M-40 385 C 200 330, 380 365, 560 342 S 860 332, 1040 370 L1040 470 L-40 470Z" fill="url(#near-hill)" />
        {TREE_BLOBS.map((b, i) => (
          <g key={i}>
            <rect x={b.x - 1.5} y={b.y} width="3" height="9" fill="#5a7d63" />
            <circle cx={b.x} cy={b.y} r={b.r} fill="#4f9e6c" opacity="0.9" />
          </g>
        ))}
      </g>
    </>
  );
}

export function GroundLayer() {
  return (
    <g className="layer layer-ground" data-depth="0.75">
      <path d="M-40 425 C 250 398, 520 432, 1040 402 L1040 640 L-40 640Z" fill="url(#ground)" />
      <ellipse cx="260" cy="520" rx="260" ry="26" fill="#ffffff" opacity="0.06" />
      <ellipse cx="760" cy="560" rx="300" ry="30" fill="#ffffff" opacity="0.05" />
    </g>
  );
}

export function TintLayer() {
  return (
    <g className="layer-tint" aria-hidden="true">
      <rect className="tint tint-dawn" x="-40" y="-40" width="1080" height="680" fill="#ffaabe" />
      <rect className="tint tint-dusk" x="-40" y="-40" width="1080" height="680" fill="#ff8c50" />
      <rect className="tint tint-night" x="-40" y="-40" width="1080" height="680" fill="#081a3c" />
    </g>
  );
}
