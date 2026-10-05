import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Calculator, Check, CheckCheck, ExternalLink, ListPlus, Loader2, MessageSquarePlus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { normalizeArabic } from '@/utils/recitationLog';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import PageHeader from '@/components/shared/PageHeader';
import Avatar from '@/components/ui/Avatar';
import Select from '@/components/ui/Select';
import { AttendancePicker, CommitmentSelect, NumberInput } from '@/components/admin/fields';
import type { AttendanceStatus, CommitmentLevel, DailyWorship, SessionRecord, Student } from '@/types';
import { TODAY } from '@/utils/today';
import { suggestScore } from '@/utils/stats';
import { weekDates, weekStartOf, weekWorshipScore } from '@/utils/worship';
import { completionPercent, isAssigned, parsePageRanges } from '@/utils/quran';
import { cx, formatLongDate, pct } from '@/utils/format';

interface Row {
  studentId: string;
  attendance: AttendanceStatus;
  commitment: CommitmentLevel;
  score?: number;
  hasMem: boolean;
  memGrade?: number;
  memRequiredPages: number;
  memCompletedPages: number;
  memRecited?: string;
  hasRev: boolean;
  revGrade?: number;
  revRequiredPages: number;
  revCompletedPages: number;
  revRevised?: string;
  notes: string;
  showNotes: boolean;
  showDetails?: boolean; // سطر وصف ما سُمّع حفظًا ومراجعةً
}

/**
 * الحفظ/المراجعة المطلوبة فعلًا بالصف — المفعّل بمطلوب 0 ومسمّع 0 وبلا وصف ولا مطلوب مكتوب يُعتبر غير مطلوب.
 * required = المطلوب المكتوب للطالب (المطلوب القادم المحفوظ) — يخلّي الجزء مطلوبًا حتى لو ما سمّع شيء.
 */
function partsOf(x: Row, req?: { memorization?: string; revision?: string }) {
  const mem = { required: req?.memorization ?? '', recited: x.memRecited ?? '', requiredPages: x.memRequiredPages, completedPages: x.memCompletedPages, completion: completionPercent(x.memRequiredPages, x.memCompletedPages), grade: x.memGrade ?? 0 };
  const rev = { required: req?.revision ?? '', revised: x.revRevised ?? '', requiredPages: x.revRequiredPages, completedPages: x.revCompletedPages, completion: completionPercent(x.revRequiredPages, x.revCompletedPages), grade: x.revGrade ?? 0 };
  return { mem: x.hasMem && isAssigned(mem) ? mem : null, rev: x.hasRev && isAssigned(rev) ? rev : null };
}

function Cell({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('min-w-0', className)}>
      <span className="mb-1 block text-[11px] text-navy-400 2xl:hidden">{label}</span>
      {children}
    </div>
  );
}

const DRAFT_KEY = 'mukhbiteen.draft.attendance';

/**
 * مسودة تعديلات غير محفوظة فقط (dirty). savedKey = بصمة المحفوظ لهذا اليوم لحظة بدء التعديل،
 * لمعرفة إذا انحفظت بيانات أحدث بعدها (مثلًا من ملف Excel).
 */
interface Draft {
  date: string;
  rows: Row[];
  dirty: true;
  savedKey: string;
}
function loadDraft(): Draft | null {
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    return d?.dirty ? d : null; // مسودات قديمة بلا تعديل فعلي تُتجاهل — المحفوظ هو المرجع
  } catch {
    return null;
  }
}
function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* التخزين غير متاح */
  }
}

