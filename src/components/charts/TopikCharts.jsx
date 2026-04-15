/**
 * TOPIK-style chart SVG components for monologue description practice.
 * Each chart is a self-contained React component rendered inline.
 */

const chartStyle = {
  width: '100%',
  maxWidth: 480,
  margin: '0 auto',
  display: 'block',
};

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

/* ── Bar chart: 한국인이 좋아하는 여가 활동 ──────────────── */
function LeisureBarChart() {
  const data = [
    { label: '운동', pct: 35 },
    { label: 'OTT 시청', pct: 28 },
    { label: '독서', pct: 15 },
    { label: '게임', pct: 12 },
    { label: '여행', pct: 10 },
  ];
  const maxPct = 40;
  const barH = 28, gap = 12, padTop = 50, padLeft = 80, padRight = 40;
  const chartH = data.length * (barH + gap) - gap;
  const svgH = chartH + padTop + 30;
  const svgW = 440;
  const barArea = svgW - padLeft - padRight;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={chartStyle} role="img" aria-label="한국인이 좋아하는 여가 활동 설문 결과 막대 그래프">
      <text className="chart-title" x={svgW / 2} y={24} textAnchor="middle" fill="#e0e0e0" fontSize="14" fontWeight="600">
        한국인이 좋아하는 여가 활동 (2025)
      </text>
      <text className="chart-subtitle" x={svgW / 2} y={42} textAnchor="middle" fill="#999" fontSize="11">
        (단위: %, 복수 응답, 응답자 1,200명)
      </text>
      {data.map((d, i) => {
        const y = padTop + i * (barH + gap);
        const w = (d.pct / maxPct) * barArea;
        return (
          <g key={d.label}>
            <text className="chart-axis-label" x={padLeft - 8} y={y + barH / 2 + 5} textAnchor="end" fill="#ccc" fontSize="12">{d.label}</text>
            <rect x={padLeft} y={y} width={w} height={barH} rx={4} fill={COLORS[i]} />
            <text className="chart-data-label" x={padLeft + w + 6} y={y + barH / 2 + 5} fill="#bbb" fontSize="11">{d.pct}%</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Line chart: 1인 가구 수 변화 ──────────────────────── */
function HouseholdLineChart() {
  const data = [
    { year: '2015', val: 520 },
    { year: '2017', val: 562 },
    { year: '2019', val: 615 },
    { year: '2021', val: 665 },
    { year: '2023', val: 718 },
    { year: '2025', val: 750 },
  ];
  const svgW = 440, svgH = 260;
  const padTop = 55, padBottom = 35, padLeft = 55, padRight = 25;
  const chartW = svgW - padLeft - padRight;
  const chartH = svgH - padTop - padBottom;
  const minVal = 400, maxVal = 800;
  const xStep = chartW / (data.length - 1);

  const points = data.map((d, i) => ({
    x: padLeft + i * xStep,
    y: padTop + chartH - ((d.val - minVal) / (maxVal - minVal)) * chartH,
    ...d,
  }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  const gridLines = [400, 500, 600, 700, 800];

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={chartStyle} role="img" aria-label="1인 가구 수 변화 꺾은선 그래프">
      <text className="chart-title" x={svgW / 2} y={22} textAnchor="middle" fill="#e0e0e0" fontSize="14" fontWeight="600">
        한국 1인 가구 수 변화
      </text>
      <text className="chart-subtitle" x={svgW / 2} y={40} textAnchor="middle" fill="#999" fontSize="11">
        (단위: 만 가구)
      </text>
      {/* grid */}
      {gridLines.map((v) => {
        const y = padTop + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;
        return (
          <g key={v}>
            <line x1={padLeft} y1={y} x2={svgW - padRight} y2={y} stroke="#333" strokeDasharray="3,3" />
            <text className="chart-grid-label" x={padLeft - 8} y={y + 4} textAnchor="end" fill="#888" fontSize="10">{v}</text>
          </g>
        );
      })}
      {/* line */}
      <polyline points={polyline} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinejoin="round" />
      {/* dots + labels */}
      {points.map((p) => (
        <g key={p.year}>
          <circle cx={p.x} cy={p.y} r={4} fill="#818cf8" />
          <text className="chart-data-label" x={p.x} y={p.y - 10} textAnchor="middle" fill="#ccc" fontSize="10">{p.val}</text>
          <text className="chart-year-label" x={p.x} y={svgH - padBottom + 16} textAnchor="middle" fill="#aaa" fontSize="10">{p.year}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Pie chart: 직장인 스트레스 원인 ──────────────────── */
function StressPieChart() {
  const data = [
    { label: '업무량', pct: 38, color: '#6366f1' },
    { label: '인간관계', pct: 25, color: '#818cf8' },
    { label: '연봉', pct: 20, color: '#a5b4fc' },
    { label: '출퇴근', pct: 12, color: '#c7d2fe' },
    { label: '기타', pct: 5, color: '#e0e7ff' },
  ];
  const cx = 160, cy = 150, r = 85;
  const svgW = 440, svgH = 290;
  let cumAngle = -90; // start from top

  const slices = data.map((d) => {
    const startAngle = cumAngle;
    const sweep = (d.pct / 100) * 360;
    cumAngle += sweep;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + sweep) * Math.PI) / 180;
    const largeArc = sweep > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const midRad = ((startAngle + sweep / 2) * Math.PI) / 180;
    const labelR = r + 22;
    const lx = cx + labelR * Math.cos(midRad);
    const ly = cy + labelR * Math.sin(midRad);
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z`, lx, ly };
  });

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} style={chartStyle} role="img" aria-label="직장인 스트레스 원인 원 그래프">
      <text className="chart-title" x={svgW / 2} y={22} textAnchor="middle" fill="#e0e0e0" fontSize="14" fontWeight="600">
        직장인 스트레스 원인 조사
      </text>
      <text className="chart-subtitle" x={svgW / 2} y={40} textAnchor="middle" fill="#999" fontSize="11">
        (단위: %, 직장인 800명 대상)
      </text>
      {slices.map((s) => (
        <g key={s.label}>
          <path d={s.path} fill={s.color} stroke="#1a1a2e" strokeWidth="1.5" />
          <text className="chart-data-label" x={s.lx} y={s.ly + 4} textAnchor="middle" fill="#ccc" fontSize="10">
            {s.pct}%
          </text>
        </g>
      ))}
      {/* Legend */}
      {data.map((d, i) => (
        <g key={d.label}>
          <rect x={300} y={70 + i * 24} width={14} height={14} rx={3} fill={d.color} />
          <text className="chart-legend-label" x={320} y={82 + i * 24} fill="#ccc" fontSize="11">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

/* ── Export map ───────────────────────────────────────── */
const topikCharts = {
  'leisure-bar': LeisureBarChart,
  'household-line': HouseholdLineChart,
  'stress-pie': StressPieChart,
};

export default topikCharts;
