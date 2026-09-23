import { useEffect, useState, type ChangeEvent } from 'react';
import { ImagePlus, Loader2, Save } from 'lucide-react';
import type { Student } from '@/types';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { PROJECT } from '@/data/project';
import { TODAY } from '@/utils/today';

type Draft = Omit<Student, 'id'>;
const empty: Draft = { name: '', shortName: '', photo: '', birthDate: '', group: PROJECT.group, guardianName: '', guardianEmail: '', joinedAt: TODAY, notes: '', active: true };

/** إضافة طالب جديد أو تعديل بيانات طالب موجود */
export default function StudentFormModal({ open, onClose, student }: { open: boolean; onClose: () => void; student?: Student | null }) {
  const { addStudent, updateStudent } = useData();
  const toast = useToast();
  const [d, setD] = useState<Draft>(empty);
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setD(student ? { ...student } : empty);
      setErr('');
    }
  }, [open, student]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const path = `${Date.now()}-${f.name}`;
    const { data, error } = await supabase.storage.from('student-photos').upload(path, f, { upsert: true });
    setUploading(false);
    if (error) return setErr(`تعذّر رفع الصورة: ${error.message}`);
    const { data: pub } = supabase.storage.from('student-photos').getPublicUrl(data.path);
    set('photo', pub.publicUrl);
  };

  const save = async () => {
    if (!d.name.trim()) return setErr('اكتب اسم الطالب أولًا.');
    setSaving(true);
    setErr('');
    try {
      const payload = { ...d, shortName: d.shortName || d.name };
      if (student) {
        await updateStudent(student.id, payload);
        toast('تم حفظ بيانات الطالب');
      } else {
        await addStudent(payload);
        toast('تمت إضافة الطالب');
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={student ? 'تعديل بيانات الطالب' : 'إضافة طالب'}
      subtitle={student ? student.name : undefined}
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {student ? 'حفظ التعديلات' : 'إضافة الطالب'}
          </button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 p-4 text-center text-[12px] text-navy-500 hover:bg-navy-50">
          {uploading ? <Loader2 className="h-10 w-10 animate-spin text-navy-300" /> : d.photo ? <Avatar name={d.name || 'طالب'} src={d.photo} size={88} rounded="2xl" /> : <ImagePlus className="h-10 w-10 text-navy-300" />}
          {uploading ? 'جارٍ الرفع...' : d.photo ? 'تغيير الصورة' : 'رفع صورة الطالب'}
          <input type="file" accept="image/*" className="sr-only" onChange={onPhoto} disabled={uploading} />
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
            <label className="field-label">بريد ولي الأمر (لتسجيل الدخول)</label>
            <input type="email" className="input" dir="ltr" value={d.guardianEmail ?? ''} onChange={(e) => set('guardianEmail', e.target.value)} placeholder="parent@example.com" />
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
