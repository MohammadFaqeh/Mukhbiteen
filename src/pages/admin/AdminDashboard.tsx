import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, GalleryHorizontalEnd, TrendingUp, UserCheck, UserPlus, Users, CalendarCheck } from 'lucide-react';
import { useData } from '@/context/DataContext';
import StatCard from '@/components/ui/StatCard';
import ScoreChart from '@/components/ui/ScoreChart';
import Avatar from '@/components/ui/Avatar';
import { AttendanceBadge } from '@/components/ui/Badge';
import AdminStudentCard from '@/components/admin/AdminStudentCard';
import StudentFormModal from '@/components/admin/StudentFormModal';
import type { Student } from '@/types';
import { TODAY } from '@/data/mockData';
import { attendanceRate, studentStats } from '@/utils/stats';
import { formatDate, pct, round1 } from '@/utils/format';

export default function AdminDashboard() {
  const { students, sessions } = useData();
  const [editing, setEditing] = useState<Student | null>(null);
  const [adding, setAdding] = useState(false);

  const data = useMemo(() => {
    const stats = students.map((s) => ({ s, st: studentStats(sessions, s.id) })).sort((a, b) => b.st.cumulative - a.st.cumulative);
    const groupAvg = round1(stats.reduce((a, b) => a + b.st.cumulative, 0) / (stats.length || 1));
    const latestDate = sessions[0]?.date ?? TODAY;
    const today = sessions.filter((x) => x.date === latestDate);
    const present = today.filter((x) => x.attendance === 'present' || x.attendance === 'late').length;
    const dates = [...new Set(sessions.map((x) => x.date))].sort().slice(-8);
    const trend = dates.map((d) => {
      const sc = sessions.filter((x) => x.date === d && typeof x.score === 'number').map((x) => x.score!);
      return { date: d, score: Math.round(sc.reduce((a, b) => a + b, 0) / (sc.length || 1)) };
    });
    return { stats, groupAvg, attendance: attendanceRate(sessions), latestDate, today, present, trend };
  }, [students, sessions]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Users} label="عدد الطلاب" value={String(students.length)} hint="طالبًا" tone="navy" />
        <StatCard icon={TrendingUp} label="متوسط المجموعة" value={pct(data.groupAvg)} progress={data.groupAvg} tone="burgundy" />
        <StatCard icon={CalendarCheck} label="نسبة الحضور" value={pct(data.attendance)} progress={data.attendance} tone="green" />
        <StatCard icon={UserCheck} label="حاضرون في آخر دوام" value={`${data.present}/${data.today.length || students.length}`} hint={formatDate(data.latestDate)} tone="gold" />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="card p-5 xl:col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="section-title">متوسط علامات المجموعة</h3>
            <span className="text-[12px] text-navy-400">آخر 8 أيام دوام</span>
          </div>
          <ScoreChart data={data.trend} height={180} />
        </section>

        <section className="card p-5 xl:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="section-title">حضور آخر دوام</h3>
            <Link to="/admin/attendance" className="text-[12px] font-bold text-burgundy-600 hover:underline">
              تسجيل الدوام
            </Link>
          </div>
          <ul className="scrollbar-thin max-h-[210px] space-y-1.5 overflow-y-auto pl-1">
            {data.today.map((r) => {
              const st = students.find((s) => s.id === r.studentId);
              if (!st) return null;
              return (
                <li key={r.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-navy-50/50">
                  <Avatar name={st.name} src={st.photo} size={30} />
                  <span className="flex-1 truncate text-[13px] font-medium text-navy-800">{st.name}</span>
                  <span className="w-8 text-left text-[13px] font-bold text-navy-700">{r.score ?? '—'}</span>
                  <AttendanceBadge status={r.attendance} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="grid gap-3 xl:col-span-3">
          {[
            { to: '/admin/attendance', icon: CalendarPlus, t: 'تسجيل دوام اليوم', d: 'إدخال حضور وعلامات الجميع', c: 'bg-navy-800 text-white' },
            { action: () => setAdding(true), icon: UserPlus, t: 'إضافة طالب', d: 'طالب جديد في المجموعة', c: 'bg-white text-navy-800' },
            { to: '/admin/activities', icon: GalleryHorizontalEnd, t: 'الصور والأنشطة', d: 'إدارة صور السلايد شو', c: 'bg-white text-navy-800' },
          ].map((q) => {
            const inner = (
              <>
                <q.icon className="h-5 w-5 shrink-0" />
                <span className="text-right">
                  <span className="block text-[14px] font-bold">{q.t}</span>
                  <span className="block text-[12px] opacity-70">{q.d}</span>
                </span>
              </>
            );
            const cls = `flex items-center gap-3 rounded-2xl border border-navy-100/70 p-4 shadow-soft transition hover:-translate-y-0.5 ${q.c}`;
            return q.to ? (
              <Link key={q.t} to={q.to} className={cls}>
                {inner}
              </Link>
            ) : (
              <button key={q.t} onClick={q.action} className={cls}>
                {inner}
              </button>
            );
          })}
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold text-navy-900">الطلاب</h2>
          <Link to="/admin/students" className="text-[13px] font-bold text-burgundy-600 hover:underline">
            إدارة الطلاب
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.stats.map(({ s, st }, i) => (
            <AdminStudentCard key={s.id} student={s} stats={st} rank={i + 1} onEdit={() => setEditing(s)} />
          ))}
        </div>
      </section>

      <StudentFormModal open={!!editing || adding} student={editing} onClose={() => { setEditing(null); setAdding(false); }} />
    </div>
  );
}
