import { useEffect, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import type { NextRequirement } from '@/types';
import NextSessionTicket from '@/components/parent/NextSessionTicket';
import { Field } from './fields';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { TODAY } from '@/utils/today';

/** تحديد المطلوب للدوام القادم مع معاينة مباشرة لما سيراه ولي الأمر */
export default function NextRequirementForm({ studentId }: { studentId: string }) {
  const { getRequirement, saveRequirement, deleteRequirement } = useData();
  const toast = useToast();
  const confirmDelete = useConfirmDelete();
  const current = getRequirement(studentId);
  const blank: NextRequirement = { studentId, date: '', memorization: '', revision: '', extraTask: '', notes: '', updatedAt: TODAY };
  const [r, setR] = useState<NextRequirement>(current ?? blank);
  useEffect(() => {
    if (current) setR(current);
  }, [current]);
  const set = <K extends keyof NextRequirement>(k: K, v: NextRequirement[K]) => setR((x) => ({ ...x, [k]: v }));

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <section className="card space-y-4 p-5 xl:col-span-5">
        <h3 className="section-title">تحديد المطلوب للدوام القادم</h3>
        <Field label="تاريخ الدوام القادم">
          <input type="date" className="input" value={r.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="الحفظ المطلوب">
          <input className="input" value={r.memorization} onChange={(e) => set('memorization', e.target.value)} />
        </Field>
        <Field label="المراجعة المطلوبة">
          <input className="input" value={r.revision} onChange={(e) => set('revision', e.target.value)} />
        </Field>
        <Field label="مهمة إضافية">
          <input className="input" value={r.extraTask ?? ''} onChange={(e) => set('extraTask', e.target.value)} />
        </Field>
        <Field label="ملاحظات">
          <textarea className="input min-h-[70px]" value={r.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        <button
          className="btn-accent w-full"
          onClick={async () => {
            try {
              await saveRequirement({ ...r, updatedAt: TODAY });
              toast('تم حفظ المطلوب للدوام القادم');
            } catch (e) {
              toast(e instanceof Error ? e.message : 'حدث خطأ أثناء الحفظ.');
            }
          }}
        >
          <Save className="h-4 w-4" />
          حفظ المطلوب
        </button>
        {current && (
          <button
            className="btn-ghost w-full border-burgundy-200 text-burgundy-600 hover:bg-burgundy-50"
            onClick={async () => {
              if (await confirmDelete('حذف المطلوب للدوام القادم؟ لن يظهر لولي الأمر بعدها.', () => deleteRequirement(studentId), 'تم حذف المطلوب')) setR(blank);
            }}
          >
            <Trash2 className="h-4 w-4" />
            حذف المطلوب
          </button>
        )}
      </section>
      <div className="xl:col-span-7">
        <p className="mb-2 text-[12px] text-navy-400">معاينة ما سيظهر لولي الأمر</p>
        <NextSessionTicket req={{ ...r, updatedAt: TODAY }} />
      </div>
    </div>
  );
}
