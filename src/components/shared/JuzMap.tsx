import { useState } from 'react';
import { BookMarked, Crown, Loader2 } from 'lucide-react';
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

const juzProgress = (s: Student) => {
  const count = new Set(s.memorizedJuz ?? []).size;
  return { count, percent: Math.round((count / JUZ_COUNT) * 1000) / 10, hafiz: count >= JUZ_COUNT };
};

/** جملة تشجيعية حسب ما تبقّى */
function encouragement(count: number) {
  const left = JUZ_COUNT - count;
  if (left <= 0) return 'أتمّ حفظ القرآن الكريم كاملًا — ما شاء الله تبارك الله';
  if (count === 0) return 'بداية الطريق إلى حفظ كتاب الله، نسأل الله له التوفيق';
  if (left === 1) return 'بقي جزء واحد على إتمام حفظ القرآن الكريم';
  if (left === 2) return 'بقي جزءان على إتمام حفظ القرآن الكريم';
  return `بقي ${juzCountLabel(left)} على إتمام حفظ القرآن الكريم`;
}

/** وسام الحافظ: يظهر بعد إتمام الأجزاء الثلاثين */
export function HafizBadge({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l from-gold-300 to-gold-500 px-3 py-1 text-[12px] font-extrabold text-navy-900 shadow-soft', className)}>
      <Crown className="h-3.5 w-3.5" /> حافظ لكتاب الله
    </span>
  );
}

/** خط التقدّم نحو الأجزاء الثلاثين (مع علامات خفيفة كل 5 أجزاء) — ذهبي كامل عند الإتمام */
function ProgressLine({ percent, hafiz, tall }: { percent: number; hafiz: boolean; tall?: boolean }) {
  return (
    <div className={cx('relative flex-1 overflow-hidden rounded-full bg-navy-50', tall ? 'h-3' : 'h-2')}>
      <div
        className={cx('h-full rounded-full transition-all duration-700', hafiz ? 'bg-gradient-to-l from-gold-300 via-gold-400 to-gold-600' : 'bg-gradient-to-l from-gold-400 to-navy-700')}
        style={{ width: `${percent}%` }}
      />
      {!hafiz && [5, 10, 15, 20, 25].map((m) => <span key={m} className="absolute inset-y-0 w-px bg-white/70" style={{ right: `${(m / JUZ_COUNT) * 100}%` }} />)}
    </div>
  );
}

/**
 * شريط ثابت أعلى صفحات ولي الأمر: كم حفظ ابنه من 30 جزءًا مع جملة تشجيعية،
 * وعند الإتمام: خط ذهبي كامل وتاج ووسام "حافظ لكتاب الله".
 */
export function JuzProgressBanner({ student }: { student: Student }) {
  const { count, percent, hafiz } = juzProgress(student);
  return (
    <section
      className={cx(
        'mb-5 rounded-2xl border px-4 py-3 shadow-soft sm:px-5',
        hafiz ? 'border-gold-300 bg-gradient-to-l from-sand-50 via-white to-sand-50' : 'border-navy-100/70 bg-white/80 backdrop-blur',
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', hafiz ? 'bg-gold-300 text-navy-900' : 'bg-gold-300/30 text-gold-600')}>
            {hafiz ? <Crown className="h-5 w-5" /> : <BookMarked className="h-[18px] w-[18px]" />}
          </span>
          <div className="leading-tight">
            <p className="text-[14px] font-extrabold text-navy-900">
              {hafiz ? 'حافظ لكتاب الله' : 'حفظ القرآن الكريم'}{' '}
              <span className="font-bold text-navy-500">
                · {count} من {JUZ_COUNT} جزءًا
              </span>
            </p>
            <p className="text-[12px] text-navy-400">{encouragement(count)}</p>
          </div>
        </div>
        <div className="flex min-w-[200px] flex-1 items-center gap-3">
          <ProgressLine percent={percent} hafiz={hafiz} tall />
          {hafiz ? <HafizBadge /> : <b className="w-12 text-left text-[14px] text-navy-800">{percent}%</b>}
        </div>
      </div>
    </section>
  );
}

/**
 * حفظ القرآن الكريم بالتفصيل: خط تقدّم (من 30 جزءًا) والأجزاء الثلاثون كمربعات صغيرة.
 * editable (للمشرف): الضغط على الجزء يحدده محفوظًا أو يلغيه، ويُحفظ مباشرة.
 */
export default function JuzMap({ student, editable }: { student: Student; editable?: boolean }) {
  const { updateStudent } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const juz = student.memorizedJuz ?? [];
  const done = new Set(juz);
  const { percent, hafiz } = juzProgress(student);

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
    <section className={cx('card p-5', hafiz && 'ring-1 ring-gold-300')}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={cx('flex h-9 w-9 items-center justify-center rounded-xl', hafiz ? 'bg-gold-300 text-navy-900' : 'bg-gold-300/30 text-gold-600')}>
            {hafiz ? <Crown className="h-5 w-5" /> : <BookMarked className="h-[18px] w-[18px]" />}
          </span>
          <div>
            <h3 className="section-title">حفظ القرآن الكريم</h3>
            <p className="text-[12px] text-navy-400">{editable ? 'اضغط على الجزء لتحديده محفوظًا أو إلغاء تحديده' : 'الأجزاء التي أتمّ الطالب حفظها'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-navy-500">
          {busy && <Loader2 className="h-4 w-4 animate-spin text-navy-300" />}
          {hafiz ? (
            <HafizBadge />
          ) : (
            <span>
              <b className="text-[18px] text-navy-900">{done.size}</b> من {JUZ_COUNT} جزءًا
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <ProgressLine percent={percent} hafiz={hafiz} />
        <b className="w-12 text-left text-[13px] text-navy-800">{percent}%</b>
      </div>

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
        {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((n) => {
          const on = done.has(n);
          const cls = cx(
            'flex aspect-square items-center justify-center rounded-lg text-[12px] font-bold transition',
            on ? (hafiz ? 'bg-gold-400 text-navy-900' : 'bg-navy-800 text-white shadow-soft') : 'bg-navy-50/70 text-navy-300',
            editable && (on ? 'hover:opacity-85' : 'hover:bg-navy-100 hover:text-navy-500'),
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
