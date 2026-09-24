import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Check, CheckCheck, Loader2, MessageSquarePlus, Save } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/shared/PageHeader';
import Avatar from '@/components/ui/Avatar';
import { AttendancePicker, CommitmentSelect, NumberInput } from '@/components/admin/fields';
import type { AttendanceStatus, CommitmentLevel, DailyWorship, SessionRecord } from '@/types';
import { TODAY } from '@/utils/today';
import { suggestScore } from '@/utils/stats';
import { weekDates, weekStartOf, weekWorshipScore } from '@/utils/worship';
import { completionPercent } from '@/utils/quran';
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
  hasRev: boolean;
  revGrade?: number;
  revRequiredPages: number;
  revCompletedPages: number;
  notes: string;
  showNotes: boolean;
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

function loadDraft(): { date: string; rows: Row[] } | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function AdminAttendance() {
  const { students, sessions, upsertSessions, getRequirement, dailyWorship } = useData();
  const toast = useToast();
  const draft = useRef(loadDraft()).current; // يُقرأ مرة واحدة فقط عند فتح الصفحة
  const [date, setDate] = useState(draft?.date ?? TODAY);
  const [rows, setRows] = useState<Row[]>(draft?.rows ?? []);
  const skipNextPopulate = useRef(!!draft);

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

  // تعبئة الصفوف من السجلات الموجودة لهذا التاريخ (إن وُجدت).
  // معتمدة على [date] فقط بقصد: تغيّر مرجع students/sessions بالخلفية (كإعادة تحميل صامتة) ما لازم يمسح تعديلات غير محفوظة.
  useEffect(() => {
    if (skipNextPopulate.current) {
      skipNextPopulate.current = false; // أول تشغيل بعد استرجاع Draft محفوظ — لا تستبدله
      return;
    }
    setRows(
      students.map((st) => {
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
          hasRev: ex ? !!ex.revision : true,
          revGrade: ex?.revision?.grade ?? 90,
          revRequiredPages: ex?.revision?.requiredPages ?? 0,
          revCompletedPages: ex?.revision?.completedPages ?? 0,
          notes: ex?.notes ?? '',
          showNotes: !!ex?.notes,
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // حفظ Draft بالجلسة عند أي تعديل، حتى ينجو من إعادة تحميل الصفحة أو التنقل بين التبويبات
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ date, rows }));
    } catch {
      /* التخزين غير متاح */
    }
  }, [date, rows]);

  const patch = (id: string, p: Partial<Row>) => setRows((r) => r.map((x) => (x.studentId === id ? { ...x, ...p } : x)));

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0, excused: 0 };
    rows.forEach((r) => c[r.attendance]++);
    return c;
  }, [rows]);

  const calcAll = () =>
    setRows((r) =>
      r.map((x) => ({
        ...x,
        score:
          x.attendance === 'present' || x.attendance === 'late'
            ? suggestScore({ attendance: x.attendance, memGrade: x.hasMem ? x.memGrade : undefined, revGrade: x.hasRev ? x.revGrade : undefined, weekWorship: weekWorshipByStudent.get(x.studentId) })
            : undefined,
      })),
    );

  const [saving, setSaving] = useState(false);
  const saveAll = async () => {
    const recs: SessionRecord[] = rows.map((x) => {
      const id = `${x.studentId}-${date}`;
      const attended = x.attendance === 'present' || x.attendance === 'late';
      const prev = sessions.find((s) => s.id === id);
      const req = getRequirement(x.studentId);
      if (!attended) return { id, studentId: x.studentId, date, attendance: x.attendance, notes: x.notes || undefined };
      return {
        id,
        studentId: x.studentId,
        date,
        attendance: x.attendance,
        commitment: x.commitment,
        score: x.score ?? suggestScore({ attendance: x.attendance, memGrade: x.memGrade, revGrade: x.revGrade, weekWorship: weekWorshipByStudent.get(x.studentId) }),
        memorization: x.hasMem
          ? {
              required: prev?.memorization?.required ?? req?.memorization ?? '',
              recited: prev?.memorization?.recited ?? '',
              requiredPages: x.memRequiredPages,
              completedPages: x.memCompletedPages,
              completion: completionPercent(x.memRequiredPages, x.memCompletedPages),
              grade: x.memGrade ?? 0,
            }
          : null,
        revision: x.hasRev
          ? {
              required: prev?.revision?.required ?? req?.revision ?? '',
              revised: prev?.revision?.revised ?? '',
              requiredPages: x.revRequiredPages,
              completedPages: x.revCompletedPages,
              completion: completionPercent(x.revRequiredPages, x.revCompletedPages),
              grade: x.revGrade ?? 0,
            }
          : null,
        notes: x.notes || undefined,
      };
    });
    setSaving(true);
    try {
      await upsertSessions(recs);
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* التخزين غير متاح */
      }
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
            <input type="date" className="input w-44" value={date} onChange={(e) => setDate(e.target.value)} aria-label="تاريخ الدوام" />
            <button className="btn-ghost" onClick={() => setRows((r) => r.map((x) => ({ ...x, attendance: 'present' })))}>
              <CheckCheck className="h-4 w-4" /> الجميع حاضر
            </button>
            <button className="btn-soft" onClick={calcAll}>
              <Calculator className="h-4 w-4" /> احتساب العلامات
            </button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap gap-2 text-[12px]">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">حاضر {counts.present}</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">متأخر {counts.late}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">غائب بعذر {counts.excused}</span>
        <span className="rounded-full bg-burgundy-50 px-3 py-1 text-burgundy-700">غائب {counts.absent}</span>
      </div>

      <section className="card overflow-hidden">
        {/* رأس الأعمدة للشاشات العريضة */}
        <div className="hidden grid-cols-[200px_240px_110px_76px_210px_210px_100px_40px] items-center gap-3 border-b border-navy-50 bg-navy-50/60 px-4 py-2.5 text-[12px] font-medium text-navy-500 2xl:grid">
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
            const st = students.find((s) => s.id === r.studentId)!;
            const attended = r.attendance === 'present' || r.attendance === 'late';
            return (
              <li key={r.studentId} className={cx('px-4 py-3 transition', !attended && 'bg-paper/60')}>
                <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 2xl:grid-cols-[200px_240px_110px_76px_210px_210px_100px_40px] 2xl:items-center">
                  <div className="col-span-2 flex items-center gap-3 md:col-span-4 2xl:col-span-1">
                    <Avatar name={st.name} src={st.photo} size={40} />
                    <span className="truncate text-[14px] font-bold text-navy-900">{st.name}</span>
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
                  <div className="flex justify-end">
                    <button onClick={() => patch(r.studentId, { showNotes: !r.showNotes })} className={cx('rounded-lg p-1.5 transition', r.notes ? 'text-burgundy-600' : 'text-navy-300 hover:text-navy-600')} aria-label="ملاحظات">
                      <MessageSquarePlus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {r.showNotes && (
                  <input className="input input-sm mt-2 animate-fade-in" placeholder={`ملاحظة عن ${st.name}`} value={r.notes} onChange={(e) => patch(r.studentId, { notes: e.target.value })} />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-3 text-[12px] text-navy-400">علامة أسبوع العبادات تُدخل من صفحة الطالب ← تبويب العبادات، وتدخل هنا تلقائيًا ضمن معادلة العلامة (20%).</p>

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