/** صفوف الصفحة من المحفوظ بالموقع لهذا التاريخ (أو قيم افتراضية ليوم جديد) */
function rowsFromSaved(students: Student[], sessions: SessionRecord[], date: string): Row[] {
  return students.map((st) => {
    const ex = sessions.find((s) => s.studentId === st.id && s.date === date);
    return {
      studentId: st.id,
      attendance: ex?.attendance ?? 'present',
      commitment: ex?.commitment ?? 'excellent',
      score: ex?.score,
      hasMem: ex ? !!ex.memorization : true,
      memGrade: ex?.memorization?.grade ?? 90,
      memRequiredPages: ex?.memorization?.requiredPages ?? 0,
      memCompletedPages: ex?.memorization?.completedPages ?? 0,
      memRecited: ex?.memorization?.recited,
      hasRev: ex ? !!ex.revision : true,
      revGrade: ex?.revision?.grade ?? 90,
      revRequiredPages: ex?.revision?.requiredPages ?? 0,
      revCompletedPages: ex?.revision?.completedPages ?? 0,
      revRevised: ex?.revision?.revised,
      notes: ex?.notes ?? '',
      showNotes: !!ex?.notes,
      showDetails: !!(ex?.memorization?.recited || ex?.revision?.revised),
    };
  });
}

