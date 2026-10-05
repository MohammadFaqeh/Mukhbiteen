import { useMemo, useState, type ChangeEvent } from 'react';
import { ArrowUpCircle, BookOpenCheck, CheckCircle2, ChevronDown, ExternalLink, FileUp, ListPlus, Loader2, Pencil, Save, ScrollText, Trash2, UserCheck, Wand2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Select from '@/components/ui/Select';
import { supabase } from '@/lib/supabase';
import type { Student, TajweedChapter, TajweedCourse } from '@/types';
import { TAJWEED_COURSES, courseMaterial, matchRoster, nextCourse, sortCourses, tajweedLabel } from '@/data/tajweed';
import { cx, formatDate } from '@/utils/format';
import { TODAY } from '@/utils/today';

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
        {TAJWEED_COURSES.filter((c) => c.hasMaterial).map(({ key, label }) => {
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

      <CourseChapters />

      {/* دورات الطلاب */}
      <section className="card overflow-hidden">
        <div className="border-b border-navy-50 px-5 py-4">
          <h3 className="section-title">دورات الطلاب</h3>
          <p className="text-[12px] text-navy-400">عندما يُنهي الطالب دورته اضغط "اجتاز الدورة"، فتُضاف إلى الدورات المجتازة وينتقل إلى الدورة التالية تلقائيًا، أو عدّل يدويًا. يُحفظ كل تغيير مباشرة ويظهر لولي الأمر.</p>
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
                {student ? (student.name === row.name ? 'مطابق لما في الموقع' : `في الموقع: ${student.name}`) : 'لم يُعثر عليه في الموقع — سيُتجاهَل'}
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

/**
 * دروس الدورات — قسم مطوي بالصفحة (سهم يفتح الدورات، وسهم لكل دورة يفتح دروسها).
 * الدروس ثابتة للدورة كلها (مش لكل طالب)، والمشرف بس بيعلّم ✓ على اللي خلص — بدون ما يكتب تاريخ:
 * الموقع بيحفظ تاريخ التعليم لحاله، والتقرير بيستعمله بس ليعرف شو خلص خلال فترة التقرير.
 */
function CourseChapters() {
  const { tajweedMaterials } = useData();
  const [open, setOpen] = useState(false);
  const courses = TAJWEED_COURSES.filter((c) => c.hasMaterial);
  const total = courses.reduce((a, c) => a + (tajweedMaterials.find((m) => m.course === c.key)?.chapters?.length ?? 0), 0);

  return (
    <section className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-5 py-4 text-right hover:bg-navy-50/40" aria-expanded={open}>
        <BookOpenCheck className="h-5 w-5 shrink-0 text-emerald-700" />
        <span className="flex-1">
          <span className="section-title block">دروس الدورات</span>
          <span className="block text-[12px] text-navy-400">حدّد الدروس المُنجزة، وتظهر لولي أمر كل طالب مسجّل في الدورة{total ? ` · ${total} درس` : ''}</span>
        </span>
        <ChevronDown className={cx('h-5 w-5 shrink-0 text-navy-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="divide-y divide-navy-50 border-t border-navy-50">
          {courses.map((c) => (
            <CourseLessons key={c.key} course={c.key} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CourseLessons({ course }: { course: TajweedCourse }) {
  const { students, tajweedMaterials, saveTajweedChapters } = useData();
  const toast = useToast();
  const lessons = useMemo(() => tajweedMaterials.find((m) => m.course === course)?.chapters ?? [], [tajweedMaterials, course]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const done = lessons.filter((l) => l.date).length;
  const enrolled = students.filter((s) => s.active && s.tajweedCurrent === course).length;

  const persist = async (next: TajweedChapter[], msg?: string) => {
    setBusy(true);
    try {
      await saveTajweedChapters(course, next);
      if (msg) toast(msg);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'تعذّر الحفظ.');
    } finally {
      setBusy(false);
    }
  };

  // التاريخ بيتسجّل تلقائيًا لحظة التعليم (للتقرير فقط)، وإلغاء التعليم بيمسحه
  const toggle = (id: string) => persist(lessons.map((l) => (l.id !== id ? l : l.date ? { id: l.id, title: l.title } : { ...l, date: TODAY })));
  const allDone = lessons.length > 0 && done === lessons.length;

  return (
    <li>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-5 py-3 text-right hover:bg-navy-50/40" aria-expanded={open}>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-navy-400 transition-transform', !open && 'rotate-90')} />
        <span className="flex-1 font-bold text-navy-900">{tajweedLabel(course)}</span>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-navy-300" />}
        <span className="text-[12px] text-navy-400">{enrolled ? `عدد الطلاب: ${enrolled}` : ''}</span>
        <span className={cx('rounded-full px-2.5 py-0.5 text-[12px] font-bold', lessons.length && allDone ? 'bg-emerald-100 text-emerald-800' : 'bg-navy-50 text-navy-600')}>
          {lessons.length ? `أُنجز ${done} من ${lessons.length}` : 'لا توجد دروس'}
        </span>
      </button>

      {open && (
        <div className="space-y-2 bg-navy-50/20 px-5 pb-4 pt-1">
          {editing ? (
            <LessonsEditor
              lessons={lessons}
              busy={busy}
              onCancel={() => setEditing(false)}
              onSave={async (next) => {
                await persist(next, `تم حفظ دروس ${tajweedLabel(course)}`);
                setEditing(false);
              }}
            />
          ) : (
            <>
              {lessons.length === 0 ? (
                <p className="py-2 text-[13px] text-navy-400">لا توجد دروس لهذه الدورة.</p>
              ) : (
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {lessons.map((l, i) => (
                    <li key={l.id}>
                      <label className={cx('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition', l.date ? 'border-emerald-200 bg-emerald-50/70' : 'border-navy-100 bg-white hover:bg-navy-50/50')}>
                        <input type="checkbox" className="h-[18px] w-[18px] shrink-0 accent-emerald-600" checked={!!l.date} disabled={busy} onChange={() => toggle(l.id)} />
                        <span className="w-5 shrink-0 text-center text-[12px] font-bold text-navy-300">{i + 1}</span>
                        <span className={cx('min-w-0 flex-1 text-[13px]', l.date ? 'font-bold text-navy-900' : 'text-navy-600')}>{l.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-1 text-[12px]">
                {lessons.length > 0 && !allDone && (
                  <button className="font-bold text-emerald-700 hover:underline" disabled={busy} onClick={() => persist(lessons.map((l) => (l.date ? l : { ...l, date: TODAY })), 'تم تسجيل إنجاز جميع الدروس')}>
                    إنجاز جميع الدروس
                  </button>
                )}
                <button className="flex items-center gap-1 text-navy-400 hover:text-navy-700" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5" /> تعديل الدروس
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}

/** تعديل أسماء الدروس وإضافة/حذف — مخفي ورا "تعديل الدروس" لأنه بيصير مرة وحدة تقريبًا */
function LessonsEditor({ lessons, busy, onSave, onCancel }: { lessons: TajweedChapter[]; busy: boolean; onSave: (l: TajweedChapter[]) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(lessons);
  const [newTitles, setNewTitles] = useState('');
  const add = () => {
    const titles = newTitles.split(/\r?\n/).map((t) => t.trim()).filter(Boolean);
    const stamp = Date.now().toString(36);
    setDraft((d) => [...d, ...titles.map((title, i) => ({ id: `${stamp}${i}`, title }))]);
    setNewTitles('');
  };
  return (
    <div className="space-y-2">
      {draft.map((l, i) => (
        <div key={l.id} className="flex items-center gap-2">
          <span className="w-6 shrink-0 text-center text-[12px] font-bold text-navy-300">{i + 1}</span>
          <input className="input min-w-0 flex-1" value={l.title} onChange={(e) => setDraft((d) => d.map((x) => (x.id === l.id ? { ...x, title: e.target.value } : x)))} aria-label={`اسم الدرس ${i + 1}`} />
          <button className="shrink-0 rounded-lg p-2 text-burgundy-500 hover:bg-burgundy-50" aria-label="حذف الدرس" onClick={() => setDraft((d) => d.filter((x) => x.id !== l.id))}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea className="input flex-1" rows={2} placeholder="دروس جديدة — كل درس في سطر" value={newTitles} onChange={(e) => setNewTitles(e.target.value)} />
        <button className="btn-ghost shrink-0" onClick={add} disabled={!newTitles.trim()}>
          <ListPlus className="h-4 w-4" /> إضافة
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel} disabled={busy}>
          إلغاء
        </button>
        <button className="btn-primary px-5" disabled={busy} onClick={() => onSave(draft.filter((l) => l.title.trim()).map((l) => ({ ...l, title: l.title.trim() })))}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
        </button>
      </div>
    </div>
  );
}
