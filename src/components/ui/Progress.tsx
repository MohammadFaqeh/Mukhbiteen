import { cx } from '@/utils/format';

export function ProgressBar({ value, tone = 'navy', className, thin }: { value: number; tone?: 'navy' | 'burgundy' | 'gold' | 'green'; className?: string; thin?: boolean }) {
  const color = { navy: 'bg-navy-700', burgundy: 'bg-burgundy-600', gold: 'bg-gold-500', green: 'bg-emerald-600' }[tone];
  return (
    <div className={cx('w-full overflow-hidden rounded-full bg-navy-50', thin ? 'h-1.5' : 'h-2', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-[width] duration-700', color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

interface RingProps {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
  tone?: 'navy' | 'burgundy';
}

/** حلقة تقدم مع علامات دقيقة حولها (مثل عداد التسبيح) */
export function ProgressRing({ value, size = 150, stroke = 10, label, sub, tone = 'navy' }: RingProps) {
  const r = (size - stroke) / 2 - 6;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const id = `ring-${tone}`;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            {tone === 'navy' ? (
              <>
                <stop offset="0" stopColor="#3E5275" />
                <stop offset="1" stopColor="#1E2B45" />
              </>
            ) : (
              <>
                <stop offset="0" stopColor="#B04F64" />
                <stop offset="1" stopColor="#6E2032" />
              </>
            )}
          </linearGradient>
        </defs>
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * 2 * Math.PI;
          const R1 = size / 2 - 1;
          const R2 = size / 2 - (i % 5 === 0 ? 5 : 3);
          return (
            <line
              key={i}
              x1={size / 2 + R1 * Math.cos(a)}
              y1={size / 2 + R1 * Math.sin(a)}
              x2={size / 2 + R2 * Math.cos(a)}
              y2={size / 2 + R2 * Math.sin(a)}
              stroke={i / 60 <= v / 100 ? '#B8975A' : '#D9DFEA'}
              strokeWidth={1}
            />
          );
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF1F6" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label && <span className="text-[28px] font-extrabold leading-none text-navy-800">{label}</span>}
        {sub && <span className="mt-1 text-[12px] text-navy-400">{sub}</span>}
      </div>
    </div>
  );
}
