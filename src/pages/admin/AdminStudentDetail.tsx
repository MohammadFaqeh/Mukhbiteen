import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarCheck, CalendarPlus, HandHeart, Loader2, PencilLine, RotateCcw, Save, Trash2, TrendingUp, Trophy } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import type { DailyWorship, SessionRecord } from '@/types';
import { ArchPortrait } from '@/components/parent/StudentHero';
import StatCard from '@/components/ui/StatCard';
import TrendCard from '@/components/parent/TrendCard';
import { AttendanceBadge, CommitmentBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import SessionForm from '@/components/admin/SessionForm';
import NextRequirementForm from '@/components/admin/NextRequirementForm';
import StudentFormModal from '@/components/admin/StudentFormModal';
import WorshipWeekGrid from '@/components/shared/WorshipWeekGrid';
import SessionDetail from '@/components/shared/SessionDetail';
import ReportsPanel from '@/components/shared/ReportsPanel';
import SessionTimeline from '@/components/parent/SessionTimeline';
import { studentSessions, studentStats } from '@/utils/stats';
import { dailyWorshipScore, emptyDailyWorship, weekDates, weekStartOf, weekWorshipScore } from '@/utils/worship';
import { TODAY } from '@/utils/today';
import { cx, formatDate, formatLongDate, formatMonthKey, pct } from '@/utils/format';

const TABS = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'sessions', label: 'الدوام' },
  { key: 'memorization', label: 'الحفظ' },
  { key: 'revision', label: 'المراجعة' },
  { key: 'worship', label: 'العبادات' },
  { key: 'next', label: 'المطلوب القادم' },
  { key: 'reports', label: 'التقارير' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function AdminStudentDetail() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabKey) || 'overview';
  const { getStudent, sessions: all, dailyWorship } = useData();
  const student = getStudent(id);
  const sessions = useMemo(() => studentSessions(all, id), [all, id]);
  const stats = useMemo(() => studentStats(all, dailyWorship, id), [all, dailyWorship, id]);
  const [editStudent, setEditStudent] = useState(false);

  if (!student)
    return (
      <div className="card-quiet p-10 text-center">
        <p className="text-navy-500">لم يتم العثور على الطالب.</p>
        <Link to="/admin/students" className="btn-primary mt-4">
          العودة لإدارة الطلاب
        </Link>
      </div>
    );

  return (
    <div className="space-y-4">
      <Link to="/admin/students" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-navy-500 hover:text-navy-800">
        <ArrowRight className="h-4 w-4" /> إدارة الطلاب
      </Link>

      {/* رأس صفحة الطالب */}
      <section className="card flex flex-col gap-5 p-5 md:flex-row md:items-center">
        <ArchPortrait src={student.photo} name={student.name} className="mx-auto h-32 w-[104px] md:mx-0" />
        <div className="flex-1 text-center md:text-right">
          <h1 className="text-[24px] font-extrabold text-navy-900">{student.name}</h1>
          <p className="text-[13px] text-navy-500">
            {student.group} – ولي الأمر: {student.guardianName} – تاريخ الميلاد: {student.birthDate ? formatDate(student.birthDate) : '—'}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 md:justify-start">
            <CommitmentBadge level={stats.commitment} />
            {stats.lastSession && <AttendanceBadge status={stats.lastSession.attendance} />}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center md:w-[360px]">
          {[
            ['المعدل', pct(stats.cumulative)],
            ['الحضور', pct(stats.attendance)],
            ['آخر علامة', stats.lastScore ?? '—'],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-2xl bg-navy-50/70 px-2 py-3">
              <p className="text-[11px] text-navy-400">{k}</p>
              <p className="text-[20px] font-extrabold text-navy-900">{v}</p>
            </div>
          ))}
        </div>
        <button className="btn-ghost self-center" onClick={() => setEditStudent(true)}>
          <PencilLine className="h-4 w-4" /> تعديل البيانات
        </button>
      </section>

      {/* التبويبات */}
      <nav className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-navy-100/70 bg-white/80 p-1.5 shadow-soft">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
            className={cx('whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-bold transition', tab === t.key ? 'bg-navy-800 text-white' : 'text-navy-500 hover:bg-navy-50')}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div key={tab} className="animate-fade-in">
        {tab === 'overview' && <Overview sessions={sessions} stats={stats} name={student.name} />}
        {tab === 'sessions' && <SessionsTab studentId={id} sessions={sessions} name={student.name} />}
        {tab === 'memorization' && <QuranTab kind="mem" studentId={id} sessions={sessions} />}
        {tab === 'revision' && <QuranTab kind="rev" studentId={id} sessions={sessions} />}
        {tab === 'worship' && <WorshipTab studentId={id} />}
        {tab === 'next' && <NextRequirementForm studentId={id} />}
        {tab === 'reports' && <ReportsPanel studentName={student.name} dense />}
      </div>

      <StudentFormModal open={editStudent} student={student} onClose={() => setEditStudent(false)} />
    </div>
  );
}

