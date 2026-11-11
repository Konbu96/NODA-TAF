// 記録の推移の折れ線グラフ。タイムの種目は、良い記録ほど上に来るようにする。

export type ChartPoint = { date: string; value: number; label: string; isRef?: boolean };

export function LineChart({
  points, lowerIsBetter, ariaLabel, format,
}: { points: ChartPoint[]; lowerIsBetter: boolean; ariaLabel: string; format: (v: number) => string }) {
  if (points.length === 0) return <p className="m-0 py-6 text-center text-sm text-muted">まだ記録がありません</p>;
  const W = 326;
  const H = 152;
  const left = 40;
  const top = 14;
  const bottom = 130;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;
  const y = (v: number) => {
    const t = (v - min) / (max - min);
    return lowerIsBetter ? top + t * (bottom - top) : bottom - t * (bottom - top);
  };
  const x = (i: number) => (points.length === 1 ? (left + W) / 2 : left + 18 + (i * (W - left - 36)) / (points.length - 1));
  const bestVal = lowerIsBetter ? Math.min(...vals) : Math.max(...vals);
  const bestIdx = vals.lastIndexOf(bestVal);
  const topVal = lowerIsBetter ? min : max;
  const botVal = lowerIsBetter ? max : min;
  const step = Math.max(1, Math.ceil(points.length / 5));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        <line x1={left} y1={top} x2={W} y2={top} stroke="#D5DCE5" />
        <line x1={left} y1={(top + bottom) / 2} x2={W} y2={(top + bottom) / 2} stroke="#D5DCE5" />
        <line x1={left} y1={bottom} x2={W} y2={bottom} stroke="#D5DCE5" />
        <text x="0" y={top + 4} fontSize="10" fill="#64748B">{format(topVal)}</text>
        <text x="0" y={(top + bottom) / 2 + 4} fontSize="10" fill="#64748B">{format((min + max) / 2)}</text>
        <text x="0" y={bottom + 4} fontSize="10" fill="#64748B">{format(botVal)}</text>
        <polyline
          points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")}
          fill="none"
          stroke="#1E3A8A"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={i === bestIdx ? 6 : 3.5} fill={i === bestIdx ? "#EA580C" : "#1E3A8A"} stroke="#FFFFFF" strokeWidth="2">
              <title>{`${p.label} ${format(p.value)}`}</title>
            </circle>
            {p.isRef && (
              <text x={x(i)} y={y(p.value) - 9} fontSize="9" fill="#9A3412" textAnchor="middle" fontWeight="700">
                参
              </text>
            )}
          </g>
        ))}
        {/* 日付は点の真下に出す。多いときは重ならないように間引く（最後は必ず出す） */}
        {points.map((p, i) =>
          i === points.length - 1 || (i % step === 0 && points.length - 1 - i >= step) ? (
            <text
              key={`d${i}`}
              x={x(i)}
              y={bottom + 16}
              fontSize="10"
              fill="#64748B"
              textAnchor="middle"
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
