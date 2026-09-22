import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useParentStudent } from '@/hooks/useParentStudent';
import PageHeader from '@/components/shared/PageHeader';
import WorshipCard from '@/components/parent/WorshipCard';
import Select from '@/components/ui/Select';
import { availableMonths, monthKey, worshipPercent } from '@/utils/stats';
import { formatDayMonth, formatMonthKey, pct, worshipItems } from '@/utils/format';

export default function ParentWorship() {
  const { sessions, stats } = useParentStudent();
  const months = useMemo(() => availableMonths(sessions), [sessions]);
  const [month, setMonth] = useState(months[0] ?? '');
  const days = sessions.filter((s) => s.worship && monthKey(s.date) === month).slice().reverse();
  const perItem = worshipItems.map((w) => ({ ...w, rate: days.length ? Math.round((days.filter((d) => d.worship![w.key]).length / days.length) * 100) : 0 }));
  if (!stats) return null;

  return (
    <div>
      <PageHeader
        title="العبادات"
        subtitle="متابعة الصلوات والأذكار وورد القرآن"
        actions={<Select value={month} onChange={setMonth} options={months.map((m) => ({ value: m, label: formatMonthKey(m) }))} className="w-44" ariaLabel="الشهر" />}
      />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <WorshipCard last={stats.lastAttended} monthAverage={stats.worship} />
        </div>
        <section className="card p-5 lg:col-span-7">
          <h3 className="section-title mb-4">نسبة المحافظة في {formatMonthKey(month)}</h3>
          <div className="space-y-2.5">
            {perItem.map((w) => (
              <div key={w.key} className="flex items-center gap-3 text-[13px]">
                <span className="w-24 shrink-0 text-navy-600">{w.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-navy-50">
                  <div className="h-full rounded-full bg-gradient-to-l from-navy-700 to-navy-500" style={{ width: `${w.rate}%` }} />
                </div>
                <span className="w-10 text-left font-bold text-navy-800">{w.rate}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card mt-4 p-5">
        <h3 className="section-title mb-4">جدول الشهر</h3>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead>
              <tr>
                <th className="pb-2 text-right font-medium text-navy-400">العبادة</th>
                {days.map((d) => (
                  <th key={d.id} className="pb-2 font-medium text-navy-500">
                    {formatDayMonth(d.date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {worshipItems.map((w) => (
                <tr key={w.key} className="border-t border-navy-50">
                  <td className="py-2 text-[13px] text-navy-700">{w.label}</td>
                  {days.map((d) => (
                    <td key={d.id} className="py-2 text-center">
                      {d.worship![w.key] ? <Check className="mx-auto h-4 w-4 text-emerald-600" strokeWidth={2.6} /> : <X className="mx-auto h-4 w-4 text-burgundy-400" strokeWidth={2.6} />}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-navy-100">
                <td className="py-2 text-[13px] font-bold text-navy-800">نسبة اليوم</td>
                {days.map((d) => (
                  <td key={d.id} className="py-2 text-center font-bold text-navy-800">
                    {pct(worshipPercent(d.worship), 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
