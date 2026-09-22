import { useMemo, useState } from 'react';
import type { SessionRecord } from '@/types';
import { ProgressRing } from '@/components/ui/Progress';
import Select from '@/components/ui/Select';
import { availableMonths, studentStats } from '@/utils/stats';
import { formatMonthKey, pct } from '@/utils/format';

/** المعدل التراكمي (حلقة) + معدل الشهر مع اختيار الشهر */
export default function AverageCard({ sessions, studentId }: { sessions: SessionRecord[]; studentId: string }) {
  const months = useMemo(() => availableMonths(sessions), [sessions]);
  const [month, setMonth] = useState(months[0] ?? '');
  const all = useMemo(() => studentStats(sessions, studentId), [sessions, studentId]);
  const m = useMemo(() => studentStats(sessions, studentId, month), [sessions, studentId, month]);
  const diff = Math.round((m.monthAverage - all.cumulative) * 10) / 10;

  return (
    <section className="card flex h-full flex-col p-5">
      <h3 className="section-title">المعدل التراكمي</h3>
      <div className="flex flex-1 items-center justify-center py-3">
        <ProgressRing value={all.cumulative} label={all.cumulative.toFixed(1)} sub="من 100" size={156} />
      </div>
      <div className="rounded-xl bg-navy-50/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="whitespace-nowrap text-[13px] font-medium text-navy-600">معدل الشهر</span>
          <Select small ariaLabel="اختيار الشهر" value={month} onChange={setMonth} options={months.map((k) => ({ value: k, label: formatMonthKey(k) }))} className="min-w-0 max-w-[140px] flex-1" />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="text-[26px] font-extrabold text-burgundy-700">{pct(m.monthAverage)}</span>
          <span className={diff >= 0 ? 'text-[12px] text-emerald-700' : 'text-[12px] text-burgundy-600'}>
            {diff >= 0 ? '▲' : '▼'} {Math.abs(diff)} عن المعدل التراكمي
          </span>
        </div>
      </div>
    </section>
  );
}
