import { useMemo, useState } from 'react';
import { Download, FileBarChart2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/shared/PageHeader';
import Select from '@/components/ui/Select';
import Avatar from '@/components/ui/Avatar';
import { CommitmentBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { availableMonths, studentStats } from '@/utils/stats';
import { formatMonthKey, pct } from '@/utils/format';

export default function AdminReports() {
  const { students, sessions } = useData();
  const toast = useToast();
  const months = useMemo(() => availableMonths(sessions), [sessions]);
  const [month, setMonth] = useState(months[0] ?? '');
  const rows = useMemo(
    () =>
      students
        .map((s) => {
          const inMonth = sessions.filter((x) => x.studentId === s.id && x.date.startsWith(month));
          return { s, all: studentStats(sessions, s.id), m: studentStats(inMonth, s.id, month) };
        })
        .sort((a, b) => b.m.monthAverage - a.m.monthAverage),
    [students, sessions, month],
  );

  return (
    <div>
      <PageHeader
        title="التقارير"
        subtitle={`تقرير المجموعة – ${formatMonthKey(month)}`}
        actions={
          <>
            <Select className="w-44" ariaLabel="الشهر" value={month} onChange={setMonth} options={months.map((m) => ({ value: m, label: formatMonthKey(m) }))} />
            <button className="btn-ghost" onClick={() => toast('تم تجهيز تقرير الفصل (تجريبي)')}>
              <FileBarChart2 className="h-4 w-4" /> تقرير الفصل
            </button>
            <button className="btn-primary" onClick={() => toast('بدأ تحميل التقرير (ملف تجريبي)')}>
              <Download className="h-4 w-4" /> تحميل التقرير
            </button>
          </>
        }
      />
      <section className="card overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead className="bg-navy-50/60 text-right text-[12px] text-navy-500">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">الطالب</th>
                <th className="w-44 px-3 py-3 font-medium">معدل الشهر</th>
                <th className="px-3 py-3 font-medium">المعدل التراكمي</th>
                <th className="px-3 py-3 font-medium">الحضور</th>
                <th className="px-3 py-3 font-medium">العبادات</th>
                <th className="px-3 py-3 font-medium">الالتزام</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, all, m }, i) => (
                <tr key={s.id} className="border-t border-navy-50">
                  <td className="px-5 py-2.5 font-bold text-navy-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} src={s.photo} size={32} />
                      <span className="font-bold text-navy-900">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={m.monthAverage} thin tone="burgundy" />
                      <b className="w-12">{pct(m.monthAverage)}</b>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-navy-700">{pct(all.cumulative)}</td>
                  <td className="px-3 py-2.5 text-navy-700">{pct(m.attendance)}</td>
                  <td className="px-3 py-2.5 text-navy-700">{pct(m.worship)}</td>
                  <td className="px-3 py-2.5">
                    <CommitmentBadge level={m.commitment} />
                  </td>
                  <td className="px-5 py-2.5 text-left">
                    <button className="btn-soft px-3 py-1.5 text-[12px]" onClick={() => toast(`تم تجهيز تقرير ${s.name} (تجريبي)`)}>
                      تقرير الطالب
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
