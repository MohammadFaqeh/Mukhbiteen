import { useMemo, useState, type ChangeEvent } from 'react';
import { AlertTriangle, Loader2, UploadCloud } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import type { Student } from '@/types';
import { LogParseError, normalizeArabic } from '@/utils/recitationLog';
import { parseStudentsFile, type ParsedStudents, type StudentRow } from '@/utils/studentsExcel';
import { PROJECT } from '@/data/project';
import { TODAY } from '@/utils/today';
import { cx } from '@/utils/format';

const LABELS: Record<string, string> = {
  name: 'الاسم',
  shortName: 'الاسم المختصر',
  birthDate: 'تاريخ الميلاد',
  guardianName: 'ولي الأمر',
  guardianEmail: 'البريد',
  group: 'المجموعة',
  joinedAt: 'تاريخ الانضمام',
  active: 'فعّال',
  notes: 'ملاحظات',
};

type Plan = { row: StudentRow; kind: 'new' } | { row: StudentRow; kind: 'update'; student: Student; patch: Partial<Student> } | { row: StudentRow; kind: 'same'; student: Student };

/** رفع ملف بيانات الطلاب: يحدّث الموجودين (الحقول المكتوبة فقط) ويضيف الجدد، بعد معاينة */
export default function StudentsImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { students, addStudent, updateStudent } = useData();
  const toast = useToast();
  const [parsed, setParsed] = useState<ParsedStudents | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const close = () => {
    setParsed(null);
    setErr('');
    onClose();
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      setParsed(await parseStudentsFile(file));
    } catch (x) {
      setErr(x instanceof LogParseError ? x.message : 'تعذّر قراءة الملف. تأكد إنه بصيغة Excel (xlsx) صحيحة.');
    } finally {
      setBusy(false);
    }
  };

  /** مطابقة كل صف بطالب: برقم الطالب أولًا، ثم بالاسم. الخلية الفاضية لا تمسح القيمة الحالية */
  const plan = useMemo<Plan[]>(() => {
    if (!parsed) return [];
    const byId = new Map(students.map((s) => [s.id, s]));
    const byName = new Map(students.map((s) => [normalizeArabic(s.name), s]));
    return parsed.rows.map((row) => {
      const student = (row.id && byId.get(row.id)) || byName.get(normalizeArabic(row.name!));
      if (!student) return { row, kind: 'new' };
      const patch: Partial<Student> = {};
      (Object.keys(LABELS) as (keyof typeof LABELS)[]).forEach((k) => {
        const key = k as keyof StudentRow & keyof Student;
        const v = row[key];
        if (v !== undefined && v !== student[key]) (patch as Record<string, unknown>)[key] = v;
      });
      return Object.keys(patch).length ? { row, kind: 'update', student, patch } : { row, kind: 'same', student };
    });
  }, [parsed, students]);

  const count = (k: Plan['kind']) => plan.filter((p) => p.kind === k).length;
  const dupNames = useMemo(() => {
    const seen = new Map<string, number>();
    plan.forEach((p) => seen.set(normalizeArabic(p.row.name!), (seen.get(normalizeArabic(p.row.name!)) ?? 0) + 1));
    return new Set([...seen].filter(([, n]) => n > 1).map(([n]) => n));
  }, [plan]);

  const run = async () => {
    setBusy(true);
    let done = 0;
    try {
      for (const p of plan) {
        if (p.kind === 'update') await updateStudent(p.student.id, p.patch);
        else if (p.kind === 'new') {
          const r = p.row;
          await addStudent({
            name: r.name!,
            shortName: r.shortName || r.name!,
            birthDate: r.birthDate ?? '',
            group: r.group || PROJECT.group,
            guardianName: r.guardianName ?? '',
            guardianEmail: r.guardianEmail ?? '',
            joinedAt: r.joinedAt || TODAY,
            notes: r.notes ?? '',
            active: r.active ?? true,
          });
        } else continue;
        done++;
      }
      toast(`تم حفظ ${done} طالبًا (${count('new')} جديد، ${count('update')} تحديث)`);
      close();
    } catch (x) {
      toast(`${x instanceof Error ? x.message : 'حدث خطأ أثناء الحفظ.'} — تم حفظ ${done} قبل الخطأ`);
    } finally {
      setBusy(false);
    }
  };

  const changes = count('new') + count('update');

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title="رفع بيانات الطلاب من Excel"
      subtitle="نزّل ملف بيانات الطلاب، عدّل عليه أو أضف طلاب جدد بصفوف جديدة، وارفعه هون"
      footer={
        parsed && (
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-navy-500">{changes ? `${count('new')} طالب جديد، ${count('update')} تحديث، ${count('same')} بدون تغيير` : 'لا يوجد أي تغيير بالملف'}</span>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setParsed(null)} disabled={busy}>
                ملف آخر
              </button>
              <button className="btn-accent" onClick={run} disabled={busy || !changes || dupNames.size > 0}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} حفظ
              </button>
            </div>
          </div>
        )
      }
    >
      {!parsed ? (
        <div className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/40 p-10 text-center text-[13px] text-navy-500 hover:bg-navy-50">
            {busy ? <Loader2 className="h-9 w-9 animate-spin text-navy-300" /> : <UploadCloud className="h-9 w-9 text-navy-300" />}
            {busy ? 'جارٍ القراءة...' : 'اختر ملف بيانات الطلاب (xlsx)'}
            <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={onFile} disabled={busy} />
          </label>
          {err && (
            <p className="flex items-center gap-2 rounded-xl bg-burgundy-50 px-3 py-2 text-[13px] text-burgundy-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
            </p>
          )}
          <ul className="list-disc space-y-1 pr-5 text-[12px] text-navy-400">
            <li>الطالب الموجود يتعرّف عليه برقمه بالموقع (آخر عمود) أو باسمه — فتعديل الاسم نفسه آمن طالما الرقم موجود.</li>
            <li>الخلية الفاضية ما بتمسح شي من بيانات الطالب الحالية.</li>
            <li>طالب جديد: أضف صف جديد واترك عمود الرقم فاضي.</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          {dupNames.size > 0 && (
            <p className="flex items-center gap-2 rounded-xl bg-burgundy-50 px-3 py-2 text-[12px] text-burgundy-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> نفس الاسم مكتوب أكثر من مرة بالملف — احذف التكرار وارفعه من جديد.
            </p>
          )}
          {parsed.issues.length > 0 && (
            <ul className="space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
              {parsed.issues.map((i, k) => (
                <li key={k}>
                  صف {i.row} {i.name && `(${i.name})`}: {i.message}
                </li>
              ))}
            </ul>
          )}
          <div className="scrollbar-thin max-h-[55vh] overflow-auto rounded-xl border border-navy-50">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-navy-50 text-right text-[12px] text-navy-500">
                <tr>
                  <th className="px-3 py-2 font-medium">صف</th>
                  <th className="px-3 py-2 font-medium">الطالب</th>
                  <th className="px-3 py-2 font-medium">الحالة</th>
                  <th className="px-3 py-2 font-medium">التغييرات</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((p) => (
                  <tr key={p.row.row} className={cx('border-t border-navy-50', p.kind === 'same' && 'text-navy-300', dupNames.has(normalizeArabic(p.row.name!)) && 'bg-burgundy-50/60')}>
                    <td className="px-3 py-2 font-mono text-[11px]">{p.row.row}</td>
                    <td className="px-3 py-2 font-bold">{p.row.name}</td>
                    <td className="px-3 py-2">
                      <span className={cx('rounded-full px-2 py-0.5 text-[11px]', p.kind === 'new' ? 'bg-emerald-50 text-emerald-700' : p.kind === 'update' ? 'bg-amber-50 text-amber-700' : 'bg-navy-50 text-navy-400')}>
                        {p.kind === 'new' ? 'جديد' : p.kind === 'update' ? 'تحديث' : 'بدون تغيير'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-navy-600">
                      {p.kind === 'update' &&
                        Object.entries(p.patch).map(([k, v]) => (
                          <span key={k} className="ml-3 inline-block">
                            {LABELS[k]}: <s className="text-navy-300">{fmt(p.student[k as keyof Student])}</s> ← <b>{fmt(v)}</b>
                          </span>
                        ))}
                      {p.kind === 'new' && [p.row.birthDate, p.row.guardianName, p.row.guardianEmail].filter(Boolean).join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

const fmt = (v: unknown) => (v === true ? 'نعم' : v === false ? 'لا' : v ? String(v) : '—');
