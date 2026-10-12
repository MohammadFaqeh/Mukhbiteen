import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CalendarPlus, FileSpreadsheet, GalleryHorizontalEnd, ListChecks, RotateCcw, TrendingUp, UserCheck, UserPlus, Users, CalendarCheck } from 'lucide-react';
import { useData } from '@/context/DataContext';
import StatCard from '@/components/ui/StatCard';
import ScoreChart from '@/components/ui/ScoreChart';
import Avatar from '@/components/ui/Avatar';
import { AttendanceBadge } from '@/components/ui/Badge';
import StudentFormModal from '@/components/admin/StudentFormModal';
import { TODAY } from '@/utils/today';
import { ProgressBar } from '@/components/ui/Progress';
import { attendanceRate, groupMetrics } from '@/utils/stats';
import { formatDate, pct } from '@/utils/format';

export default function AdminDashboard() {
  const { students, sessions, assignments, assignmentsReady } = useData();
  const [adding, setAdding] = useState(false);

  const data = useMemo(() => {
    const metrics = groupMetrics(students, sessions, assignments, TODAY);
    const latestDate = sessions[0]?.date ?? TODAY;
    const today = sessions.filter((x) => x.date === latestDate);
    const present = today.filter((x) => x.attendance === 'present' || x.attendance === 'late').length;
    const dates = [...new Set(sessions.map((x) => x.date))].sort().slice(-8);
    const trend = dates.map((d) => {
      const sc = sessions.filter((x) => x.date === d && typeof x.score === 'number').map((x) => x.score!);
      return { date: d, score: Math.round(sc.reduce((a, b) => a + b, 0) / (sc.length || 1)) };
    });
    return { metrics, attendance: attendanceRate(sessions), latestDate, today, present, trend };
  }, [students, sessions, assignments]);
  const m = data.metrics;
  const counted = (n: number) => (n ? `من ${n} طالبًا` : 'لا توجد بيانات');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Users} label="عدد الطلاب" value={String(students.length)} hint="طالبًا" tone="navy" />
        <StatCard icon={TrendingUp} label="متوسط علامات الطلاب" value={pct(m.scores.value)} hint={counted(m.scores.students)} progress={m.scores.value} tone="burgundy" />
        <StatCard icon={CalendarCheck} label="نسبة الحضور" value={pct(data.attendance)} progress={data.attendance} tone="green" />
        <StatCard icon={UserCheck} label="حاضرون في آخر دوام" value={`${data.present}/${data.today.length || students.length}`} hint={formatDate(data.latestDate)} tone="gold" />
      </div>

      {/* مؤشرات الإنجاز: كل مقياس باسمه وطريقة حسابه بدل رقم عام مبهم */}
      <section className="card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h3 className="section-title">مؤشرات إنجاز المجموعة</h3>
          <span className="text-[12px] text-navy-400">كل مؤشر = مجموع نسب الطلاب ÷ عدد الطلاب الذين لهم بيانات فيه</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: BookOpen, label: 'متوسط إنجاز الحفظ', v: m.memorization, how: 'الصفحات المسمّعة المعتمدة ÷ المطلوبة بكل يوم دوام' },
            { icon: RotateCcw, label: 'متوسط إنجاز المراجعة', v: m.revision, how: 'صفحات المراجعة المعتمدة ÷ المطلوبة بكل يوم دوام' },
            { icon: ListChecks, label: 'متوسط الالتزام بالمطلوبات', v: m.assignments, how: assignmentsReady ? 'المطلوبات المكتملة ÷ المطلوبات التي حلّ موعدها' : 'يحتاج تحديث قاعدة البيانات' },
          ].map(({ icon: Icon, label, v, how }) => (
            <div key={label} className="rounded-2xl bg-navy-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-navy-600">{label}</span>
                <Icon className="h-4 w-4 text-navy-400" />
              </div>
              <p className="mt-1 text-[24px] font-extrabold text-navy-900">{v.students ? pct(v.value) : '—'}</p>
              <ProgressBar value={v.value} thin />
              <p className="mt-1.5 text-[11px] leading-5 text-navy-400">
                {how} · {counted(v.students)}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-navy-400">متوسط علامات الطلاب = مجموع المعدلات التراكمية لعلامة اليوم (من 100) ÷ عدد الطلاب الذين لهم علامات. الأيام التي لا يُحدَّد فيها عدد صفحات مطلوب لا تدخل بنسب الإنجاز.</p>
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="card p-5 xl:col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="section-title">متوسط علامات الطلاب بكل يوم دوام</h3>
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
            { to: '/admin/import', icon: FileSpreadsheet, t: 'استيراد سجل التسميع', d: 'رفع ملف التسميع الأسبوعي', c: 'bg-white text-navy-800' },
            { action: () => setAdding(true), icon: UserPlus, t: 'إضافة طالب', d: 'طالب جديد في المجموعة', c: 'bg-white text-navy-800' },
            { to: '/admin/activities', icon: GalleryHorizontalEnd, t: 'الصور والأنشطة', d: 'إدارة الصور المعروضة لأولياء الأمور', c: 'bg-white text-navy-800' },
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

      <StudentFormModal open={adding} student={null} onClose={() => setAdding(false)} />
    </div>
  );
}
