import { useState } from 'react';
import { useParentStudent } from '@/hooks/useParentStudent';
import PageHeader from '@/components/shared/PageHeader';
import { MemorizationCard, RevisionCard } from '@/components/parent/QuranCards';
import { ProgressBar } from '@/components/ui/Progress';
import StatCard from '@/components/ui/StatCard';
import { BookOpen, RotateCcw, Target } from 'lucide-react';
import { cx, formatDate, pct } from '@/utils/format';

export default function ParentQuran() {
  const { sessions, stats } = useParentStudent();
  const [tab, setTab] = useState<'mem' | 'rev'>('mem');
  const rows = sessions.filter((s) => (tab === 'mem' ? s.memorization : s.revision)).slice(0, 12);
  if (!stats) return null;
  return (
    <div>
      <PageHeader title="الحفظ والمراجعة" subtitle="سجل التسميع والمراجعة في أيام الدوام الأخيرة" />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          <MemorizationCard last={sessions.find((s) => s.memorization)} />
          <RevisionCard sessions={sessions} />
        </div>
        <div className="space-y-4 lg:col-span-7">
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={BookOpen} label="متوسط التسميع" value={pct(stats.memorization)} tone="navy" />
            <StatCard icon={RotateCcw} label="متوسط المراجعة" value={pct(stats.revision)} tone="burgundy" />
            <StatCard icon={Target} label="أيام مسجلة" value={String(sessions.filter((s) => s.memorization).length)} tone="gold" />
          </div>
          <section className="card p-5">
            <div className="mb-4 inline-flex rounded-xl bg-navy-50 p-1">
              {(
                [
                  ['mem', 'سجل الحفظ'],
                  ['rev', 'سجل المراجعة'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} className={cx('rounded-lg px-4 py-1.5 text-[13px] font-bold transition', tab === k ? 'bg-white text-navy-900 shadow-soft' : 'text-navy-500')}>
                  {l}
                </button>
              ))}
            </div>
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="text-right text-[12px] text-navy-400">
                    <th className="pb-2 font-medium">التاريخ</th>
                    <th className="pb-2 font-medium">المطلوب</th>
                    <th className="pb-2 font-medium">ما تم</th>
                    <th className="w-32 pb-2 font-medium">الإنجاز</th>
                    <th className="pb-2 font-medium">التقييم</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const e = tab === 'mem' ? s.memorization! : s.revision!;
                    return (
                      <tr key={s.id} className="border-t border-navy-50">
                        <td className="py-2.5 text-navy-500">{formatDate(s.date)}</td>
                        <td className="py-2.5 font-medium text-navy-800">{e.required}</td>
                        <td className="py-2.5 text-navy-600">{'recited' in e ? e.recited : e.revised}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <ProgressBar value={e.completion} thin tone={tab === 'mem' ? 'navy' : 'burgundy'} />
                            <span className="w-9 text-[12px] text-navy-500">{e.completion}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 font-bold text-navy-900">{e.grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
