const stops = (pairs: [number, string][]) =>
  pairs.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />);

function Linear({ id, pairs, x2 = 0, y2 = 1 }: { id: string; pairs: [number, string][]; x2?: number; y2?: number }) {
  return <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>{stops(pairs)}</linearGradient>;
}
function Radial({ id, pairs }: { id: string; pairs: [number, string, number?][] }) {
  return (
    <radialGradient id={id}>
      {pairs.map(([o, c, a]) => <stop key={o} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
    </radialGradient>
  );
}

export function Defs() {
  return (
    <defs>
      <Linear id="sky-dawn" pairs={[[0, '#8f9fe0'], [0.55, '#f3b9c8'], [1, '#ffdcb0']]} />
      <Linear id="sky-day" pairs={[[0, '#5aa9ee'], [0.6, '#a8dcf2'], [1, '#e4f7ec']]} />
      <Linear id="sky-dusk" pairs={[[0, '#4a3f8f'], [0.55, '#d9779a'], [1, '#ffb978']]} />
      <Linear id="sky-night" pairs={[[0, '#081a38'], [0.7, '#17406a'], [1, '#1f5b73']]} />
      <Linear id="far-hill" pairs={[[0, '#9ccbb8'], [1, '#cbe6d9']]} />
      <Linear id="near-hill" pairs={[[0, '#62b583'], [1, '#8fd09b']]} />
      <Linear id="ground" pairs={[[0, '#4fa468'], [1, '#86c98f']]} />
      <Linear id="leaf" pairs={[[0, '#86e096'], [1, '#3a9657']]} />
      <Linear id="leaf-dark" pairs={[[0, '#4fb06b'], [1, '#23744a']]} />
      <Linear id="trunk" x2={1} y2={0} pairs={[[0, '#b07a52'], [1, '#6a452f']]} />
      <Linear id="petal" pairs={[[0, '#ffffff'], [1, '#e8eef4']]} />
      <Linear id="yellow" pairs={[[0, '#ffe680'], [1, '#f5a623']]} />
      <Linear id="tulip" pairs={[[0, '#ff9bb3'], [1, '#dc3d77']]} />
      <Linear id="cherry" pairs={[[0, '#ffd8e6'], [1, '#f48fb1']]} />
      <Linear id="stone" pairs={[[0, '#cfd6dc'], [1, '#8e9aa6']]} />
      <Linear id="wood" pairs={[[0, '#c68e5c'], [1, '#8a5a36']]} />
      <Linear id="water" pairs={[[0, '#7fd3f0'], [1, '#2f8fc7']]} />
      <Linear id="apple" pairs={[[0, '#ff7a7a'], [1, '#d63030']]} />
      <Radial id="sun" pairs={[[0, '#fff6c8'], [0.6, '#ffd45e'], [1, '#ffb02e']]} />
      <Radial id="sun-glow" pairs={[[0, '#ffe9a0', 0.9], [1, '#ffe9a0', 0]]} />
      <Radial id="moon" pairs={[[0, '#fffdf0'], [1, '#dfe6ee']]} />
      <Radial id="moon-glow" pairs={[[0, '#cfe0ff', 0.5], [1, '#cfe0ff', 0]]} />
      <Radial id="shadow" pairs={[[0, '#0c2d1a', 0.35], [1, '#0c2d1a', 0]]} />
    </defs>
  );
}
