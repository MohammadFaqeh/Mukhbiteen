import { useEffect, useState } from 'react';
import { BookOpen, Calculator, HandHeart, RotateCcw, Save } from 'lucide-react';
import type { SessionRecord, WorshipKey, WorshipRecord } from '@/types';
import Toggle from '@/components/ui/Toggle';
import WorshipGrid from '@/components/shared/WorshipGrid';
import { ProgressBar } from '@/components/ui/Progress';
import { AttendancePicker, CommitmentSelect, Field, NumberInput } from './fields';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { TODAY } from '@/data/mockData';
import { suggestScore, worshipPercent } from '@/utils/stats';
import { pct } from '@/utils/format';

export const emptyWorship: WorshipRecord = { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false, morningAdhkar: false, eveningAdhkar: false, quranWird: false };

function blank(studentId: string, date = TODAY): SessionRecord {
  return {
    id: `${studentId}-${date}`,
    studentId,
    date,
    attendance: 'present',
    commitment: 'excellent',
    score: undefined,
    memorization: { required: '', recited: '', completion: 100, grade: 90, notes: '' },
    revision: { required: '', revised: '', completion: 100, grade: 90, notes: '' },
    worship: { ...emptyWorship },
    notes: '',
  };
}

interface Props {
  studentId: string;
  initial?: SessionRecord | null;
  onSaved?: (s: SessionRecord) => void;
  onCancel?: () => void;
}

