import { useMemo, useState } from 'react';
import { formatDayMonth } from '@/utils/format';

interface Point {
  date: string;
  score: number;
}

/** رسم بياني خطي خفيف (SVG) لعلامات أيام الدوام – بدون مكتبات خارجية */
export default function ScoreChart({ data, height = 170 }: { data: Point[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = height;
  const pad = { t: 18, r: 18, b: 28, l: 34 };
  const { min, max, pts } = useMemo(() => {
    const scores = data.map((d) => d.score);
    const lo = Math.max(0, Math.floor((Math.min(...scores, 100) - 6) / 5) * 5);
    const hi = 100;
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    // الاتجاه RTL: الأقدم يمينًا والأحدث يسارًا
    const p = data.map((d, i) => ({
      x: W - pad.r - (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw),
      y: pad.t + ih - ((d.score - lo) / (hi - lo)) * ih,
      ...d,
    }));
    return { min: lo, max: hi, pts: p };
  }, [data, H]);

  if (!data.length) return <p className="py-10 text-center text-sm text-navy-400">لا توجد علامات مسجلة بعد.</p>;

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${H - pad.b} L${pts[0].x},${H - pad.b} Z`;
  const grid = [min, Math.round((min + max) / 2), max];
  const yOf = (v: number) => pad.t + (H - pad.t - pad.b) - ((v - min) / (max - min)) * (H - pad.t - pad.b);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="تغير علامات الطالب">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A2336" stopOpacity=".18" />
          <stop offset="1" stopColor="#7A2336" stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g) => (
        <g key={g}>
          <line x1={pad.r} x2={W - pad.l + 12} y1={yOf(g)} y2={yOf(g)} stroke="#EEF1F6" strokeDasharray="3 5" />
          <text x={W - 6} y={yOf(g) + 4} fontSize="11" fill="#8496B5" textAnchor="end">
            {g}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#area)" />
      <path d={line} fill="none" stroke="#7A2336" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={p.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} className="cursor-default">
          <rect x={p.x - 20} y={pad.t} width={40} height={H - pad.t - pad.b} fill="transparent" />
          <circle cx={p.x} cy={p.y} r={hover === i ? 6 : 4} fill="#fff" stroke={i === pts.length - 1 ? '#B8975A' : '#1E2B45'} strokeWidth="2.5" />
          <text x={p.x} y={H - 8} fontSize="11" fill="#5A6E93" textAnchor="middle">
            {formatDayMonth(p.date)}
          </text>
          {(hover === i || (hover === null && i === pts.length - 1)) && (
            <g>
              <rect x={p.x - 20} y={p.y - 32} width="40" height="22" rx="8" fill="#1E2B45" />
              <text x={p.x} y={p.y - 17} fontSize="12" fontWeight="700" fill="#fff" textAnchor="middle">
                {p.score}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
