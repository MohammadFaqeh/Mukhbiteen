import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { Assignment, AssignmentCategory, AssignmentUnit } from '@/types';
import Toggle from '@/components/ui/Toggle';
import { Field } from './fields';
import StudentPicker from './StudentPicker';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { categoryLabels, measureOf, unitLabels, type Measure } from '@/utils/assignments';
import { TODAY } from '@/utils/today';
import { cx } from '@/utils/format';

const newId = () => `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

function blank(studentIds: string[] = []): { a: Assignment; ids: string[] } {
  const now = new Date().toISOString();
  return {
    a: { id: newId(), title: '', description: '', category: 'other', visibleToParents: true, createdAt: now, updatedAt: now, targets: [], progress: [] },
    ids: studentIds,
  };
}

const intOrUndef = (v: string) => (v === '' ? undefined : Math.max(0, Math.floor(Number(v))));

/**
 * إضافة/تعديل مطلوب بأي عنوان (تجويد، حفظ حديث، درس تربوي، واجب…):
 * العنوان والوصف والطلاب المستهدفون وتاريخ الاستحقاق (اختياري) والظهور لأولياء الأمور، والمقدار (اختياري)
 * — المقدار يكون نطاقًا (مثل الآيات 1–20) أو عددًا (مثل 3 أحاديث)، وبدونه لا تُحسب نسبة إنجاز.
 */
export default function AssignmentForm({ initial, presetStudents, onSaved, onCancel }: { initial?: Assignment | null; presetStudents?: string[]; onSaved?: () => void; onCancel?: () => void }) {
  const { saveAssignment, assignmentsReady } = useData();
  const toast = useToast();
  const [{ a, ids }, setState] = useState(() => (initial ? { a: initial, ids: initial.targets.map((t) => t.studentId) } : blank(presetStudents)));
  const [measure, setMeasure] = useState<Measure>(() => (initial ? measureOf(initial) : 'none'));
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Assignment>) => setState((s) => ({ ...s, a: { ...s.a, ...patch } }));

  const rangeBad = measure === 'range' && (a.rangeFrom === undefined || a.rangeTo === undefined || a.rangeTo < a.rangeFrom || a.rangeFrom < 1);
  const amountBad = measure === 'amount' && !(a.targetAmount && a.targetAmount > 0);

  const save = async () => {
    if (!a.title.trim()) return toast('اكتب عنوان المطلوب.');
    if (!ids.length) return toast('اختر طالبًا واحدًا على الأقل.');
    if (rangeBad) return toast('حدد النطاق المطلوب بشكل صحيح (من ≤ إلى).');
    if (amountBad) return toast('حدد المقدار المطلوب.');
    const unit: AssignmentUnit | undefined = measure === 'none' ? undefined : a.unit ?? (a.category === 'other' ? 'item' : 'page');
    const record: Assignment = {
      ...a,
      title: a.title.trim(),
      unit,
      rangeFrom: measure === 'range' ? a.rangeFrom : undefined,
      rangeTo: measure === 'range' ? a.rangeTo : undefined,
      targetAmount: measure === 'amount' ? a.targetAmount : undefined,
    };
    setSaving(true);
    try {
      await saveAssignment(record, ids);
      toast(initial ? 'تم تعديل المطلوب' : 'تمت إضافة المطلوب');
      if (!initial) setState(blank());
      onSaved?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'تعذّر حفظ المطلوب.');
    } finally {
      setSaving(false);
    }
  };

  if (!assignmentsReady)
    return <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-800">ميزة المطلوبات تحتاج إلى تحديث قاعدة البيانات: افتح supabase/schema.sql وشغّله كاملًا من SQL Editor في Supabase.</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="عنوان المطلوب" className="sm:col-span-2">
          <input className="input" value={a.title} onChange={(e) => set({ title: e.target.value })} placeholder="مثال: تجويد – أحكام النون الساكنة" />
        </Field>
        <Field label="النوع">
          <select className="input" value={a.category} onChange={(e) => set({ category: e.target.value as AssignmentCategory, unit: undefined })}>
            {(Object.keys(categoryLabels) as AssignmentCategory[]).map((k) => (
              <option key={k} value={k}>
                {categoryLabels[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="وصف المطلوب والتعليمات">
        <textarea className="input min-h-[72px]" value={a.description} onChange={(e) => set({ description: e.target.value })} placeholder="التفاصيل التي يحتاجها الطالب وولي الأمر" />
      </Field>

      <div>
        <span className="field-label">مقدار المطلوب</span>
        <div className="inline-flex w-full rounded-xl bg-navy-50 p-1 sm:w-auto">
          {(
            [
              ['none', 'بلا مقدار'],
              ['range', 'نطاق (من – إلى)'],
              ['amount', 'عدد'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMeasure(k)} className={cx('flex-1 rounded-lg px-3 py-1.5 text-[13px] font-bold transition sm:flex-none', measure === k ? 'bg-white text-navy-900 shadow-soft' : 'text-navy-500')}>
              {l}
            </button>
          ))}
        </div>
        {measure !== 'none' && (
          <div className="mt-3 grid animate-fade-in grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="الوحدة">
              <select className="input" value={a.unit ?? (a.category === 'other' ? 'item' : 'page')} onChange={(e) => set({ unit: e.target.value as AssignmentUnit })}>
                {(Object.keys(unitLabels) as AssignmentUnit[]).map((k) => (
                  <option key={k} value={k}>
                    {unitLabels[k].many}
                  </option>
                ))}
              </select>
            </Field>
            {measure === 'range' ? (
              <>
                <Field label="من">
                  <input type="number" min={1} className="input text-center" value={a.rangeFrom ?? ''} onChange={(e) => set({ rangeFrom: intOrUndef(e.target.value) })} />
                </Field>
                <Field label="إلى">
                  <input type="number" min={1} className="input text-center" value={a.rangeTo ?? ''} onChange={(e) => set({ rangeTo: intOrUndef(e.target.value) })} />
                </Field>
              </>
            ) : (
              <Field label="المقدار المطلوب">
                <input type="number" min={1} className="input text-center" value={a.targetAmount ?? ''} onChange={(e) => set({ targetAmount: intOrUndef(e.target.value) })} />
              </Field>
            )}
          </div>
        )}
        <p className="mt-2 text-[12px] text-navy-400">
          {measure === 'none'
            ? 'بلا مقدار: لا تُحسب نسبة إنجاز، وتحدد الإدارة حالة كل طالب يدويًا.'
            : measure === 'range'
              ? 'النطاق يمنع احتساب المكرر: تسميع الآيات 1–10 مرتين يبقى 10 آيات. مطلوب حفظ بالصفحات يدخل تلقائيًا في حساب الأجزاء المحفوظة.'
              : 'نسبة الإنجاز = مجموع المقادير المعتمدة ÷ المطلوب × 100.'}
        </p>
      </div>

      <Field label="الطلاب المستهدفون">
        <StudentPicker value={ids} onChange={(next) => setState((s) => ({ ...s, ids: next }))} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="تاريخ الاستحقاق (اختياري)">
          <input type="date" className="input" min={initial ? undefined : TODAY} value={a.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value || undefined })} />
        </Field>
        <div className="sm:pt-6">
          <Toggle checked={a.visibleToParents} onChange={(v) => set({ visibleToParents: v })} label="يظهر لأولياء الأمور" description="عند إيقافه يبقى المطلوب للإدارة فقط" />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            إلغاء
          </button>
        )}
        <button type="button" className="btn-accent px-6" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {initial ? 'حفظ التعديلات' : 'إضافة المطلوب'}
        </button>
      </div>
    </div>
  );
}