export default function AdminAttendance() {
  const { students, sessions, upsertSessions, deleteSessions, getRequirement, dailyWorship } = useData();
  const toast = useToast();
  const confirmDelete = useConfirmDelete();
  const draft = useRef(loadDraft()).current; // يُقرأ مرة واحدة فقط عند فتح الصفحة
  const [date, setDate] = useState(draft?.date ?? TODAY);
  const savedForDate = useMemo(() => sessions.filter((s) => s.date === date), [sessions, date]);
  const savedKey = useMemo(() => JSON.stringify([...savedForDate].sort((x, y) => x.id.localeCompare(y.id))), [savedForDate]);
  const savedDates = useMemo(() => [...new Set(sessions.map((s) => s.date))].sort().reverse(), [sessions]);
  const [rows, setRows] = useState<Row[]>(() => draft?.rows ?? rowsFromSaved(students, sessions, date));
  const [dirty, setDirty] = useState(!!draft); // في تعديلات بالصفحة ما انحفظت
  const [loadedKey, setLoadedKey] = useState(draft?.savedKey ?? savedKey); // بصمة المحفوظ اللي الصفوف مبنية عليه
  const [q, setQ] = useState(''); // فلترة العرض فقط — الحفظ يشمل كل الطلاب

  /** علامة أسبوع العبادات (سبت-خميس) المرتبط بهذا التاريخ، لكل طالب */
  const weekWorshipByStudent = useMemo(() => {
    const ws = weekStartOf(date);
    const dates = weekDates(ws).filter((d) => d <= date);
    const map = new Map<string, number>();
    students.forEach((st) => {
      const days = dates.map((d) => dailyWorship.find((w) => w.id === `${st.id}-${d}`)).filter((x): x is DailyWorship => !!x);
      map.set(st.id, weekWorshipScore(days));
    });
    return map;
  }, [students, dailyWorship, date]);

  /** يعرض المحفوظ بالموقع لهذا اليوم ويتجاهل أي تعديل غير محفوظ */
  const showSaved = () => {
    setRows(rowsFromSaved(students, sessions, date));
    setLoadedKey(savedKey);
    setDirty(false);
    clearDraft();
  };

  // تزامن مع المحفوظ: بدون تعديلات ← الصفحة تعرض المحفوظ دائمًا وتتحدّث لحالها (مثلًا بعد رفع ملف Excel).
  // مع تعديلات غير محفوظة ← ما نمسحها، بس ننبّه إذا انحفظت بيانات أحدث لنفس اليوم.
  const newerSaved = dirty && savedKey !== loadedKey;
  useEffect(() => {
    if (!dirty) showSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, savedKey, students.length, dirty]);

  // المسودة تُحفظ فقط عند وجود تعديلات فعلية، حتى تنجو من إعادة التحميل أو التنقل بين الصفحات
  useEffect(() => {
    if (!dirty) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ date, rows, dirty: true, savedKey: loadedKey } satisfies Draft));
    } catch {
      /* التخزين غير متاح */
    }
  }, [date, rows, dirty, loadedKey]);

  const edit = (fn: (r: Row[]) => Row[]) => {
    setDirty(true);
    setRows(fn);
  };
  const changeDate = (d: string) => {
    if (!d || d === date) return;
    if (dirty && !confirm('لديك تعديلات غير محفوظة على هذا اليوم. هل تريد تجاهلها والانتقال إلى تاريخ آخر؟')) return;
    setDirty(false);
    clearDraft();
    setDate(d);
  };

  const patch = (id: string, p: Partial<Row>) => edit((r) => r.map((x) => (x.studentId === id ? { ...x, ...p } : x)));

  /** توحيد كتابة أرقام الصفحات (415 - 416 ← 415-416)، وإذا المنجز فاضي يتعبّى بعدد الصفحات */
  const fixPages = (r: Row, part: 'mem' | 'rev') => {
    const parsed = parsePageRanges((part === 'mem' ? r.memRecited : r.revRevised) ?? '');
    if (!parsed) return;
    if (part === 'mem') patch(r.studentId, { memRecited: parsed.text, ...(r.memCompletedPages ? {} : { memCompletedPages: parsed.pages }) });
    else patch(r.studentId, { revRevised: parsed.text, ...(r.revCompletedPages ? {} : { revCompletedPages: parsed.pages }) });
  };

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, excused: 0 };
    rows.forEach((r) => c[r.attendance]++);
    return c;
  }, [rows]);

  const calcAll = () =>
    edit((r) =>
      r.map((x) => ({
        ...x,
        score:
          x.attendance === 'present' || x.attendance === 'late'
            ? suggestScore({ attendance: x.attendance, ...partsOf(x, getRequirement(x.studentId)), weekWorship: weekWorshipByStudent.get(x.studentId), commitment: x.commitment })
            : undefined,
      })),
    );

  const [saving, setSaving] = useState(false);
  const saveAll = async () => {
    const exists = new Set(students.map((s) => s.id));
    const recs: SessionRecord[] = rows.filter((x) => exists.has(x.studentId)).map((x) => {
      const id = `${x.studentId}-${date}`;
      const attended = x.attendance === 'present' || x.attendance === 'late';
      const prev = sessions.find((s) => s.id === id);
      const req = getRequirement(x.studentId);
      if (!attended) return { id, studentId: x.studentId, date, attendance: x.attendance, notes: x.notes || undefined };
      const { mem, rev } = partsOf(x, req);
      return {
        id,
        studentId: x.studentId,
        date,
        attendance: x.attendance,
        commitment: x.commitment,
        score: x.score ?? suggestScore({ attendance: x.attendance, mem, rev, weekWorship: weekWorshipByStudent.get(x.studentId), commitment: x.commitment }),
        memorization: mem && { ...mem, required: prev?.memorization?.required ?? req?.memorization ?? '', recited: mem.recited || prev?.memorization?.recited || '' },
        revision: rev && { ...rev, required: prev?.revision?.required ?? req?.revision ?? '', revised: rev.revised || prev?.revision?.revised || '' },
        notes: x.notes || undefined,
      };
    });
    setSaving(true);
    try {
      await upsertSessions(recs);
      // بعد الحفظ: الصفحة ترجع تعرض المحفوظ (يتحدّث تلقائيًا مع savedKey)
      setDirty(false);
      clearDraft();
      toast(`تم حفظ دوام ${recs.length} طالبًا`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'حدث خطأ أثناء الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="تسجيل دوام اليوم"
        subtitle={formatLongDate(date)}
        actions={
          <>
            <input type="date" className="input w-44" value={date} onChange={(e) => changeDate(e.target.value)} aria-label="تاريخ الدوام" />
            {savedDates.length > 0 && (
              <Select
                className="w-48"
                ariaLabel="الأيام المحفوظة"
                value={savedDates.includes(date) ? date : ''}
                onChange={changeDate}
                options={[{ value: '', label: `الأيام المحفوظة (${savedDates.length})` }, ...savedDates.map((d) => ({ value: d, label: formatLongDate(d) }))]}
              />
            )}
            <button className="btn-ghost" onClick={() => edit((r) => r.map((x) => ({ ...x, attendance: 'present' })))}>
              <CheckCheck className="h-4 w-4" /> الجميع حاضر
            </button>
            <button className="btn-soft" onClick={calcAll}>
              <Calculator className="h-4 w-4" /> احتساب العلامات
            </button>
            {savedForDate.length > 0 && (
              <button
                className="btn-ghost border-burgundy-200 text-burgundy-600 hover:bg-burgundy-50"
                onClick={() => confirmDelete(`حذف دوام ${formatLongDate(date)} المحفوظ لكل الطلاب (${savedForDate.length} سجل)؟`, () => deleteSessions(savedForDate.map((s) => s.id)), 'تم حذف دوام هذا اليوم')}
              >
                <Trash2 className="h-4 w-4" /> حذف دوام اليوم
              </button>
            )}
          </>
        }
      />

      {newerSaved && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> حُفظت بيانات أحدث لهذا اليوم (من ملف Excel مثلًا) بعد أن بدأت التعديل هنا.
          </span>
          <div className="flex gap-2">
            <button className="btn-accent px-3 py-1.5 text-[12px]" onClick={showSaved}>
              عرض المحفوظ (تجاهل تعديلاتي)
            </button>
            <button className="btn-ghost px-3 py-1.5 text-[12px]" onClick={() => setLoadedKey(savedKey)}>
              إكمال تعديلاتي
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
        {dirty ? (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800">
            تعديلات غير محفوظة
            <button className="underline decoration-dotted" onClick={() => confirm('هل تريد تجاهل تعديلاتك والعودة إلى البيانات المحفوظة؟') && showSaved()}>
              تراجع
            </button>
          </span>
        ) : savedForDate.length > 0 ? (
          <span className="rounded-full bg-navy-800 px-3 py-1 font-bold text-white">محفوظ ✓ ({savedForDate.length} طالب)</span>
        ) : (
          <span className="rounded-full border border-dashed border-navy-200 px-3 py-1 text-navy-500">يوم جديد — لم يُحفظ بعد</span>
        )}
        <div className="relative ml-auto w-full max-w-xs sm:w-64">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <input className="input input-sm w-full pr-9" placeholder="ابحث عن طالب في هذه الصفحة…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث عن طالب" />
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">حاضر {counts.present}</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">متأخر {counts.late}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">غائب بعذر {counts.excused}</span>
        <span className="rounded-full bg-burgundy-50 px-3 py-1 text-burgundy-700">غائب {counts.absent}</span>
      </div>

      <section className="card overflow-hidden">
        {/* رأس الأعمدة للشاشات العريضة */}
        <div className="hidden grid-cols-[200px_240px_110px_76px_210px_210px_100px_76px] items-center gap-3 border-b border-navy-50 bg-navy-50/60 px-4 py-2.5 text-[12px] font-medium text-navy-500 2xl:grid">
          <span>الطالب</span>
          <span>الحضور</span>
          <span>الالتزام</span>
          <span>العلامة</span>
          <span>الحفظ (علامة / مطلوب / منجز)</span>
          <span>المراجعة (علامة / مطلوب / منجز)</span>
          <span>علامة أسبوع العبادات</span>
          <span />
        </div>
        <ul className="divide-y divide-navy-50">
          {rows.map((r) => {
            const st = students.find((s) => s.id === r.studentId);
            if (!st) return null; // طالب انحذف وهو لسا بمسودة محفوظة
            if (q.trim() && !normalizeArabic(st.name).includes(normalizeArabic(q))) return null;
            const attended = r.attendance === 'present' || r.attendance === 'late';
            return (
              <li key={r.studentId} className={cx('px-4 py-3 transition', !attended && 'bg-paper/60')}>
                <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 2xl:grid-cols-[200px_240px_110px_76px_210px_210px_100px_76px] 2xl:items-center">
                  <div className="col-span-2 flex items-center gap-3 md:col-span-4 2xl:col-span-1">
                    <Avatar name={st.name} src={st.photo} size={40} />
                    <span className="truncate text-[14px] font-bold text-navy-900">{st.name}</span>
                    <Link
                      to={`/admin/students/${st.id}?tab=sessions${savedForDate.some((s) => s.studentId === st.id) ? `&date=${date}` : ''}`}
                      className="shrink-0 rounded-lg p-1 text-navy-300 hover:bg-navy-50 hover:text-navy-700"
                      title="فتح سجل دوام الطالب (يفتح تعديل هذا اليوم إذا كان محفوظًا)"
                      aria-label={`فتح سجل ${st.name}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                  <Cell label="الحضور" className="col-span-2 md:col-span-2 2xl:col-span-1">
                    <AttendancePicker size="sm" value={r.attendance} onChange={(v) => patch(r.studentId, { attendance: v })} />
                  </Cell>
                  <Cell label="الالتزام">
                    <div className={cx(!attended && 'pointer-events-none opacity-40')}>
                      <CommitmentSelect small value={r.commitment} onChange={(v) => patch(r.studentId, { commitment: v })} />
                    </div>
                  </Cell>
                  <Cell label="علامة اليوم">
                    <div className={cx(!attended && 'pointer-events-none opacity-40')}>
                      <NumberInput small value={attended ? r.score : undefined} onChange={(v) => patch(r.studentId, { score: v })} placeholder="تلقائي" ariaLabel="علامة اليوم" />
                    </div>
                  </Cell>
                  <Cell label="الحفظ (علامة / مطلوب / منجز)" className={cx(!attended && 'pointer-events-none opacity-40')}>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => patch(r.studentId, { hasMem: !r.hasMem })} className={cx('h-7 w-7 shrink-0 rounded-lg border text-[11px]', r.hasMem ? 'border-navy-700 bg-navy-700 text-white' : 'border-navy-100 text-navy-300')} aria-label="يوجد حفظ">
                        <Check className="mx-auto h-3.5 w-3.5" />
                      </button>
                      <NumberInput small value={r.hasMem ? r.memGrade : undefined} onChange={(v) => patch(r.studentId, { memGrade: v })} ariaLabel="علامة الحفظ" placeholder="علامة" />
                      <NumberInput small max={999} value={r.hasMem ? r.memRequiredPages : undefined} onChange={(v) => patch(r.studentId, { memRequiredPages: v ?? 0 })} ariaLabel="صفحات الحفظ المطلوبة" placeholder="مطلوب" />
                      <NumberInput small max={999} value={r.hasMem ? r.memCompletedPages : undefined} onChange={(v) => patch(r.studentId, { memCompletedPages: v ?? 0 })} ariaLabel="صفحات الحفظ المنجزة" placeholder="منجز" />
                      {r.hasMem && <span className="w-9 shrink-0 text-[11px] font-bold text-navy-500">{pct(completionPercent(r.memRequiredPages, r.memCompletedPages), 0)}</span>}
                    </div>
                  </Cell>
                  <Cell label="المراجعة (علامة / مطلوب / منجز)" className={cx(!attended && 'pointer-events-none opacity-40')}>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => patch(r.studentId, { hasRev: !r.hasRev })} className={cx('h-7 w-7 shrink-0 rounded-lg border', r.hasRev ? 'border-burgundy-600 bg-burgundy-600 text-white' : 'border-navy-100 text-navy-300')} aria-label="يوجد مراجعة">
                        <Check className="mx-auto h-3.5 w-3.5" />
                      </button>
                      <NumberInput small value={r.hasRev ? r.revGrade : undefined} onChange={(v) => patch(r.studentId, { revGrade: v })} ariaLabel="علامة المراجعة" placeholder="علامة" />
                      <NumberInput small max={999} value={r.hasRev ? r.revRequiredPages : undefined} onChange={(v) => patch(r.studentId, { revRequiredPages: v ?? 0 })} ariaLabel="صفحات المراجعة المطلوبة" placeholder="مطلوب" />
                      <NumberInput small max={999} value={r.hasRev ? r.revCompletedPages : undefined} onChange={(v) => patch(r.studentId, { revCompletedPages: v ?? 0 })} ariaLabel="صفحات المراجعة المنجزة" placeholder="منجز" />
                      {r.hasRev && <span className="w-9 shrink-0 text-[11px] font-bold text-navy-500">{pct(completionPercent(r.revRequiredPages, r.revCompletedPages), 0)}</span>}
                    </div>
                  </Cell>
                  <Cell label="علامة أسبوع العبادات" className={cx(!attended && 'pointer-events-none opacity-40')}>
                    <span className="text-[13px] font-bold text-navy-700">{Math.round(weekWorshipByStudent.get(r.studentId) ?? 0)}%</span>
                  </Cell>
                  <div className="flex justify-end gap-0.5">
                    <button
                      onClick={() => patch(r.studentId, { showDetails: !r.showDetails })}
                      disabled={!attended}
                      className={cx('rounded-lg p-1.5 transition disabled:opacity-30', r.memRecited || r.revRevised ? 'text-navy-700' : 'text-navy-300 hover:text-navy-600')}
                      aria-label="وصف الحفظ والمراجعة"
                      title="وصف ما سُمّع حفظًا ومراجعةً"
                    >
                      <ListPlus className="h-5 w-5" />
                    </button>
                    <button onClick={() => patch(r.studentId, { showNotes: !r.showNotes })} className={cx('rounded-lg p-1.5 transition', r.notes ? 'text-burgundy-600' : 'text-navy-300 hover:text-navy-600')} aria-label="ملاحظات">
                      <MessageSquarePlus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {r.showDetails && attended && (
                  <div className="mt-2 grid animate-fade-in gap-2 md:grid-cols-2">
                    {(
                      [
                        { on: r.hasMem, icon: BookOpen, tone: 'bg-navy-700', label: 'الحفظ', req: getRequirement(r.studentId)?.memorization, value: r.memRecited, set: (v: string) => patch(r.studentId, { memRecited: v }), fix: () => fixPages(r, 'mem') },
                        { on: r.hasRev, icon: RotateCcw, tone: 'bg-burgundy-600', label: 'المراجعة', req: getRequirement(r.studentId)?.revision, value: r.revRevised, set: (v: string) => patch(r.studentId, { revRevised: v }), fix: () => fixPages(r, 'rev') },
                      ] as const
                    ).map(({ on, icon: Icon, tone, label, req, value, set, fix }) => (
                      <div key={label} className={cx('flex items-center gap-2', !on && 'pointer-events-none opacity-40')}>
                        <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white', tone)} title={label}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <input
                          className="input input-sm"
                          placeholder={on ? `صفحات ${label} المسمّعة (مثال: 415-416)` : `لا يوجد ${label}`}
                          value={on ? value ?? '' : ''}
                          onChange={(e) => set(e.target.value)}
                          onBlur={fix}
                          inputMode="numeric"
                          aria-label={`وصف ${label} المسمّع`}
                        />
                        {on && req && <span className="hidden max-w-[40%] shrink-0 truncate text-[11px] text-navy-400 lg:inline">المطلوب: {req}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {r.showNotes && (
                  <input className="input input-sm mt-2 animate-fade-in" placeholder={`ملاحظة عن ${st.name}`} value={r.notes} onChange={(e) => patch(r.studentId, { notes: e.target.value })} />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-3 text-[12px] text-navy-400">علامة أسبوع العبادات تُدخل من صفحة الطالب ← تبويب العبادات، وتدخل هنا تلقائيًا ضمن معادلة العلامة (20%). الحفظ أو المراجعة التي مطلوبها 0 ومسمّعها 0 تُعدّ غير مطلوبة، فلا تُحتسب على الطالب.</p>

      <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy-100 bg-white/95 px-5 py-3 shadow-lift backdrop-blur">
        <span className="text-[13px] text-navy-500">
          {rows.length} طالبًا – حاضر {counts.present + counts.late} من {rows.length}
        </span>
        <button onClick={saveAll} className="btn-accent px-10 py-3 text-[15px]" disabled={saving}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} حفظ الجميع
        </button>
      </div>

    </div>
  );
}