/* ---------------- نظرة عامة ---------------- */
function Overview({ sessions, stats, name }: { sessions: SessionRecord[]; stats: ReturnType<typeof studentStats>; name: string }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={Trophy} label="المعدل التراكمي" value={pct(stats.cumulative)} progress={stats.cumulative} />
        <StatCard icon={TrendingUp} label="معدل الشهر" value={pct(stats.monthAverage)} progress={stats.monthAverage} tone="burgundy" />
        <StatCard icon={BookOpen} label="متوسط التسميع" value={pct(stats.memorization)} progress={stats.memorization} tone="gold" />
        <StatCard icon={HandHeart} label="العبادات" value={pct(stats.worship)} progress={stats.worship} tone="green" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <TrendCard stats={stats} />
        <section className="card p-5">
          <h3 className="section-title mb-3">آخر سجل</h3>
          {stats.lastAttended ? (
            <div className="space-y-2 text-[13px]">
              <p className="text-navy-400">{formatLongDate(stats.lastAttended.date)}</p>
              <p>
                <b className="text-navy-800">الحفظ:</b> {stats.lastAttended.memorization?.required ?? '—'} ({stats.lastAttended.memorization?.grade ?? '—'}/100)
              </p>
              <p>
                <b className="text-navy-800">المراجعة:</b> {stats.lastAttended.revision?.required ?? '—'} ({stats.lastAttended.revision?.grade ?? '—'}/100)
              </p>
              {stats.lastAttended.notes && <p className="rounded-xl bg-sand-50 p-3 text-navy-600">{stats.lastAttended.notes}</p>}
            </div>
          ) : (
            <p className="text-navy-400">لا يوجد سجل.</p>
          )}
        </section>
      </div>
      <SessionTimeline sessions={sessions} studentName={name} />
    </div>
  );
}

