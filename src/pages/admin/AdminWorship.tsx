import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandHeart, Search } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Avatar from '@/components/ui/Avatar';
import { useData } from '@/context/DataContext';
import { dailyWorshipScore } from '@/utils/worship';
import { TODAY } from '@/utils/today';
import { formatDate, formatMonthKey, pct } from '@/utils/format';

export default function AdminWorship() {
  const { students, dailyWorship } = useData();
  const [query, setQuery] = useState('');
  const month = TODAY.slice(0, 7);

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return students
      .filter((student) => student.active && (!q || `${student.name} ${student.group}`.toLocaleLowerCase().includes(q)))
      .map((student) => {
        const records = dailyWorship.filter((record) => record.studentId === student.id && record.date.startsWith(month));
        const average = records.length
          ? Math.round(records.reduce((sum, record) => sum + dailyWorshipScore(record), 0) / records.length)
          : null;
        const latest = records.reduce<string | undefined>((date, record) => (!date || record.date > date ? record.date : date), undefined);
        return { student, records, average, latest };
      })
      .sort((a, b) => a.student.name.localeCompare(b.student.name, 'ar'));
  }, [students, dailyWorship, month, query]);

  const recordedDays = rows.reduce((sum, row) => sum + row.records.length, 0);
  const studentsWithRecords = rows.filter((row) => row.records.length > 0).length;
  const average = rows.reduce((sum, row) => sum + (row.average ?? 0), 0) / (studentsWithRecords || 1);

  return (
    <div>
      <PageHeader
        title="العبادات"
        subtitle={`متابعة جداول العبادات المسجّلة للطلاب خلال ${formatMonthKey(month)}.`}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <section className="card flex items-center gap-3 p-4">
          <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><HandHeart className="h-5 w-5" /></span>
          <div><p className="text-[12px] text-navy-400">طلاب لديهم تسجيل هذا الشهر</p><p className="text-xl font-extrabold text-navy-900">{studentsWithRecords} / {rows.length}</p></div>
        </section>
        <section className="card p-4"><p className="text-[12px] text-navy-400">أيام العبادات المسجّلة</p><p className="mt-1 text-xl font-extrabold text-navy-900">{recordedDays}</p></section>
        <section className="card p-4"><p className="text-[12px] text-navy-400">متوسط العلامة للطلاب المسجّلين</p><p className="mt-1 text-xl font-extrabold text-navy-900">{studentsWithRecords ? pct(Math.round(average)) : '—'}</p></section>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100/70 p-4">
          <h2 className="section-title">جدول العبادات حسب الطالب</h2>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
            <input className="input input-sm w-full pr-9" aria-label="ابحث عن طالب أو مجموعة" placeholder="ابحث عن طالب أو مجموعة" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
        </div>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead className="bg-navy-50/60 text-right text-[12px] text-navy-500">
              <tr>
                <th className="px-5 py-3 font-medium">الطالب</th>
                <th className="px-3 py-3 font-medium">المجموعة</th>
                <th className="px-3 py-3 font-medium">أيام مسجّلة</th>
                <th className="px-3 py-3 font-medium">متوسط الشهر</th>
                <th className="px-3 py-3 font-medium">آخر تسجيل</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, records, average: studentAverage, latest }) => (
                <tr key={student.id} className="border-t border-navy-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5"><Avatar name={student.name} src={student.photo} size={32} /><span className="font-bold text-navy-800">{student.name}</span></div>
                  </td>
                  <td className="px-3 py-3 text-navy-500">{student.group}</td>
                  <td className="px-3 py-3 text-navy-700">{records.length}</td>
                  <td className="px-3 py-3 font-bold text-navy-800">{studentAverage === null ? '—' : pct(studentAverage)}</td>
                  <td className="px-3 py-3 text-navy-500">{latest ? formatDate(latest) : 'لا يوجد'}</td>
                  <td className="px-5 py-3 text-left">
                    <Link className="btn-soft px-3 py-1.5 text-[12px]" to={`/admin/students/${student.id}?tab=worship`}>فتح السجل</Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-navy-400">لا يوجد طلاب مطابقون للبحث.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
