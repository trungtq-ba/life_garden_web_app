import type { CSSProperties } from 'react';

export interface ArtProps {
  growth: number;
  seed: number;
  fish?: number;
}

const sway = (seed: number, amp = 1.5): CSSProperties =>
  ({ '--delay': `${-(seed % 7) * 0.6}s`, '--amp': `${amp}deg` }) as CSSProperties;

const PETALS10 = Array.from({ length: 10 }, (_, i) => i * 36);
const PETALS14 = Array.from({ length: 14 }, (_, i) => (i * 360) / 14);

export function Grass({ seed }: ArtProps) {
  return (
    <g className="sway" style={sway(seed)}>
      <path d="M-18 0 Q-16 -24 -8 -38 Q-8 -18 -4 0Z" fill="url(#leaf)" />
      <path d="M-6 0 Q-4 -30 2 -46 Q6 -22 6 0Z" fill="url(#leaf-dark)" />
      <path d="M4 0 Q8 -22 18 -34 Q14 -16 12 0Z" fill="url(#leaf)" />
      <path d="M12 0 Q18 -14 26 -20 Q22 -8 20 0Z" fill="url(#leaf-dark)" />
    </g>
  );
}

export function Daisy({ seed }: ArtProps) {
  return (
    <g className="sway" style={sway(seed, 2.5)}>
      <path d="M0 0 Q3 -18 0 -36" stroke="#3f9d5a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M1 -12 Q14 -22 20 -14 Q10 -8 1 -12Z" fill="url(#leaf)" />
      <g transform="translate(0 -40)">
        {PETALS10.map((a) => (
          <ellipse key={a} cx="0" cy="-10" rx="3.6" ry="9" fill="url(#petal)" stroke="#dfe7ee" strokeWidth="0.6" transform={`rotate(${a})`} />
        ))}
        <circle r="6" fill="url(#yellow)" />
      </g>
    </g>
  );
}

export function Tulip({ seed }: ArtProps) {
  return (
    <g className="sway" style={sway(seed, 2)}>
      <path d="M0 0 Q-2 -22 0 -40" stroke="#3f9d5a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M-1 -4 Q-20 -16 -18 -36 Q-6 -24 -1 -4Z" fill="url(#leaf)" />
      <path d="M1 -4 Q20 -14 19 -32 Q6 -22 1 -4Z" fill="url(#leaf-dark)" />
      <path d="M-10 -40 Q-12 -58 0 -64 Q12 -58 10 -40 Q0 -33 -10 -40Z" fill="url(#tulip)" />
      <path d="M0 -64 Q-3 -52 0 -38 Q3 -52 0 -64Z" fill="#ffffff" opacity="0.25" />
    </g>
  );
}

export function Sunflower({ seed }: ArtProps) {
  return (
    <g className="sway" style={sway(seed, 1.8)}>
      <path d="M0 0 Q4 -30 0 -62" stroke="#3a9657" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M1 -20 Q26 -34 34 -20 Q18 -10 1 -20Z" fill="url(#leaf)" />
      <path d="M-1 -34 Q-24 -48 -32 -34 Q-16 -24 -1 -34Z" fill="url(#leaf-dark)" />
      <g transform="translate(0 -70)">
        {PETALS14.map((a) => (
          <ellipse key={a} cx="0" cy="-17" rx="5" ry="12" fill="url(#yellow)" transform={`rotate(${a})`} />
        ))}
        <circle r="12" fill="#6d4a2f" />
        <circle r="7" fill="#4b3020" />
        <circle cx="-3" cy="-3" r="1.4" fill="#a67c52" />
        <circle cx="3" cy="2" r="1.4" fill="#a67c52" />
      </g>
    </g>
  );
}

export function AppleTree({ growth, seed }: ArtProps) {
  return (
    <g>
      <path d="M-8 0 Q-6 -30 -3 -52 L5 -52 Q8 -30 9 0Z" fill="url(#trunk)" />
      <g className="sway" style={sway(seed, 1)}>
        <circle cx="-26" cy="-70" r="28" fill="url(#leaf-dark)" />
        <circle cx="26" cy="-72" r="26" fill="url(#leaf-dark)" />
        <circle cx="0" cy="-88" r="34" fill="url(#leaf)" />
        <circle cx="-10" cy="-98" r="14" fill="#a6f0b4" opacity="0.45" />
        <g className="fruit" opacity={growth >= 1 ? 1 : 0}>
          <circle cx="-22" cy="-66" r="5" fill="url(#apple)" />
          <circle cx="20" cy="-70" r="5" fill="url(#apple)" />
          <circle cx="2" cy="-84" r="5" fill="url(#apple)" />
        </g>
      </g>
    </g>
  );
}

export function CherryTree({ growth, seed }: ArtProps) {
  return (
    <g>
      <path d="M-7 0 Q-5 -28 -2 -50 L5 -50 Q7 -28 8 0Z" fill="url(#trunk)" />
      <g className="sway" style={sway(seed, 1.2)}>
        <circle cx="-28" cy="-68" r="26" fill="url(#cherry)" />
        <circle cx="28" cy="-70" r="24" fill="url(#cherry)" />
        <circle cx="0" cy="-86" r="32" fill="url(#cherry)" />
        <circle cx="-10" cy="-96" r="13" fill="#ffffff" opacity="0.4" />
        <g opacity={growth >= 1 ? 1 : 0.0}>
          <circle cx="-30" cy="-60" r="2.4" fill="#fff" />
          <circle cx="24" cy="-58" r="2.4" fill="#fff" />
          <circle cx="6" cy="-100" r="2.4" fill="#fff" />
        </g>
      </g>
    </g>
  );
}