/** نموذج إضافة / تعديل يوم دوام لطالب */
export default function SessionForm({ studentId, initial, onSaved, onCancel }: Props) {
  const { upsertSessions, deleteSession, sessions } = useData();
  const toast = useToast();
  const [s, setS] = useState<SessionRecord>(() => initial ?? blank(studentId));
  const [hasMem, setHasMem] = useState(initial ? !!initial.memorization : true);
  const [hasRev, setHasRev] = useState(initial ? !!initial.revision : true);

  useEffect(() => {
    setS(initial ? { ...blank(studentId, initial.date), ...initial, memorization: initial.memorization ?? blank(studentId).memorization, revision: initial.revision ?? blank(studentId).revision, worship: initial.worship ?? { ...emptyWorship } } : blank(studentId));
    setHasMem(initial ? !!initial.memorization : true);
    setHasRev(initial ? !!initial.revision : true);
  }, [initial, studentId]);

  const attended = s.attendance === 'present' || s.attendance === 'late';
  const set = <K extends keyof SessionRecord>(k: K, v: SessionRecord[K]) => setS((x) => ({ ...x, [k]: v }));
  const setMem = (patch: Partial<NonNullable<SessionRecord['memorization']>>) => setS((x) => ({ ...x, memorization: { ...x.memorization!, ...patch } }));
  const setRev = (patch: Partial<NonNullable<SessionRecord['revision']>>) => setS((x) => ({ ...x, revision: { ...x.revision!, ...patch } }));
  const toggleW = (k: WorshipKey) => setS((x) => ({ ...x, worship: { ...(x.worship ?? emptyWorship), [k]: !x.worship?.[k] } }));

  const auto = () =>
    set(
      'score',
      suggestScore({ attendance: s.attendance, memGrade: hasMem ? s.memorization?.grade : undefined, revGrade: hasRev ? s.revision?.grade : undefined, worship: s.worship }),
    );

  const exists = !initial && sessions.some((x) => x.id === `${studentId}-${s.date}`);

  const save = () => {
    const record: SessionRecord = attended
      ? { ...s, id: `${studentId}-${s.date}`, memorization: hasMem ? s.memorization : null, revision: hasRev ? s.revision : null, score: s.score ?? suggestScore({ attendance: s.attendance, memGrade: s.memorization?.grade, revGrade: s.revision?.grade, worship: s.worship }) }
      : { id: `${studentId}-${s.date}`, studentId, date: s.date, attendance: s.attendance, notes: s.notes };
    if (initial && initial.id !== record.id) deleteSession(initial.id); // تغيّر التاريخ
    upsertSessions([record]);
    toast('تم حفظ يوم الدوام');
    onSaved?.(record);
  };

  const wp = worshipPercent(s.worship);

  return (
    <div className="space-y-4">
      {/* البيانات الأساسية */}
      <section className="card p-5">
        <h3 className="section-title mb-4">{initial ? 'تعديل يوم الدوام' : 'إضافة دوام'}</h3>
        <div className="grid gap-4 md:grid-cols-12">
          <Field label="التاريخ" className="md:col-span-3">
            <input type="date" className="input" value={s.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="الحضور" className="md:col-span-5">
            <AttendancePicker value={s.attendance} onChange={(v) => set('attendance', v)} />
          </Field>
          <Field label="الالتزام" className="md:col-span-2">
            <CommitmentSelect value={s.commitment} onChange={(v) => set('commitment', v)} />
          </Field>
          <Field label="علامة اليوم /100" className="md:col-span-2">
            <div className="flex gap-1.5">
              <NumberInput value={s.score} onChange={(v) => set('score', v)} placeholder="—" ariaLabel="علامة اليوم" />
              <button type="button" onClick={auto} className="btn-soft px-2.5" title="احتساب تلقائي حسب المعادلة" aria-label="احتساب تلقائي">
                <Calculator className="h-4 w-4" />
              </button>
            </div>
          </Field>
          <Field label="ملاحظات" className="md:col-span-12">
            <textarea className="input min-h-[64px]" value={s.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="ملاحظة تظهر لولي الأمر في تفاصيل اليوم" />
          </Field>
        </div>
        {exists && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-700">يوجد سجل لهذا الطالب في نفس التاريخ، وسيتم استبداله عند الحفظ.</p>}
        <p className="mt-3 text-[12px] text-navy-400">زر الآلة الحاسبة يقترح العلامة: حضور 10% + حفظ 30% + مراجعة 30% + عبادات 20% + تقييم 10%.</p>
      </section>

      {attended ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {/* الحفظ */}
          <section className="card space-y-4 p-5">
            <h3 className="section-title flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-navy-500" /> الحفظ
            </h3>
            <Toggle checked={hasMem} onChange={setHasMem} label="يوجد حفظ مطلوب؟" />
            {hasMem && (
              <div className="grid animate-fade-in gap-3 sm:grid-cols-2">
                <Field label="الحفظ المطلوب" className="sm:col-span-2">
                  <input className="input" value={s.memorization?.required} onChange={(e) => setMem({ required: e.target.value })} placeholder="سورة البقرة – الآيات 100 إلى 115" />
                </Field>
                <Field label="ما تم تسميعه" className="sm:col-span-2">
                  <input className="input" value={s.memorization?.recited} onChange={(e) => setMem({ recited: e.target.value })} placeholder="الآيات 100 إلى 113" />
                </Field>
                <Field label="نسبة الإنجاز %">
                  <NumberInput value={s.memorization?.completion} onChange={(v) => setMem({ completion: v ?? 0 })} />
                </Field>
                <Field label="تقييم التسميع /100">
                  <NumberInput value={s.memorization?.grade} onChange={(v) => setMem({ grade: v ?? 0 })} />
                </Field>
                <Field label="ملاحظات" className="sm:col-span-2">
                  <input className="input" value={s.memorization?.notes ?? ''} onChange={(e) => setMem({ notes: e.target.value })} />
                </Field>
              </div>
            )}
          </section>

          {/* المراجعة */}
          <section className="card space-y-4 p-5">
            <h3 className="section-title flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-burgundy-600" /> المراجعة
            </h3>
            <Toggle checked={hasRev} onChange={setHasRev} label="يوجد مراجعة؟" />
            {hasRev && (
              <div className="grid animate-fade-in gap-3 sm:grid-cols-2">
                <Field label="المراجعة المطلوبة" className="sm:col-span-2">
                  <input className="input" value={s.revision?.required} onChange={(e) => setRev({ required: e.target.value })} placeholder="الجزء الأول" />
                </Field>
                <Field label="ما تمت مراجعته" className="sm:col-span-2">
                  <input className="input" value={s.revision?.revised} onChange={(e) => setRev({ revised: e.target.value })} />
                </Field>
                <Field label="نسبة الإنجاز %">
                  <NumberInput value={s.revision?.completion} onChange={(v) => setRev({ completion: v ?? 0 })} />
                </Field>
                <Field label="العلامة /100">
                  <NumberInput value={s.revision?.grade} onChange={(v) => setRev({ grade: v ?? 0 })} />
                </Field>
                <Field label="الملاحظات" className="sm:col-span-2">
                  <input className="input" value={s.revision?.notes ?? ''} onChange={(e) => setRev({ notes: e.target.value })} />
                </Field>
              </div>
            )}
          </section>

          {/* العبادات */}
          <section className="card p-5 xl:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="section-title flex items-center gap-2">
                <HandHeart className="h-4 w-4 text-emerald-700" /> جدول العبادات
              </h3>
              <div className="flex gap-2">
                <button type="button" className="btn-soft py-1.5 text-[12px]" onClick={() => set('worship', Object.fromEntries(Object.keys(emptyWorship).map((k) => [k, true])) as WorshipRecord)}>
                  تحديد الكل
                </button>
                <button type="button" className="btn-soft py-1.5 text-[12px]" onClick={() => set('worship', { ...emptyWorship })}>
                  مسح الكل
                </button>
              </div>
            </div>
            <WorshipGrid value={s.worship} onToggle={toggleW} />
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[13px] text-navy-500">نسبة اليوم:</span>
              <ProgressBar value={wp} tone="green" className="max-w-xs" />
              <b className="text-[16px] text-navy-900">{pct(wp)}</b>
            </div>
          </section>
        </div>
      ) : (
        <p className="card-quiet p-5 text-[14px] text-navy-500">الطالب غير حاضر في هذا اليوم، لا حاجة لإدخال الحفظ والمراجعة والعبادات.</p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button className="btn-ghost" onClick={onCancel}>
            إلغاء
          </button>
        )}
        <button className="btn-accent px-6" onClick={save}>
          <Save className="h-4 w-4" />
          حفظ يوم الدوام
        </button>
      </div>
    </div>
  );
}
