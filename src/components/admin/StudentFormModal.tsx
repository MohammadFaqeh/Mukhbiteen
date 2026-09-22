import { useEffect, useState, type ChangeEvent } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import type { Student } from '@/types';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PROJECT, TODAY } from '@/data/mockData';

type Draft = Omit<Student, 'id'>;
const empty: Draft = { name: '', shortName: '', photo: '', birthDate: '', group: PROJECT.group, guardianName: '', username: '', joinedAt: TODAY, notes: '', active: true };

/** إضافة طالب جديد أو تعديل بيانات طالب موجود */
export default function StudentFormModal({ open, onClose, student }: { open: boolean; onClose: () => void; student?: Student | null }) {
  const { addStudent, updateStudent } = useData();
  const toast = useToast();
  const [d, setD] = useState<Draft>(empty);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setD(student ? { ...student } : empty);
      setErr('');
    }
  }, [open, student]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const onPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    // حاليًا: رابط مؤقت داخل المتصفح. لاحقًا: الرفع إلى Supabase Storage
    if (f) set('photo', URL.createObjectURL(f));
  };

  const save = () => {
    if (!d.name.trim()) return setErr('اكتب اسم الطالب أولًا.');
    if (!d.username.trim()) return setErr('اكتب اسم مستخدم لولي الأمر.');
    const payload = { ...d, shortName: d.shortName || d.name };
    if (student) {
      updateStudent(student.id, payload);
      toast('تم حفظ بيانات الطالب');
    } else {
      addStudent(payload);
      toast('تمت إضافة الطالب');
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={student ? 'تعديل بيانات الطالب' : 'إضافة طالب'}
      subtitle={student ? student.name : 'البيانات تُحفظ في الواجهة التجريبية فقط'}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn-primary" onClick={save}>
            <Save className="h-4 w-4" />
            {student ? 'حفظ التعديلات' : 'إضافة الطالب'}
          </button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 p-4 text-center text-[12px] text-navy-500 hover:bg-navy-50">
          {d.photo ? <Avatar name={d.name || 'طالب'} src={d.photo} size={88} rounded="2xl" /> : <ImagePlus className="h-10 w-10 text-navy-300" />}
          {d.photo ? 'تغيير الصورة' : 'رفع صورة الطالب'}
          <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="field-label">اسم الطالب</label>
            <input className="input" value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="الاسم الرباعي" />
          </div>
          <div>
            <label className="field-label">تاريخ الميلاد</label>
            <input type="date" className="input" value={d.birthDate} onChange={(e) => set('birthDate', e.target.value)} />
          </div>
          <div>
            <label className="field-label">المجموعة</label>
            <input className="input" value={d.group} onChange={(e) => set('group', e.target.value)} />
          </div>
          <div>
            <label className="field-label">اسم ولي الأمر</label>
            <input className="input" value={d.guardianName} onChange={(e) => set('guardianName', e.target.value)} />
          </div>
          <div>
            <label className="field-label">اسم المستخدم (لولي الأمر)</label>
            <input className="input" dir="ltr" value={d.username} onChange={(e) => set('username', e.target.value)} placeholder="username" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">ملاحظات</label>
            <textarea className="input min-h-[80px]" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          {err && <p className="rounded-xl bg-burgundy-50 px-3 py-2 text-[13px] text-burgundy-700 sm:col-span-2">{err}</p>}
        </div>
      </div>
    </Modal>
  );
}
