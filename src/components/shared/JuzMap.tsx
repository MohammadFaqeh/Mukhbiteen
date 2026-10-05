import { useState } from 'react';
import { BookMarked, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import type { Student } from '@/types';
import { cx } from '@/utils/format';

const JUZ_COUNT = 30;

/** "جزء واحد" / "جزءان" / "3 أجزاء" / "11 جزءًا" — صيغة العدد الصحيحة بالعربية */
export function juzCountLabel(n: number) {
  if (n === 0) return 'لا يوجد';
  if (n === 1) return 'جزء واحد';
  if (n === 2) return 'جزءان';
  if (n <= 10) return `${n} أجزاء`;
  return `${n} جزءًا`;
}

/**
 * حفظ القرآن الكريم: خط تقدّم (من 30 جزءًا) والأجزاء الثلاثون كمربعات صغيرة.
 * editable (للمشرف): الضغط على الجزء يحدده محفوظًا أو يلغيه، ويُحفظ مباشرة.
 */
export default function JuzMap({ student, editable }: { student: Student; editable?: boolean }) {
  const { updateStudent } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const juz = student.memorizedJuz ?? [];
  const done = new Set(juz);
  const percent = Math.round((done.size / JUZ_COUNT) * 1000) / 10;

  const toggle = async (n: number) => {
    const next = done.has(n) ? juz.filter((x) => x !== n) : [...juz, n].sort((a, b) => a - b);
    setBusy(true);
    try {
      await updateStudent(student.id, { memorizedJuz: next });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'تعذّر الحفظ.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-300/30 text-gold-600">
            <BookMarked className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="section-title">حفظ القرآن الكريم</h3>
            <p className="text-[12px] text-navy-400">{editable ? 'اضغط على الجزء لتحديده محفوظًا أو إلغاء تحديده' : 'الأجزاء التي أتمّ الطالب حفظها'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-navy-500">
          {busy && <Loader2 className="h-4 w-4 animate-spin text-navy-300" />}
          <span>
            <b className="text-[18px] text-navy-900">{done.size}</b> من {JUZ_COUNT} جزءًا
          </span>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-navy-50">
          <div className="h-full rounded-full bg-gradient-to-l from-gold-400 to-navy-700 transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
        <b className="w-12 text-left text-[13px] text-navy-800">{percent}%</b>
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
        {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((n) => {
          const on = done.has(n);
          const cls = cx(
            'flex aspect-square items-center justify-center rounded-lg text-[12px] font-bold transition',
            on ? 'bg-navy-800 text-white shadow-soft' : 'bg-navy-50/70 text-navy-300',
            editable && (on ? 'hover:bg-navy-700' : 'hover:bg-navy-100 hover:text-navy-500'),
          );
          return editable ? (
            <button key={n} type="button" disabled={busy} onClick={() => toggle(n)} className={cls} aria-pressed={on} aria-label={`الجزء ${n}`}>
              {n}
            </button>
          ) : (
            <span key={n} className={cls} aria-label={`الجزء ${n}${on ? ' (محفوظ)' : ''}`}>
              {n}
            </span>
          );
        })}
      </div>
    </section>
  );
}
