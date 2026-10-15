import { useMemo } from 'react';
import { useParentStudent } from '@/hooks/useParentStudent';
import PageHeader from '@/components/shared/PageHeader';
import ReportsPanel from '@/components/shared/ReportsPanel';
import { availableMonths, studentStats } from '@/utils/stats';
import { formatMonthKey, pct } from '@/utils/format';
import { ProgressBar } from '@/components/ui/Progress';

export default function ParentReports() {
  const { student, sessions, worship } = useParentStudent();
  const months = useMemo(() => availableMonths(sessions), [sessions]);
  if (!student) return null;
  const rows = months.map((m) => {
    const monthSessions = sessions.filter((s) => s.date.startsWith(m));
    const st = studentStats(monthSessions, worship, student.id, m);
    return { m, ...st, count: monthSessions.length };
  });
  return (
    <div>
      <PageHeader title="التقارير" subtitle="ملخص أداء الطالب حسب الأشهر، وتحميل تقرير PDF لأي فترة" />
      <div className="grid gap-4 lg:grid-cols-12">
        <ReportsPanel student={student} className="lg:col-span-4" />
        <section className="card p-5 lg:col-span-8">
          <h3 className="section-title mb-4">ملخص الأشهر</h3>
          {/* على التلفون: بطاقة لكل شهر بدل جدول يحتاج تمرير جانبي ويخفي نص الأعمدة */}
          <ul className="space-y-2 sm:hidden">
            {rows.map((r) => (
              <li key={r.m} className="rounded-xl border border-navy-50 bg-paper/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <b className="text-[14px] text-navy-900">{formatMonthKey(r.m)}</b>
                  <span className="text-[12px] text-navy-500">{r.count} أيام دوام</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-navy-400">المعدل</span>
                  <ProgressBar value={r.monthAverage} thin />
                  <b className="w-12 shrink-0 text-[13px] text-navy-900">{pct(r.monthAverage)}</b>
                </div>
                <div className="mt-2 flex gap-4 text-[12px] text-navy-500">
                  <span>
                    الحضور: <b className="text-navy-800">{pct(r.attendance)}</b>
                  </span>
                  <span>
                    العبادات: <b className="text-navy-800">{pct(r.worship)}</b>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="scrollbar-thin hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead>
                <tr className="text-right text-[12px] text-navy-400">
                  <th className="pb-2 font-medium">الشهر</th>
                  <th className="pb-2 font-medium">أيام الدوام</th>
                  <th className="w-40 pb-2 font-medium">المعدل</th>
                  <th className="pb-2 font-medium">الحضور</th>
                  <th className="pb-2 font-medium">العبادات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.m} className="border-t border-navy-50">
                    <td className="py-3 font-bold text-navy-800">{formatMonthKey(r.m)}</td>
                    <td className="py-3 text-navy-600">{r.count}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={r.monthAverage} thin />
                        <b className="w-12 text-navy-900">{pct(r.monthAverage)}</b>
                      </div>
                    </td>
                    <td className="py-3 text-navy-700">{pct(r.attendance)}</td>
                    <td className="py-3 text-navy-700">{pct(r.worship)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
