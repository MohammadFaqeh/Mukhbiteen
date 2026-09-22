import { useMemo } from 'react';
import { useParentStudent } from '@/hooks/useParentStudent';
import PageHeader from '@/components/shared/PageHeader';
import ReportsPanel from '@/components/shared/ReportsPanel';
import { availableMonths, studentStats } from '@/utils/stats';
import { formatMonthKey, pct } from '@/utils/format';
import { ProgressBar } from '@/components/ui/Progress';

export default function ParentReports() {
  const { student, sessions } = useParentStudent();
  const months = useMemo(() => availableMonths(sessions), [sessions]);
  if (!student) return null;
  const rows = months.map((m) => {
    const monthSessions = sessions.filter((s) => s.date.startsWith(m));
    const st = studentStats(monthSessions, student.id, m);
    return { m, ...st, count: monthSessions.length };
  });
  return (
    <div>
      <PageHeader title="التقارير" subtitle="ملخص أداء الطالب حسب الأشهر" />
      <div className="grid gap-4 lg:grid-cols-12">
        <ReportsPanel studentName={student.name} className="lg:col-span-4" />
        <section className="card p-5 lg:col-span-8">
          <h3 className="section-title mb-4">ملخص الأشهر</h3>
          <div className="scrollbar-thin overflow-x-auto">
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
