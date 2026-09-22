import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Calculator, Check, CheckCheck, MessageSquarePlus, Save } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/shared/PageHeader';
import Avatar from '@/components/ui/Avatar';
import { AttendancePicker, CommitmentSelect, NumberInput } from '@/components/admin/fields';
import { emptyWorship } from '@/components/admin/SessionForm';
import type { AttendanceStatus, CommitmentLevel, SessionRecord, WorshipKey, WorshipRecord } from '@/types';
import { TODAY } from '@/data/mockData';
import { suggestScore, worshipCount } from '@/utils/stats';
import { cx, formatLongDate, worshipItems } from '@/utils/format';

interface Row {
  studentId: string;
  attendance: AttendanceStatus;
  commitment: CommitmentLevel;
  score?: number;
  hasMem: boolean;
  memGrade?: number;
  memCompletion?: number;
  hasRev: boolean;
  revGrade?: number;
  revCompletion?: number;
  worship: WorshipRecord;
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

export default function AdminAttendance() {
  const { students, sessions, upsertSessions, getRequirement } = useData();
  const toast = useToast();
  const [date, setDate] = useState(TODAY);
  const [rows, setRows] = useState<Row[]>([]);

  // تعبئة الصفوف من السجلات الموجودة لهذا التاريخ (إن وُجدت)
  useEffect(() => {
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
          memCompletion: ex?.memorization?.completion ?? 100,
          hasRev: ex ? !!ex.revision : true,
          revGrade: ex?.revision?.grade ?? 90,
          revCompletion: ex?.revision?.completion ?? 100,
          worship: ex?.worship ?? { ...emptyWorship },
          notes: ex?.notes ?? '',
          showNotes: !!ex?.notes,
        };
      }),
    );
  }, [date, students]);

  const patch = (id: string, p: Partial<Row>) => setRows((r) => r.map((x) => (x.studentId === id ? { ...x, ...p } : x)));
  const toggleW = (id: string, k: WorshipKey) => setRows((r) => r.map((x) => (x.studentId === id ? { ...x, worship: { ...x.worship, [k]: !x.worship[k] } } : x)));

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
            ? suggestScore({ attendance: x.attendance, memGrade: x.hasMem ? x.memGrade : undefined, revGrade: x.hasRev ? x.revGrade : undefined, worship: x.worship })
            : undefined,
      })),
    );

  const saveAll = () => {
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
        score: x.score ?? suggestScore({ attendance: x.attendance, memGrade: x.memGrade, revGrade: x.revGrade, worship: x.worship }),
        memorization: x.hasMem
          ? { required: prev?.memorization?.required ?? req?.memorization ?? '', recited: prev?.memorization?.recited ?? '', completion: x.memCompletion ?? 0, grade: x.memGrade ?? 0 }
          : null,
        revision: x.hasRev ? { required: prev?.revision?.required ?? req?.revision ?? '', revised: prev?.revision?.revised ?? '', completion: x.revCompletion ?? 0, grade: x.revGrade ?? 0 } : null,
        worship: x.worship,
        notes: x.notes || undefined,
      };
    });
    upsertSessions(recs);
    toast(`تم حفظ دوام ${recs.length} طالبًا`);
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
        <div className="hidden grid-cols-[200px_240px_110px_76px_150px_150px_176px_40px] items-center gap-3 border-b border-navy-50 bg-navy-50/60 px-4 py-2.5 text-[12px] font-medium text-navy-500 2xl:grid">
          <span>الطالب</span>
          <span>الحضور</span>
          <span>الالتزام</span>
          <span>العلامة</span>
          <span>الحفظ (علامة / إنجاز)</span>
          <span>المراجعة (علامة / إنجاز)</span>
          <span>العبادات</span>
          <span />
        </div>
        <ul className="divide-y divide-navy-50">
          {rows.map((r) => {
            const st = students.find((s) => s.id === r.studentId)!;
            const attended = r.attendance === 'present' || r.attendance === 'late';
            const wc = worshipCount(r.worship);
            return (
              <li key={r.studentId} className={cx('px-4 py-3 transition', !attended && 'bg-paper/60')}>
                <div className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 2xl:grid-cols-[200px_240px_110px_76px_150px_150px_176px_40px] 2xl:items-center">
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
                  <Cell label="الحفظ (علامة / إنجاز)" className={cx(!attended && 'pointer-events-none opacity-40')}>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => patch(r.studentId, { hasMem: !r.hasMem })} className={cx('h-7 w-7 shrink-0 rounded-lg border text-[11px]', r.hasMem ? 'border-navy-700 bg-navy-700 text-white' : 'border-navy-100 text-navy-300')} aria-label="يوجد حفظ">
                        <Check className="mx-auto h-3.5 w-3.5" />
                      </button>
                      <NumberInput small value={r.hasMem ? r.memGrade : undefined} onChange={(v) => patch(r.studentId, { memGrade: v })} ariaLabel="علامة الحفظ" />
                      <NumberInput small value={r.hasMem ? r.memCompletion : undefined} onChange={(v) => patch(r.studentId, { memCompletion: v })} ariaLabel="إنجاز الحفظ" placeholder="%" />
                    </div>
                  </Cell>
                  <Cell label="المراجعة (علامة / إنجاز)" className={cx(!attended && 'pointer-events-none opacity-40')}>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => patch(r.studentId, { hasRev: !r.hasRev })} className={cx('h-7 w-7 shrink-0 rounded-lg border', r.hasRev ? 'border-burgundy-600 bg-burgundy-600 text-white' : 'border-navy-100 text-navy-300')} aria-label="يوجد مراجعة">
                        <Check className="mx-auto h-3.5 w-3.5" />
                      </button>
                      <NumberInput small value={r.hasRev ? r.revGrade : undefined} onChange={(v) => patch(r.studentId, { revGrade: v })} ariaLabel="علامة المراجعة" />
                      <NumberInput small value={r.hasRev ? r.revCompletion : undefined} onChange={(v) => patch(r.studentId, { revCompletion: v })} ariaLabel="إنجاز المراجعة" placeholder="%" />
                    </div>
                  </Cell>
                  <Cell label={`العبادات ${wc.done}/${wc.total}`} className={cx('col-span-2 md:col-span-1', !attended && 'pointer-events-none opacity-40')}>
                    <div className="flex items-center gap-1">
                      {worshipItems.map((w) => (
                        <button
                          key={w.key}
                          type="button"
                          title={w.label}
                          aria-label={w.label}
                          aria-pressed={r.worship[w.key]}
                          onClick={() => toggleW(r.studentId, w.key)}
                          className={cx('h-[18px] w-[18px] rounded-full border-2 transition', r.worship[w.key] ? 'border-emerald-600 bg-emerald-600' : 'border-navy-200 bg-white hover:border-navy-400')}
                        />
                      ))}
                      <span className="mr-1 hidden text-[11px] text-navy-400 2xl:inline">{wc.done}/8</span>
                    </div>
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

      <p className="mt-3 text-[12px] text-navy-400">دوائر العبادات بالترتيب: {worshipItems.map((w) => w.label).join('، ')}. العلامة الفارغة تُحتسب تلقائيًا عند الحفظ.</p>

      <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy-100 bg-white/95 px-5 py-3 shadow-lift backdrop-blur">
        <span className="text-[13px] text-navy-500">
          {rows.length} طالبًا – حاضر {counts.present + counts.late} من {rows.length}
        </span>
        <button onClick={saveAll} className="btn-accent px-10 py-3 text-[15px]">
          <Save className="h-5 w-5" /> حفظ الجميع
        </button>
      </div>
    </div>
  );
}
