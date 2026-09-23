import { useMemo, useState } from 'react';
import { useParentStudent } from '@/hooks/useParentStudent';
import PageHeader from '@/components/shared/PageHeader';
import WorshipCard from '@/components/parent/WorshipCard';
import WorshipWeekGrid from '@/components/shared/WorshipWeekGrid';
import Select from '@/components/ui/Select';
import { monthKey } from '@/utils/stats';
import { dailyWorshipScore, weekDates, weekStartOf, weekWorshipScore } from '@/utils/worship';
import { formatDate, formatMonthKey, pct } from '@/utils/format';

export default function ParentWorship() {
  const { worship, stats } = useParentStudent();

  const weeks = useMemo(() => [...new Set(worship.map((d) => weekStartOf(d.date)))].sort().reverse(), [worship]);
  const [weekStart, setWeekStart] = useState(weeks[0] ?? '');
  const dates = useMemo(() => weekDates(weekStart || weeks[0] || ''), [weekStart, weeks]);
  const daysMap = useMemo(() => Object.fromEntries(dates.map((d) => [d, worship.find((w) => w.date === d)])), [dates, worship]);
  const weekDays = dates.map((d) => daysMap[d]).filter((d): d is NonNullable<typeof d> => !!d);
  const weekScore = weekWorshipScore(weekDays);

  const months = useMemo(() => [...new Set(worship.map((d) => monthKey(d.date)))].sort().reverse(), [worship]);
  const monthlyAvg = months.map((m) => {
    const list = worship.filter((d) => monthKey(d.date) === m);
    const v = Math.round(list.reduce((a, d) => a + dailyWorshipScore(d), 0) / (list.length || 1));
    return { m, v };
  });

  if (!stats) return null;

  return (
    <div>
      <PageHeader
        title="العبادات"
        subtitle="جدول العبادات الأسبوعي (من السبت إلى الخميس) – يوم الجمعة هو يوم الدوام بالمركز"
        actions={
          weeks.length > 0 && (
            <Select value={weekStart || weeks[0]} onChange={setWeekStart} options={weeks.map((w) => ({ value: w, label: `أسبوع ${formatDate(w)}` }))} className="w-52" ariaLabel="اختيار الأسبوع" />
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <WorshipCard weekDays={weekDays} monthAverage={stats.worship} />
        </div>
        <section className="card p-5 lg:col-span-8">
          <h3 className="section-title mb-4">معدل العبادات الشهري</h3>
          {monthlyAvg.length ? (
            <div className="space-y-3">
              {monthlyAvg.map(({ m, v }) => (
                <div key={m}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="text-navy-600">{formatMonthKey(m)}</span>
                    <b className="text-navy-900">{v}%</b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-navy-50">
                    <div className="h-full rounded-full bg-gradient-to-l from-emerald-600 to-emerald-400" style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-navy-400">لا توجد بيانات بعد.</p>
          )}
        </section>
      </div>

      <section className="card mt-4 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title">جدول الأسبوع</h3>
          <span className="text-[13px] text-navy-500">
            علامة الأسبوع: <b className="text-navy-900">{pct(weekScore)}</b>
          </span>
        </div>
        {dates.length ? <WorshipWeekGrid dates={dates} days={daysMap} /> : <p className="text-navy-400">لا توجد بيانات بعد.</p>}
      </section>
    </div>
  );
}
