import { useState } from 'react';
import { Award, BookMarked, Crown, Loader2, Sparkles } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import type { JuzSource, Student } from '@/types';
import { cx } from '@/utils/format';
import { TODAY } from '@/utils/today';
import { downloadJuzCertificate, juzTitle } from '@/utils/certificate';
import { JUZ_COUNT, juzSource, juzSummary } from '@/utils/juz';

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

/** "منها 5 أجزاء محفوظة قبل الالتحاق و3 أجزاء أُتمّت في المشروع" — يظهر فقط عند وجود أجزاء محفوظة سابقًا */
function JuzBreakdown({ student }: { student: Student }) {
  const { prior, inProject } = juzSummary(student);
  if (!prior) return null;
  return (
    <p className="text-[11px] text-navy-400">
      منها {juzCountLabel(prior)} محفوظة قبل الالتحاق{inProject ? ` و${juzCountLabel(inProject)} أُتمّت في المشروع` : ''}
    </p>
  );
}

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
            <JuzBreakdown student={student} />
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

const sourceTitle: Record<JuzSource, string> = { prior: 'محفوظ قبل الالتحاق', manual: 'أُتمّ في المشروع', auto: 'أُتمّ في المشروع (اكتُشف تلقائيًا من سجل التسميع)' };

/**
 * حفظ القرآن الكريم بالتفصيل: خط تقدّم (من 30 جزءًا) والأجزاء الثلاثون كمربعات صغيرة.
 * editable (للمشرف): اختيار نوع التحديد (محفوظ سابقًا / أُتمّ في المشروع) ثم الضغط على الجزء،
 * أو إدخال عدد الأجزاء المحفوظة سابقًا مباشرة. الأجزاء المكتملة من سجل التسميع تُضاف تلقائيًا (بنجمة).
 * لولي الأمر: الضغط على جزء محفوظ يحمّل شهادة إتمامه.
 */
