import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Minus, Plus, Save } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import type { DailyWorship, PrayerKey, PrayerLocation } from '@/types';
import { PRAYER_ITEMS, WEEKDAY_LABELS, WEEK_DAYS, dailyWorshipScore, isFriday, weekDates, weekStartOf, wirdPages } from '@/utils/worship';
import { TODAY } from '@/utils/today';
import { cx, formatDayMonth } from '@/utils/format';

/** يوم قيد التعبئة: الصلوات ورضا الوالدين لازم تنختار صراحة قبل الحفظ (ما في قيم افتراضية تتسجّل بالغلط) */
type DayDraft = Omit<DailyWorship, 'prayers' | 'parentsSatisfaction'> & {
  prayers: Partial<Record<PrayerKey, PrayerLocation>>;
  parentsSatisfaction?: number;
};

function blank(studentId: string, date: string): DayDraft {
  return {
    id: `${studentId}-${date}`,
    studentId,
    date,
    prayers: {},
    morningAdhkar: false,
    eveningAdhkar: false,
    sleepAdhkar: false,
    duhaRakahs: 0,
    qiyam: false,
    witrRakahs: 0,
    rawatibRakahs: 0,
    parentsSatisfaction: undefined,
    charity: false,
    kahf: false,
    notes: '',
  };
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** زر اختيار كبير سهل اللمس */
function Choice({ on, onClick, tone = 'green', children }: { on: boolean; onClick: () => void; tone?: 'green' | 'amber' | 'red' | 'navy'; children: ReactNode }) {
  const onStyle = { green: 'border-emerald-600 bg-emerald-600 text-white', amber: 'border-amber-500 bg-amber-500 text-white', red: 'border-burgundy-500 bg-burgundy-500 text-white', navy: 'border-navy-700 bg-navy-700 text-white' }[tone];
  return (
    <button type="button" onClick={onClick} className={cx('min-h-[44px] flex-1 rounded-xl border px-3 py-2 text-[14px] font-bold transition active:scale-[0.97]', on ? onStyle : 'border-navy-100 bg-white text-navy-600 hover:bg-navy-50')}>
      {children}
    </button>
  );
}

/** عدّاد + / − بقيم محددة (زوجية للضحى والرواتب، فردية للوتر) */
function Stepper({ value, values, onChange, zeroLabel }: { value: number; values: number[]; onChange: (v: number) => void; zeroLabel: string }) {
  const i = Math.max(0, values.findIndex((v) => v >= value));
  const btn = 'flex h-11 w-11 items-center justify-center rounded-xl border border-navy-100 bg-white text-navy-700 active:scale-95 disabled:opacity-30';
  return (
    <div className="flex items-center gap-3">
      <button type="button" className={btn} onClick={() => onChange(values[Math.max(0, i - 1)])} disabled={i === 0} aria-label="إنقاص">
        <Minus className="h-5 w-5" />
      </button>
      <span className="min-w-[4.5rem] text-center text-[20px] font-extrabold text-navy-900">{value ? value : <span className="text-[14px] font-bold text-navy-400">{zeroLabel}</span>}</span>
      <button type="button" className={btn} onClick={() => onChange(values[Math.min(values.length - 1, i + 1)])} disabled={i === values.length - 1} aria-label="زيادة">
        <Plus className="h-5 w-5" />
      </button>
      {value > 0 && <span className="text-[13px] text-navy-400">ركعات</span>}
    </div>
  );
}

const EVEN = [0, 2, 4, 6, 8, 10, 12];
const ODD = [0, 1, 3, 5, 7, 9, 11];

function Block({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2 border-t border-navy-50 pt-4 first:border-0 first:pt-0">
      <p className="text-[15px] font-bold text-navy-800">
        {title} {hint && <span className="text-[12px] font-normal text-navy-400">{hint}</span>}
      </p>
      {children}
    </div>
  );
}

/**
 * تعبئة جدول العبادات يومًا بيوم لولي الأمر (وللمشرف): أزرار أيام الأسبوع (السبت-الجمعة) وبطاقة لليوم المختار
 * بنفس بنود الجدول الأسبوعي، بأزرار كبيرة تناسب الموبايل.
 */
export default function WorshipDayForm({ studentId, worship }: { studentId: string; worship: DailyWorship[] }) {
  const { upsertDailyWorship } = useData();
  const toast = useToast();
  const [weekStart, setWeekStart] = useState(weekStartOf(TODAY));
  const dates = useMemo(() => weekDates(weekStart), [weekStart]);
  const saved = useMemo(() => new Map(worship.map((w) => [w.date, w])), [worship]);
  const pickDefault = (ds: string[]) => ds.find((d) => d <= TODAY && !saved.has(d)) ?? [...ds].reverse().find((d) => d <= TODAY) ?? ds[0];
  const [date, setDate] = useState(() => pickDefault(dates));
  const [d, setD] = useState<DayDraft>(() => saved.get(date) ?? blank(studentId, date));
  const [busy, setBusy] = useState(false);

  // تبديل اليوم ← تحميل المحفوظ له أو يوم فاضي
  useEffect(() => {
    setD(saved.get(date) ?? blank(studentId, date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, studentId]);

  const set = <K extends keyof DayDraft>(k: K, v: DayDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setPrayer = (k: PrayerKey, v: PrayerLocation) => setD((x) => ({ ...x, prayers: { ...x.prayers, [k]: v } }));

  const missing = [...PRAYER_ITEMS.filter((p) => !d.prayers[p.key]).map((p) => `صلاة ${p.label}`), ...(d.parentsSatisfaction === undefined ? ['رضا الوالدين'] : [])];
  const future = date > TODAY;
  const dayLabel = WEEKDAY_LABELS[dates.indexOf(date)] ?? '';
  const wird = wirdPages(d);
  // صدقة مسجّلة بيوم ثاني من نفس الأسبوع — علامتها محسوبة للأسبوع كامل
  const charityIdx = dates.findIndex((x) => x !== date && saved.get(x)?.charity);
  const charityDay = charityIdx >= 0 ? WEEKDAY_LABELS[charityIdx] : '';

  const goWeek = (n: number) => {
    const ws = addDays(weekStart, 7 * n);
    if (ws > weekStartOf(TODAY)) return;
    setWeekStart(ws);
    setDate(pickDefault(weekDates(ws)));
  };

  const save = async () => {
    if (missing.length || future) return;
    setBusy(true);
    try {
      const rec = { ...d, prayers: d.prayers as Record<PrayerKey, PrayerLocation>, parentsSatisfaction: d.parentsSatisfaction! };
      await upsertDailyWorship([rec]);
      toast(`تم حفظ عبادات يوم ${dayLabel}`);
      const next = dates.find((x) => x > date && x <= TODAY && !saved.has(x));
      if (next) setDate(next);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'تعذّر الحفظ، يُرجى المحاولة مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  const filledCount = dates.filter((x) => saved.has(x)).length;

  return (
    <section className="card space-y-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <button className="rounded-full p-2 text-navy-500 hover:bg-navy-50" onClick={() => goWeek(-1)} aria-label="الأسبوع السابق">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-[16px] font-extrabold text-navy-900">تعبئة جدول العبادات</p>
          <p className="text-[12px] text-navy-400">
            أسبوع {formatDayMonth(dates[0])} – {formatDayMonth(dates[dates.length - 1])} · تمّت تعبئة {filledCount} من {WEEK_DAYS} أيام
          </p>
        </div>
        <button className="rounded-full p-2 text-navy-500 hover:bg-navy-50 disabled:opacity-30" onClick={() => goWeek(1)} disabled={weekStart >= weekStartOf(TODAY)} aria-label="الأسبوع التالي">
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* أيام الأسبوع */}
      <div className="grid grid-cols-7 gap-1">
        {dates.map((x, i) => {
          const done = saved.has(x);
          return (
            <button
              key={x}
              disabled={x > TODAY}
              onClick={() => setDate(x)}
              className={cx(
                'flex min-w-0 flex-col items-center gap-0.5 rounded-xl border px-0.5 py-2 text-[11px] transition disabled:opacity-30 sm:text-[12px]',
                x === date ? 'border-navy-800 bg-navy-800 text-white' : done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-navy-100 bg-white text-navy-600',
              )}
            >
              <span className="w-full truncate text-center font-bold">{WEEKDAY_LABELS[i]}</span>
              <span className="text-[11px] opacity-80">{Number(x.slice(8))}</span>
              <span className="h-4 text-[11px]">{done ? '✓' : x === TODAY ? 'اليوم' : ''}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl bg-paper/60 p-3 sm:p-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[17px] font-extrabold text-navy-900">
            يوم {dayLabel} <span className="text-[13px] font-normal text-navy-400">{formatDayMonth(date)}</span>
          </p>
          {saved.has(date) && <span className="rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-bold text-emerald-800">محفوظ · {Math.round(dailyWorshipScore(saved.get(date)!))}%</span>}
        </div>

        <div className="space-y-4">
          <Block title="الصلوات" hint="(مكان أداء كل صلاة)">
            <div className="space-y-2">
              {PRAYER_ITEMS.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[14px] font-bold text-navy-700">{p.label}</span>
                  <Choice on={d.prayers[p.key] === 'mosque'} onClick={() => setPrayer(p.key, 'mosque')}>
                    في المسجد
                  </Choice>
                  <Choice on={d.prayers[p.key] === 'home'} tone="amber" onClick={() => setPrayer(p.key, 'home')}>
                    في البيت
                  </Choice>
                </div>
              ))}
            </div>
          </Block>

          <Block title="الأذكار" hint="(اختر الأذكار التي قالها)">
            <div className="flex gap-2">
              <Choice on={d.morningAdhkar} onClick={() => set('morningAdhkar', !d.morningAdhkar)}>
                {d.morningAdhkar && <Check className="ml-1 inline h-4 w-4" />}أذكار الصباح
              </Choice>
              <Choice on={d.eveningAdhkar} onClick={() => set('eveningAdhkar', !d.eveningAdhkar)}>
                {d.eveningAdhkar && <Check className="ml-1 inline h-4 w-4" />}أذكار المساء
              </Choice>
              <Choice on={d.sleepAdhkar} onClick={() => set('sleepAdhkar', !d.sleepAdhkar)}>
                {d.sleepAdhkar && <Check className="ml-1 inline h-4 w-4" />}أذكار النوم
              </Choice>
            </div>
          </Block>

          <Block title="صلاة الضحى" hint="(عدد الركعات)">
            <Stepper value={d.duhaRakahs} values={EVEN} onChange={(v) => set('duhaRakahs', v)} zeroLabel="لم يصلِّ" />
          </Block>

          <Block title="صلاة الوتر" hint="(عدد الركعات)">
            <Stepper value={d.witrRakahs} values={ODD} onChange={(v) => set('witrRakahs', v)} zeroLabel="لم يصلِّ" />
          </Block>

          <Block title="قيام الليل" hint="(اضغط إذا أدّاه)">
            <div className="flex gap-2">
              <Choice on={d.qiyam} onClick={() => set('qiyam', !d.qiyam)}>
                {d.qiyam && <Check className="ml-1 inline h-4 w-4" />}قيام الليل
              </Choice>
            </div>
          </Block>

          <Block title="السنن الرواتب" hint="(عدد الركعات من 12)">
            <Stepper value={d.rawatibRakahs} values={EVEN} onChange={(v) => set('rawatibRakahs', v)} zeroLabel="لم يصلِّ" />
          </Block>

          <Block title="ورد القراءة من المصحف">
            <div className="flex flex-wrap items-center gap-2 text-[14px] text-navy-600">
              من صفحة
              <input type="number" inputMode="numeric" min={1} max={604} className="input w-24 text-center" value={d.wirdFromPage ?? ''} onChange={(e) => set('wirdFromPage', e.target.value === '' ? undefined : Number(e.target.value))} aria-label="من صفحة" />
              إلى صفحة
              <input type="number" inputMode="numeric" min={1} max={604} className="input w-24 text-center" value={d.wirdToPage ?? ''} onChange={(e) => set('wirdToPage', e.target.value === '' ? undefined : Number(e.target.value))} aria-label="إلى صفحة" />
              {wird !== undefined && (
                <span className={cx('rounded-full px-3 py-1 text-[13px] font-bold', wird > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-burgundy-50 text-burgundy-700')}>
                  {wird > 0 ? `عدد الصفحات: ${wird}` : 'صفحة النهاية قبل صفحة البداية'}
                </span>
              )}
            </div>
          </Block>

          <Block title="الصدقة" hint="(تُحسب مرة واحدة في الأسبوع، ولا يُخصم عن الأيام التي لم يتصدّق فيها)">
            {charityDay && (
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">تم تسجيل صدقة هذا الأسبوع يوم {charityDay} ✓</p>
            )}
            <div className="flex gap-2">
              <Choice on={d.charity} onClick={() => set('charity', true)}>
                تصدّق اليوم
              </Choice>
              <Choice on={!d.charity} tone="navy" onClick={() => set('charity', false)}>
                لم يتصدّق
              </Choice>
            </div>
          </Block>

          {isFriday(date) && (
            <Block title="سورة الكهف" hint="(يوم الجمعة — اضغط إذا قرأها)">
              <div className="flex gap-2">
                <Choice on={d.kahf} onClick={() => set('kahf', !d.kahf)}>
                  {d.kahf && <Check className="ml-1 inline h-4 w-4" />}قراءة سورة الكهف
                </Choice>
              </div>
            </Block>
          )}

          <Block title="رضا الوالدين" hint="(علامة من 100)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                className="input w-28 text-center text-[20px] font-extrabold"
                value={d.parentsSatisfaction ?? ''}
                onChange={(e) => set('parentsSatisfaction', e.target.value === '' ? undefined : Math.max(0, Math.min(100, Math.round(Number(e.target.value)) || 0)))}
                placeholder="مثال: 90"
                aria-label="رضا الوالدين من 100"
              />
              <span className="text-[16px] font-bold text-navy-400">/ 100</span>
            </div>
          </Block>

          <Block title="ملاحظات" hint="(اختيارية)">
            <textarea className="input min-h-[60px]" value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="ملاحظة للمشرف" />
          </Block>
        </div>
      </div>

      {missing.length > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-800">يُرجى تحديد: {missing.join('، ')}</p>}
      <button className="btn-accent w-full py-3.5 text-[16px]" onClick={save} disabled={busy || missing.length > 0 || future}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} حفظ يوم {dayLabel}
      </button>
    </section>
  );
}
