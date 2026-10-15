import { useState } from 'react';
import type { MemorizationEntry, RevisionEntry } from '@/types';
import { useParentStudent } from '@/hooks/useParentStudent';
import PageHeader from '@/components/shared/PageHeader';
import JuzMap from '@/components/shared/JuzMap';
import { MemorizationCard, RevisionCard } from '@/components/parent/QuranCards';
import { ProgressBar } from '@/components/ui/Progress';
import StatCard from '@/components/ui/StatCard';
import { BookOpen, RotateCcw, Target } from 'lucide-react';
import { cx, formatDate, pct } from '@/utils/format';
import { hasMeasure, isApproved } from '@/utils/quran';

export default function ParentQuran() {
  const { student, sessions, stats } = useParentStudent();
  const [tab, setTab] = useState<'mem' | 'rev'>('mem');
  const rows = sessions.filter((s) => (tab === 'mem' ? s.memorization : s.revision)).slice(0, 12);
  if (!stats || !student) return null;
  const completionCell = (e: MemorizationEntry | RevisionEntry) => (
    <>
      {!isApproved(e) && e.completedPages > 0 ? (
        <span className="text-[12px] font-bold text-amber-700">سُمّع ولم يُعتمد</span>
      ) : hasMeasure(e) ? (
        <div className="flex items-center gap-2">
          <ProgressBar value={e.completion} thin tone={tab === 'mem' ? 'navy' : 'burgundy'} />
          <span className="w-12 text-[12px] text-navy-500">{e.completion}/100</span>
        </div>
      ) : (
        <span className="text-[12px] text-navy-400">بلا عدد صفحات</span>
      )}
    </>
  );
  return (
    <div>
      <PageHeader title="الحفظ والمراجعة" subtitle="سجل التسميع والمراجعة في أيام الدوام الأخيرة" />
      <div className="mb-4">
        <JuzMap student={student} />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          <MemorizationCard last={sessions.find((s) => s.memorization)} />
          <RevisionCard sessions={sessions} />
        </div>
        <div className="space-y-4 lg:col-span-7">
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={BookOpen} label="متوسط جودة الحفظ" value={pct(stats.memorization)} tone="navy" />
            <StatCard icon={RotateCcw} label="متوسط جودة المراجعة" value={pct(stats.revision)} tone="burgundy" />
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
            {/* على التلفون: بطاقة لكل يوم بدل جدول يحتاج تمرير جانبي */}
            <ul className="space-y-2 sm:hidden">
              {rows.map((s) => {
                const e = tab === 'mem' ? s.memorization! : s.revision!;
                return (
                  <li key={s.id} className="rounded-xl border border-navy-50 bg-paper/40 p-3 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] text-navy-500">{formatDate(s.date)}</span>
                      <span className="text-[12px] text-navy-400">
                        التقييم: <b className="text-navy-900">{e.grade}</b>
                      </span>
                    </div>
                    <p className="mt-1.5 text-navy-600">
                      المطلوب: <b className="text-navy-800">{e.required}</b>
                    </p>
                    <p className="mt-0.5 text-navy-600">
                      ما تم: <b className="text-navy-800">{'recited' in e ? e.recited : e.revised}</b>
                    </p>
                    <div className="mt-2">{completionCell(e)}</div>
                  </li>
                );
              })}
            </ul>
            <div className="scrollbar-thin hidden overflow-x-auto sm:block">
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
                          {completionCell(e)}
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
