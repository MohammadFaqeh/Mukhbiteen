import { Check, Download, ExternalLink, GraduationCap, ScrollText } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useParentStudent } from '@/hooks/useParentStudent';
import PageHeader from '@/components/shared/PageHeader';
import { TAJWEED_COURSES, courseMaterial, tajweedLabel } from '@/data/tajweed';
import { cx } from '@/utils/format';

/** التجويد لولي الأمر: مسار الدورات (المجتازة والحالية) ومادة الدورة الحالية للتحميل */
export default function ParentTajweed() {
  const { student } = useParentStudent();
  const { tajweedMaterials } = useData();
  if (!student) return null;
  const done = student.tajweedCompleted ?? [];
  const current = student.tajweedCurrent;
  const material = current ? courseMaterial(current, tajweedMaterials) : undefined;

  return (
    <div>
      <PageHeader title="التجويد" subtitle={`دورات أحكام التلاوة والتجويد للطالب ${student.name}`} />

      <div className="grid gap-4 lg:grid-cols-12">
        {/* الدورة الحالية ومادتها */}
        <section className="card flex flex-col gap-4 p-5 lg:col-span-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <ScrollText className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[12px] text-navy-400">الدورة الحالية</p>
              <p className="text-[20px] font-extrabold text-navy-900">{current ? tajweedLabel(current) : 'غير مسجّل بدورة حاليًا'}</p>
            </div>
          </div>
          {current &&
            (material?.pdfUrl ? (
              <>
                <p className="text-[14px] leading-7 text-navy-600">هذه مادة الدورة التي يدرسها ابنك حاليًا، يمكنك فتحها أو تحميلها لمتابعة الدروس معه.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <a href={material.pdfUrl} target="_blank" rel="noreferrer" className="btn-primary">
                    <ExternalLink className="h-4 w-4" /> فتح المادة
                  </a>
                  <a href={material.pdfUrl} download={material.fileName ?? `${tajweedLabel(current)}.pdf`} target="_blank" rel="noreferrer" className="btn-ghost">
                    <Download className="h-4 w-4" /> تحميل PDF
                  </a>
                </div>
              </>
            ) : (
              <p className="rounded-xl bg-sand-50 px-4 py-3 text-[13px] text-navy-500">سيتم رفع مادة هذه الدورة قريبًا بإذن الله.</p>
            ))}
        </section>

        {/* مسار الدورات */}
        <section className="card p-5 lg:col-span-7">
          <h3 className="section-title mb-4">مسار الدورات</h3>
          <ol className="space-y-3">
            {TAJWEED_COURSES.map(({ key, label }, i) => {
              const isDone = done.includes(key);
              const isCurrent = current === key;
              return (
                <li
                  key={key}
                  className={cx(
                    'flex items-center gap-3 rounded-2xl border p-3',
                    isDone ? 'border-emerald-200 bg-emerald-50/60' : isCurrent ? 'border-gold-300 bg-sand-50' : 'border-navy-100 bg-white opacity-70',
                  )}
                >
                  <span
                    className={cx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold',
                      isDone ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-gold-300 text-navy-900' : 'bg-navy-50 text-navy-400',
                    )}
                  >
                    {isDone ? <Check className="h-5 w-5" /> : isCurrent ? <GraduationCap className="h-5 w-5" /> : i + 1}
                  </span>
                  <span className="flex-1 font-bold text-navy-900">{label}</span>
                  <span className={cx('rounded-full px-3 py-1 text-[12px] font-bold', isDone ? 'bg-emerald-100 text-emerald-800' : isCurrent ? 'bg-gold-300/60 text-navy-900' : 'text-navy-400')}>
                    {isDone ? 'اجتازها' : isCurrent ? 'يدرسها حاليًا' : 'لاحقًا'}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