/* ---------------- الدوام ---------------- */
function SessionsTab({ studentId, sessions, name }: { studentId: string; sessions: SessionRecord[]; name: string }) {
  const { deleteSession } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState<SessionRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<SessionRecord | null>(null);

  return (
    <div className="space-y-4">
      {adding ? (
        <SessionForm studentId={studentId} onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className="card flex w-full items-center justify-center gap-2 border-dashed p-4 text-[14px] font-bold text-burgundy-600 hover:bg-white">
          <CalendarPlus className="h-5 w-5" /> إضافة دوام جديد
        </button>
      )}
      <section className="card overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead className="bg-navy-50/60 text-right text-[12px] text-navy-500">
              <tr>
                <th className="px-5 py-3 font-medium">التاريخ</th>
                <th className="px-3 py-3 font-medium">الحضور</th>
                <th className="px-3 py-3 font-medium">الالتزام</th>
                <th className="px-3 py-3 font-medium">العلامة</th>
                <th className="px-3 py-3 font-medium">الحفظ</th>
                <th className="px-3 py-3 font-medium">المراجعة</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-navy-50 hover:bg-navy-50/30">
                  <td className="px-5 py-2.5">
                    <button onClick={() => setView(s)} className="font-medium text-navy-800 hover:text-burgundy-600">
                      {formatLongDate(s.date)}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <AttendanceBadge status={s.attendance} />
                  </td>
                  <td className="px-3 py-2.5">{s.commitment ? <CommitmentBadge level={s.commitment} /> : '—'}</td>
                  <td className="px-3 py-2.5 font-bold text-navy-900">{s.score ?? '—'}</td>
                  <td className="px-3 py-2.5 text-navy-600">{s.memorization ? `${s.memorization.grade} (${s.memorization.completion}%)` : '—'}</td>
                  <td className="px-3 py-2.5 text-navy-600">{s.revision ? `${s.revision.grade} (${s.revision.completion}%)` : '—'}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(s)} className="rounded-lg p-1.5 text-navy-500 hover:bg-navy-50" aria-label="تعديل">
                        <PencilLine className="h-4 w-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('حذف هذا اليوم من سجل الطالب؟')) return;
                          try {
                            await deleteSession(s.id);
                            toast('تم حذف يوم الدوام');
                          } catch (e) {
                            toast(e instanceof Error ? e.message : 'حدث خطأ أثناء الحذف.');
                          }
                        }}
                        className="rounded-lg p-1.5 text-burgundy-500 hover:bg-burgundy-50"
                        aria-label="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Modal open={!!editing} onClose={() => setEditing(null)} size="xl" title="تعديل يوم الدوام" subtitle={name}>
        {editing && <SessionForm studentId={studentId} initial={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />}
      </Modal>
      <SessionDetail session={view} onClose={() => setView(null)} studentName={name} />
    </div>
  );
}

