import type { CSSProperties } from 'react';
import type { ArtProps } from './Plants';

export function Stone() {
  return (
    <g>
      <ellipse cx="0" cy="-8" rx="22" ry="13" fill="url(#stone)" />
      <ellipse cx="-14" cy="-4" rx="11" ry="7" fill="url(#stone)" />
      <ellipse cx="-6" cy="-13" rx="9" ry="4" fill="#ffffff" opacity="0.35" />
    </g>
  );
}

export function Bench() {
  return (
    <g>
      <rect x="-40" y="-26" width="80" height="6" rx="2" fill="url(#wood)" />
      <rect x="-40" y="-44" width="80" height="6" rx="2" fill="url(#wood)" />
      <rect x="-36" y="-44" width="5" height="40" fill="#6a452f" />
      <rect x="31" y="-44" width="5" height="40" fill="#6a452f" />
      <rect x="-36" y="-20" width="5" height="20" fill="#6a452f" />
      <rect x="31" y="-20" width="5" height="20" fill="#6a452f" />
    </g>
  );
}

export function Lantern() {
  return (
    <g>
      <rect x="-2" y="-64" width="4" height="64" rx="2" fill="#616161" />
      <circle className="lantern-glow" cy="-72" r="46" fill="url(#sun-glow)" />
      <rect x="-9" y="-86" width="18" height="22" rx="4" fill="#ffd45e" />
      <rect x="-11" y="-90" width="22" height="5" rx="2" fill="#424242" />
      <rect x="-11" y="-66" width="22" height="4" rx="2" fill="#424242" />
    </g>
  );
}

const fishStyle = (i: number): CSSProperties =>
  ({ '--delay': `${-i * 3.2}s`, '--rx': `${40 + i * 10}px`, '--ry': `${10 + i * 4}px` }) as CSSProperties;

export function Pond({ growth, fish = 0 }: ArtProps) {
  const level = 0.55 + 0.45 * growth;
  return (
    <g>
      <ellipse cx="0" cy="0" rx="118" ry="40" fill="#8a8f97" />
      <ellipse cx="0" cy="-3" rx="112" ry="36" fill="#b9c0c8" />
      <g transform={`scale(${level})`}>
        <ellipse cx="0" cy="-3" rx="106" ry="33" fill="url(#water)" />
        <ellipse cx="-30" cy="-12" rx="46" ry="8" fill="#ffffff" opacity="0.28" />
        <g className="ripple">
          <ellipse cx="30" cy="2" rx="22" ry="6" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
        </g>
        {Array.from({ length: fish }, (_, i) => (
          <g key={i} className="fish" style={fishStyle(i)}>
            <ellipse cx="0" cy="0" rx="8" ry="3.2" fill="#ff9f5a" />
            <path d="M-7 0 L-13 -3.5 L-13 3.5Z" fill="#ff7a2e" />
          </g>
        ))}
        <ellipse cx="-56" cy="6" rx="14" ry="5" fill="#4aa862" />
        <ellipse cx="46" cy="-8" rx="12" ry="4.4" fill="#4aa862" />
        <circle cx="-56" cy="3" r="3.6" fill="#ffd6e3" />
      </g>
    </g>
  );
}

export function Bridge() {
  return (
    <g>
      <path d="M-124 0 Q0 -66 124 0" stroke="#8a5a36" strokeWidth="16" fill="none" strokeLinecap="round" />
      <path d="M-124 -4 Q0 -70 124 -4" stroke="#c68e5c" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M-106 -22 Q0 -86 106 -22" stroke="#6a452f" strokeWidth="3" fill="none" />
      {[-84, -42, 0, 42, 84].map((x) => (
        <rect key={x} x={x - 2} y={-60 + Math.abs(x) * 0.26} width="4" height="22" fill="#6a452f" />
      ))}
    </g>
  );
}
