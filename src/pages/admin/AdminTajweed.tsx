import { useMemo, useState, type ChangeEvent } from 'react';
import { ArrowUpCircle, CheckCircle2, ExternalLink, FileUp, Loader2, ScrollText, UserCheck, Wand2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Select from '@/components/ui/Select';
import { supabase } from '@/lib/supabase';
import type { Student, TajweedCourse } from '@/types';
import { TAJWEED_COURSES, courseMaterial, matchRoster, nextCourse, sortCourses, tajweedLabel } from '@/data/tajweed';
import { cx, formatDate } from '@/utils/format';

const BUCKET = 'tajweed-materials';

/** صفحة التجويد للمشرف: مادة كل دورة (PDF) + دورات كل طالب (المجتازة والحالية) */
export default function AdminTajweed() {
  const { students, tajweedMaterials, saveTajweedMaterial, updateStudent } = useData();
  const toast = useToast();
  const [uploading, setUploading] = useState<TajweedCourse | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const active = useMemo(() => students.filter((s) => s.active), [students]);
  const material = (c: TajweedCourse) => courseMaterial(c, tajweedMaterials);

  const upload = async (course: TajweedCourse, e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return toast('اختر ملف PDF.');
    setUploading(course);
    try {
      const path = `${course}-${Date.now()}.pdf`; // اسم جديد كل مرة حتى ما يعرض المتصفح النسخة القديمة من الذاكرة
      const { data, error } = await supabase.storage.from(BUCKET).upload(path, f, { upsert: true, contentType: 'application/pdf' });
      if (error) throw new Error(`تعذّر رفع الملف: ${error.message}`);
      const url = supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl;
      const old = material(course).isDefault ? undefined : material(course).pdfUrl;
      await saveTajweedMaterial({ course, pdfUrl: url, fileName: f.name });
      const marker = `/storage/v1/object/public/${BUCKET}/`;
      if (old?.includes(marker)) await supabase.storage.from(BUCKET).remove([decodeURIComponent(old.split(marker)[1])]);
      toast(`تم رفع مادة ${tajweedLabel(course)}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'حدث خطأ أثناء الرفع.');
    } finally {
      setUploading(null);
    }
  };

  const save = async (s: Student, patch: Partial<Student>) => {
    setBusyId(s.id);
    try {
      await updateStudent(s.id, patch);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'تعذّر الحفظ.');
    } finally {
      setBusyId(null);
    }
  };

  /** أنهى الطالب دورته الحالية: تُضاف للمجتازة وينتقل تلقائيًا للدورة التالية (ويظهر هذا فورًا لولي الأمر) */
  const promote = (s: Student) => {
    const cur = s.tajweedCurrent;
    if (!cur) return;
    const next = nextCourse(cur);
    save(s, { tajweedCompleted: sortCourses([...(s.tajweedCompleted ?? []), cur]), tajweedCurrent: next });
    toast(next ? `${s.name}: اجتاز ${tajweedLabel(cur)} وانتقل إلى ${tajweedLabel(next)}` : `${s.name}: أنهى ${tajweedLabel(cur)} — أتمّ جميع الدورات`);
  };

  const toggleCompleted = (s: Student, c: TajweedCourse) => {
    const list = s.tajweedCompleted ?? [];
    const next = list.includes(c) ? list.filter((x) => x !== c) : sortCourses([...list, c]);
    // دورة اجتازها ما تبقى "حالية"
    save(s, { tajweedCompleted: next, ...(s.tajweedCurrent === c && next.includes(c) ? { tajweedCurrent: undefined } : {}) });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="التجويد"
        subtitle="مادة كل دورة، والدورات التي اجتازها كل طالب والدورة المسجّل فيها حاليًا"
        actions={
          <button className="btn-ghost" onClick={() => setImportOpen(true)}>
            <Wand2 className="h-4 w-4" /> تعبئة من كشف الدورات
          </button>
        }
      />

      {/* مواد الدورات */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TAJWEED_COURSES.map(({ key, label }) => {
          const m = material(key);
          const count = active.filter((s) => s.tajweedCurrent === key).length;
          return (
            <article key={key} className="card flex flex-col gap-3 p-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ScrollText className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-navy-900">{label}</h3>
                  <p className="text-[12px] text-navy-400">{count ? `${count} طالب يدرسها حاليًا` : 'لا يوجد طلاب فيها حاليًا'}</p>
                </div>
              </div>
              {m.pdfUrl ? (
                <a href={m.pdfUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-800 hover:bg-emerald-100">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    {m.fileName ?? 'مادة الدورة'}
                    {m.isDefault && <span className="block text-[11px] font-normal text-emerald-700/80">الملف الأصلي المرفق مع الموقع</span>}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              ) : (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-800">لم تُرفع المادة بعد — لن يرى الأهالي ملفًا لهذه الدورة.</p>
              )}
              <label className={cx('btn-soft mt-auto cursor-pointer text-[13px]', uploading && 'pointer-events-none opacity-60')}>
                {uploading === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                {m.isDefault ? 'رفع نسخة أحدث' : 'استبدال الملف'}
                <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => upload(key, e)} disabled={!!uploading} />
              </label>
              {!m.isDefault && m.updatedAt && <p className="-mt-1 text-center text-[11px] text-navy-300">آخر تحديث {formatDate(m.updatedAt.slice(0, 10))}</p>}
            </article>
          );
        })}
      </section>

      {/* دورات الطلاب */}
      <section className="card overflow-hidden">
        <div className="border-b border-navy-50 px-5 py-4">
          <h3 className="section-title">دورات الطلاب</h3>
          <p className="text-[12px] text-navy-400">لما يُنهي الطالب دورته اضغط "اجتاز الدورة" فتنضاف للمجتازة وينتقل للدورة التالية تلقائيًا — أو عدّل يدويًا. كل تغيير يُحفظ مباشرة ويظهر لولي الأمر</p>
        </div>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[920px] text-[13px]">
            <thead className="bg-navy-50/60 text-right text-[12px] text-navy-500">
              <tr>
                <th className="px-5 py-3 font-medium">الطالب</th>
                <th className="px-3 py-3 font-medium">الدورات المجتازة</th>
                <th className="w-52 px-3 py-3 font-medium">الدورة الحالية</th>
                <th className="w-40 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {active.map((s) => {
                const done = s.tajweedCompleted ?? [];
                return (
                  <tr key={s.id} className="border-t border-navy-50">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} src={s.photo} size={32} />
                        <span className="font-bold text-navy-900">{s.name}</span>
                        {busyId === s.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-navy-300" />}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {TAJWEED_COURSES.map(({ key, label }) => (
                          <button
                            key={key}
                            disabled={busyId === s.id}
                            onClick={() => toggleCompleted(s, key)}
                            className={cx(
                              'rounded-full border px-2.5 py-1 text-[12px] font-bold transition',
                              done.includes(key) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-navy-100 bg-white text-navy-400 hover:bg-navy-50',
                            )}
                          >
                            {done.includes(key) && '✓ '}
                            {label.replace('الدورة ', '').replace('دورة ', '')}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Select
                        ariaLabel={`الدورة الحالية لـ ${s.name}`}
                        value={s.tajweedCurrent ?? ''}
                        onChange={(v) => save(s, { tajweedCurrent: (v || undefined) as TajweedCourse | undefined })}
                        options={[{ value: '', label: 'غير مسجّل بدورة' }, ...TAJWEED_COURSES.filter((c) => !done.includes(c.key)).map((c) => ({ value: c.key, label: c.label }))]}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      {s.tajweedCurrent && (
                        <button className="btn-soft w-full px-3 py-1.5 text-[12px] text-emerald-800" disabled={busyId === s.id} onClick={() => promote(s)}>
                          <ArrowUpCircle className="h-4 w-4" /> اجتاز الدورة
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <RosterImport open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

/** تعبئة دورات الطلاب وتواريخ ميلادهم من الكشف المرفق، مع معاينة المطابقة قبل الحفظ */
function RosterImport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { students, updateStudent } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const rows = useMemo(() => matchRoster(students), [students]);
  const matched = rows.filter((r) => r.student);

  const apply = async () => {
    setBusy(true);
    try {
      for (const { row, student } of matched) {
        await updateStudent(student!.id, { tajweedCompleted: row.completed, tajweedCurrent: row.current, birthDate: row.birthDate });
      }
      toast(`تم تحديث دورات ${matched.length} طالب`);
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'تعذّر الحفظ.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="تعبئة من كشف الدورات"
      subtitle="الدورات المجتازة والحالية وتاريخ الميلاد لكل طالب حسب الكشف"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn-primary" onClick={apply} disabled={busy || !matched.length}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} تحديث {matched.length} طالب
          </button>
        </>
      }
    >
      <ul className="divide-y divide-navy-50 rounded-xl border border-navy-50 text-[13px]">
        {rows.map(({ row, student }) => (
          <li key={row.name} className={cx('flex flex-wrap items-center gap-2 px-4 py-2.5', !student && 'bg-burgundy-50/50')}>
            <span className="min-w-0 flex-1">
              <b className="text-navy-900">{row.name}</b>
              <span className="block text-[12px] text-navy-400">
                {student ? (student.name === row.name ? 'مطابق بالموقع' : `بالموقع: ${student.name}`) : 'لم يُعثر عليه بالموقع — يُتجاهل'}
              </span>
            </span>
            <span className="text-[12px] text-navy-500">
              اجتاز: {row.completed.map((c) => tajweedLabel(c).replace('الدورة ', '')).join('، ')} · حاليًا: <b className="text-navy-800">{tajweedLabel(row.current)}</b>
            </span>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