/* ---------------- الحفظ / المراجعة ---------------- */
function QuranTab({ kind, studentId, sessions }: { kind: 'mem' | 'rev'; studentId: string; sessions: SessionRecord[] }) {
  const [editing, setEditing] = useState<SessionRecord | null>(null);
  const rows = sessions.filter((s) => (kind === 'mem' ? s.memorization : s.revision));
  const avgGrade = rows.length ? rows.reduce((a, s) => a + (kind === 'mem' ? s.memorization!.grade : s.revision!.grade), 0) / rows.length : 0;
  const avgComp = rows.length ? rows.reduce((a, s) => a + (kind === 'mem' ? s.memorization!.completion : s.revision!.completion), 0) / rows.length : 0;
  const Icon = kind === 'mem' ? BookOpen : RotateCcw;
  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <div className="grid gap-3 sm:grid-cols-3 xl:col-span-3 xl:grid-cols-1">
        <StatCard icon={Icon} label={kind === 'mem' ? 'متوسط تقييم التسميع' : 'متوسط علامة المراجعة'} value={pct(Math.round(avgGrade * 10) / 10)} tone={kind === 'mem' ? 'navy' : 'burgundy'} />
        <StatCard icon={TrendingUp} label="متوسط الإنجاز" value={pct(Math.round(avgComp))} progress={avgComp} tone="gold" />
        <StatCard icon={CalendarCheck} label="عدد الأيام" value={String(rows.length)} tone="green" />
      </div>
      <section className="card overflow-hidden xl:col-span-9">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="bg-navy-50/60 text-right text-[12px] text-navy-500">
              <tr>
                <th className="px-5 py-3 font-medium">التاريخ</th>
                <th className="px-3 py-3 font-medium">{kind === 'mem' ? 'الحفظ المطلوب' : 'المراجعة المطلوبة'}</th>
                <th className="px-3 py-3 font-medium">{kind === 'mem' ? 'ما تم تسميعه' : 'ما تمت مراجعته'}</th>
                <th className="w-36 px-3 py-3 font-medium">الإنجاز</th>
                <th className="px-3 py-3 font-medium">العلامة</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const e = kind === 'mem' ? s.memorization! : s.revision!;
                return (
                  <tr key={s.id} className="border-t border-navy-50">
                    <td className="px-5 py-2.5 text-navy-500">{formatDate(s.date)}</td>
                    <td className="px-3 py-2.5 font-medium text-navy-800">{e.required}</td>
                    <td className="px-3 py-2.5 text-navy-600">{'recited' in e ? e.recited : e.revised}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={e.completion} thin tone={kind === 'mem' ? 'navy' : 'burgundy'} />
                        <span className="w-9 text-[12px]">{e.completion}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-navy-900">{e.grade}</td>
                    <td className="px-5 py-2.5 text-left">
                      <button onClick={() => setEditing(s)} className="rounded-lg p-1.5 text-navy-500 hover:bg-navy-50" aria-label="تعديل">
                        <PencilLine className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <Modal open={!!editing} onClose={() => setEditing(null)} size="xl" title="تعديل يوم الدوام">
        {editing && <SessionForm studentId={studentId} initial={editing} onSaved={() => setEditing(null)} onCancel={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}

/* ---------------- العبادات ---------------- */
function WorshipTab({ studentId }: { studentId: string }) {
  const { dailyWorship, upsertDailyWorship } = useData();
  const toast = useToast();
  const mine = useMemo(() => dailyWorship.filter((d) => d.studentId === studentId), [dailyWorship, studentId]);

  const weeks = useMemo(() => {
    const set = new Set(mine.map((d) => weekStartOf(d.date)));
    set.add(weekStartOf(TODAY));
    return [...set].sort().reverse();
  }, [mine]);
  const [weekStart, setWeekStart] = useState(weeks[0]);
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);
  const [draft, setDraft] = useState<Record<string, DailyWorship>>({});

  useEffect(() => {
    const map: Record<string, DailyWorship> = {};
    dates.forEach((date) => {
      map[date] = mine.find((d) => d.date === date) ?? emptyDailyWorship(studentId, date);
    });
    setDraft(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const patch = (date: string, p: Partial<DailyWorship>) => setDraft((d) => ({ ...d, [date]: { ...d[date], ...p } }));
  const score = weekWorshipScore(Object.values(draft));

  const months = useMemo(() => [...new Set(mine.map((d) => d.date.slice(0, 7)))].sort().reverse(), [mine]);

  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await upsertDailyWorship(Object.values(draft));
      toast('تم حفظ جدول العبادات لهذا الأسبوع');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'حدث خطأ أثناء الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h3 className="section-title">جدول العبادات الأسبوعي</h3>
          <p className="mt-0.5 text-[12px] text-navy-400">من السبت إلى الخميس — يوم الجمعة هو يوم الدوام بالمركز ويُقيَّم مباشرة هناك</p>
        </div>
        <div className="flex items-center gap-3">
          <Select className="w-56" ariaLabel="اختيار الأسبوع" value={weekStart} onChange={setWeekStart} options={weeks.map((w) => ({ value: w, label: `أسبوع ${formatDate(w)}` }))} />
          <div className="rounded-xl bg-navy-50/70 px-4 py-2 text-center">
            <p className="text-[11px] text-navy-400">علامة الأسبوع</p>
            <p className="text-[20px] font-extrabold text-navy-900">{pct(score)}</p>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <WorshipWeekGrid dates={dates} days={draft} editable onChange={patch} />
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-navy-50/60 px-4 py-3">
          <label className="flex items-center gap-2 text-[13px] font-medium text-navy-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-600"
              checked={Object.values(draft).some((d) => d.charity)}
              onChange={(e) => setDraft((d) => Object.fromEntries(Object.entries(d).map(([date, v]) => [date, { ...v, charity: e.target.checked }])))}
            />
            تصدّق الطالب مرة على الأقل خلال هذا الأسبوع
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button className="btn-accent px-8" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ جدول الأسبوع
        </button>
      </div>

      {months.length > 0 && (
        <section className="card p-5">
          <h3 className="section-title mb-4">معدل العبادات الشهري</h3>
          <div className="space-y-3">
            {months.map((m) => {
              const list = mine.filter((d) => d.date.startsWith(m));
              const v = Math.round(list.reduce((a, d) => a + dailyWorshipScore(d), 0) / (list.length || 1));
              return (
                <div key={m}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="text-navy-600">{formatMonthKey(m)}</span>
                    <b className="text-navy-900">{v}%</b>
                  </div>
                  <ProgressBar value={v} tone="green" />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