export default function JuzMap({ student, editable }: { student: Student; editable?: boolean }) {
  const { updateStudent } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [certBusy, setCertBusy] = useState<number | null>(null);
  const juz = student.memorizedJuz ?? [];
  const done = new Set(juz);
  const { percent, hafiz } = juzProgress(student);
  const { prior, inProject } = juzSummary(student);
  const [mode, setMode] = useState<Exclude<JuzSource, 'auto'>>('manual');
  const [priorInput, setPriorInput] = useState(String(prior));

  const persist = async (next: number[], dates: Record<string, string>, sources: Record<string, JuzSource>) => {
    setBusy(true);
    try {
      await updateStudent(student.id, { memorizedJuz: [...new Set(next)].sort((a, b) => a - b), memorizedJuzDates: dates, memorizedJuzSources: sources });
    } catch (e) {
      toast(e instanceof Error ? e.message : 'تعذّر الحفظ.');
    } finally {
      setBusy(false);
    }
  };

  /**
   * الضغط على جزء: غير محفوظ ← يُضاف بالنوع المختار، محفوظ بنوع آخر ← يتحوّل للنوع المختار، محفوظ بنفس النوع ← يُلغى.
   * الجزء لا يُحسب مرتين لأن الأجزاء مجموعة أرقام وليست عدّادًا.
   */
  const toggle = async (n: number) => {
    const key = String(n);
    const { [key]: _d, ...otherDates } = student.memorizedJuzDates ?? {};
    const { [key]: _s, ...otherSources } = student.memorizedJuzSources ?? {};
    const current = done.has(n) ? juzSource(student, n) : null;
    if (current === mode || (current === 'auto' && mode === 'manual')) {
      await persist(juz.filter((x) => x !== n), otherDates, otherSources);
      return;
    }
    // تاريخ الإتمام (للشهادة) يُسجَّل يوم التحديد للمكتمل بالمشروع، ويُحافَظ عليه إن وُجد
    const dates = mode === 'manual' ? { ...otherDates, [key]: student.memorizedJuzDates?.[key] ?? TODAY } : otherDates;
    await persist([...juz, n], dates, { ...otherSources, [key]: mode });
  };

  /** عدد الأجزاء المحفوظة سابقًا: تُحدَّد من الجزء 30 نزولًا (ترتيب الحفظ المعتاد) متجاوزةً ما أُتمّ في المشروع، وتُعدَّل بالضغط */
  const applyPriorCount = async () => {
    const want = Math.max(0, Math.min(JUZ_COUNT, Math.floor(Number(priorInput) || 0)));
    const inProj = juz.filter((n) => juzSource(student, n) !== 'prior');
    const priorList: number[] = [];
    for (let n = JUZ_COUNT; n >= 1 && priorList.length < want; n--) if (!inProj.includes(n)) priorList.push(n);
    const sources: Record<string, JuzSource> = Object.fromEntries(Object.entries(student.memorizedJuzSources ?? {}).filter(([k]) => inProj.includes(Number(k))));
    priorList.forEach((n) => (sources[String(n)] = 'prior'));
    const dates = Object.fromEntries(Object.entries(student.memorizedJuzDates ?? {}).filter(([k]) => inProj.includes(Number(k))));
    await persist([...inProj, ...priorList], dates, sources);
    setPriorInput(String(priorList.length));
    toast(`الأجزاء المحفوظة سابقًا: ${priorList.length}`);
  };

  const certificate = async (n: number) => {
    setCertBusy(n);
    try {
      await downloadJuzCertificate(student, n);
    } catch (e) {
      console.error(e);
      toast('تعذّر تجهيز الشهادة، حاول مرة أخرى.');
    } finally {
      setCertBusy(null);
    }
  };

  return (
    <section className={cx('card w-full p-4 sm:p-5', !editable && 'mx-auto max-w-3xl', hafiz && 'ring-1 ring-gold-300')}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={cx('flex h-9 w-9 items-center justify-center rounded-xl', hafiz ? 'bg-gold-300 text-navy-900' : 'bg-gold-300/30 text-gold-600')}>
            {hafiz ? <Crown className="h-5 w-5" /> : <BookMarked className="h-[18px] w-[18px]" />}
          </span>
          <div>
            <h3 className="section-title">حفظ القرآن الكريم</h3>
            <p className="text-[12px] text-navy-400">{editable ? 'اختر النوع ثم اضغط على الجزء لتحديده أو إلغائه' : done.size ? 'اضغط على أي جزء محفوظ لتحميل شهادة إتمامه' : 'الأجزاء التي أتمّ الطالب حفظها'}</p>
            {prior > 0 && (
              <p className="text-[12px] text-navy-500">
                محفوظة سابقًا: <b>{prior}</b> · أُتمّت في المشروع: <b>{inProject}</b>
              </p>
            )}
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

      {editable && (
        <div className="mb-3 flex flex-wrap items-end gap-3 rounded-2xl bg-navy-50/60 p-3">
          <div>
            <span className="field-label">عند الضغط على جزء يُحدَّد كـ</span>
            <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-navy-100">
              {(
                [
                  ['manual', 'أُتمّ في المشروع'],
                  ['prior', 'محفوظ سابقًا'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setMode(k)} className={cx('rounded-lg px-3 py-1 text-[12px] font-bold transition', mode === k ? (k === 'prior' ? 'bg-gold-400 text-navy-900' : 'bg-navy-800 text-white') : 'text-navy-500')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-1.5">
            <label>
              <span className="field-label">عدد الأجزاء المحفوظة سابقًا</span>
              <input type="number" min={0} max={JUZ_COUNT} className="input input-sm w-20 text-center" value={priorInput} onChange={(e) => setPriorInput(e.target.value)} />
            </label>
            <button type="button" className="btn-soft px-3 py-1.5 text-[12px]" disabled={busy} onClick={applyPriorCount} title="تُحدَّد من الجزء 30 نزولًا، ويمكن تعديلها بالضغط على الأجزاء">
              تطبيق
            </button>
          </div>
          <p className="basis-full text-[11px] text-navy-400">
            <Sparkles className="inline h-3 w-3" /> الجزء المعلَّم بنجمة أضافه النظام تلقائيًا: كل صفحاته سُمّعت حفظًا بتسميع معتمد (من أرقام الصفحات في خانة "ما تم تسميعه" أو مطلوبات الحفظ بالصفحات).
          </p>
        </div>
      )}

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
        {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((n) => {
          const on = done.has(n);
          const src = on ? juzSource(student, n) : null;
          const cls = cx(
            'relative flex aspect-square items-center justify-center rounded-lg text-[12px] font-bold transition',
            on ? (hafiz ? 'bg-gold-400 text-navy-900' : src === 'prior' ? 'bg-gold-300 text-navy-900 shadow-soft' : 'bg-navy-800 text-white shadow-soft') : 'bg-navy-50/70 text-navy-300',
            editable && (on ? 'hover:opacity-85' : 'hover:bg-navy-100 hover:text-navy-500'),
          );
          return editable ? (
            <button key={n} type="button" disabled={busy} onClick={() => toggle(n)} className={cls} aria-pressed={on} aria-label={`الجزء ${n}`} title={src ? sourceTitle[src] : undefined}>
              {n}
              {src === 'auto' && <Sparkles className="absolute right-0.5 top-0.5 h-2.5 w-2.5 opacity-70" />}
            </button>
          ) : on ? (
            <button
              key={n}
              type="button"
              disabled={certBusy !== null}
              onClick={() => certificate(n)}
              className={cx(cls, 'group hover:opacity-85')}
              aria-label={`تحميل شهادة ${juzTitle(n)}`}
              title={`${src ? sourceTitle[src] : ''} — تحميل شهادة ${juzTitle(n)}`}
            >
              {certBusy === n ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : n}
              <Award className="absolute left-0.5 top-0.5 h-2.5 w-2.5 opacity-60" />
            </button>
          ) : (
            <span key={n} className={cls} aria-label={`الجزء ${n}`}>
              {n}
            </span>
          );
        })}
      </div>

      {prior > 0 && !hafiz && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-navy-400">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-navy-800" /> أُتمّ في المشروع
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-gold-300" /> محفوظ قبل الالتحاق
          </span>
        </div>
      )}
    </section>
  );
}
