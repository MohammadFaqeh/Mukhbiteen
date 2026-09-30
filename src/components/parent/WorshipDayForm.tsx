import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Minus, Plus, Save } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import type { DailyWorship, PrayerKey, PrayerLocation } from '@/types';
import { PRAYER_ITEMS, WEEKDAY_LABELS, dailyWorshipScore, weekDates, weekStartOf } from '@/utils/worship';
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
 * تعبئة جدول العبادات يومًا بيوم لولي الأمر (وللمشرف): أزرار أيام الأسبوع (السبت-الخميس) وبطاقة لليوم المختار
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
      toast(`تم حفظ عبادات يوم ${dayLabel} ✓`);
      const next = dates.find((x) => x > date && x <= TODAY && !saved.has(x));
      if (next) setDate(next);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'تعذّر الحفظ، حاول مرة ثانية.');
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
          <p className="text-[16px] font-extrabold text-navy-900">تعبئة العبادات</p>
          <p className="text-[12px] text-navy-400">
            أسبوع {formatDayMonth(dates[0])} – {formatDayMonth(dates[5])} · تعبّى {filledCount} من 6 أيام
          </p>
        </div>
        <button className="rounded-full p-2 text-navy-500 hover:bg-navy-50 disabled:opacity-30" onClick={() => goWeek(1)} disabled={weekStart >= weekStartOf(TODAY)} aria-label="الأسبوع التالي">
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* أيام الأسبوع */}
      <div className="grid grid-cols-6 gap-1.5">
        {dates.map((x, i) => {
          const done = saved.has(x);
          return (
            <button
              key={x}
              disabled={x > TODAY}
              onClick={() => setDate(x)}
              className={cx(
                'flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-[12px] transition disabled:opacity-30',
                x === date ? 'border-navy-800 bg-navy-800 text-white' : done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-navy-100 bg-white text-navy-600',
              )}
            >
              <span className="font-bold">{WEEKDAY_LABELS[i]}</span>
              <span className="text-[11px] opacity-80">{formatDayMonth(x)}</span>
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
          <Block title="الصلوات" hint="(وين صلّى كل صلاة؟)">
            <div className="space-y-2">
              {PRAYER_ITEMS.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[14px] font-bold text-navy-700">{p.label}</span>
                  <Choice on={d.prayers[p.key] === 'mosque'} onClick={() => setPrayer(p.key, 'mosque')}>
                    بالمسجد
                  </Choice>
                  <Choice on={d.prayers[p.key] === 'home'} tone="amber" onClick={() => setPrayer(p.key, 'home')}>
                    بالبيت
                  </Choice>
                  <Choice on={d.prayers[p.key] === 'missed'} tone="red" onClick={() => setPrayer(p.key, 'missed')}>
                    ما صلّى
                  </Choice>
                </div>
              ))}
            </div>
          </Block>

          <Block title="الأذكار" hint="(اكبس على اللي قالها)">
            <div className="flex gap-2">
              <Choice on={d.morningAdhkar} onClick={() => set('morningAdhkar', !d.morningAdhkar)}>
                {d.morningAdhkar && <Check className="ml-1 inline h-4 w-4" />}الصباح
              </Choice>
              <Choice on={d.eveningAdhkar} onClick={() => set('eveningAdhkar', !d.eveningAdhkar)}>
                {d.eveningAdhkar && <Check className="ml-1 inline h-4 w-4" />}المساء
              </Choice>
              <Choice on={d.sleepAdhkar} onClick={() => set('sleepAdhkar', !d.sleepAdhkar)}>
                {d.sleepAdhkar && <Check className="ml-1 inline h-4 w-4" />}النوم
              </Choice>
            </div>
          </Block>

          <Block title="صلاة الضحى">
            <div className="flex gap-2">
              {[0, 2, 4, 6, 8].map((n) => (
                <Choice key={n} on={d.duhaRakahs === n} tone={n ? 'green' : 'red'} onClick={() => set('duhaRakahs', n)}>
                  {n ? `${n}` : 'ما صلّى'}
                </Choice>
              ))}
            </div>
          </Block>

          <Block title="الوتر">
            <div className="flex gap-2">
              {[0, 1, 3, 5].map((n) => (
                <Choice key={n} on={d.witrRakahs === n} tone={n ? 'green' : 'red'} onClick={() => set('witrRakahs', n)}>
                  {n ? `${n}` : 'ما صلّى'}
                </Choice>
              ))}
            </div>
          </Block>

          <Block title="قيام الليل">
            <div className="flex gap-2">
              <Choice on={d.qiyam} onClick={() => set('qiyam', true)}>
                قام
              </Choice>
              <Choice on={!d.qiyam} tone="red" onClick={() => set('qiyam', false)}>
                ما قام
              </Choice>
            </div>
          </Block>

          <Block title="السنن الرواتب" hint="(كم ركعة من 12)">
            <div className="flex items-center gap-3">
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-navy-100 bg-white text-navy-700 active:scale-95" onClick={() => set('rawatibRakahs', Math.max(0, d.rawatibRakahs - 2))} aria-label="أقل">
                <Minus className="h-5 w-5" />
              </button>
              <span className="w-16 text-center text-[22px] font-extrabold text-navy-900">{d.rawatibRakahs}</span>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl border border-navy-100 bg-white text-navy-700 active:scale-95" onClick={() => set('rawatibRakahs', Math.min(12, d.rawatibRakahs + 2))} aria-label="أكثر">
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </Block>

          <Block title="ورد القراءة من المصحف" hint="(اختياري)">
            <div className="flex items-center gap-2 text-[14px] text-navy-600">
              من صفحة
              <input type="number" inputMode="numeric" min={1} max={604} className="input w-24 text-center" value={d.wirdFromPage ?? ''} onChange={(e) => set('wirdFromPage', e.target.value === '' ? undefined : Number(e.target.value))} />
              إلى
              <input type="number" inputMode="numeric" min={1} max={604} className="input w-24 text-center" value={d.wirdToPage ?? ''} onChange={(e) => set('wirdToPage', e.target.value === '' ? undefined : Number(e.target.value))} />
            </div>
          </Block>

          <Block title="الصدقة">
            <div className="flex gap-2">
              <Choice on={d.charity} onClick={() => set('charity', true)}>
                تصدّق اليوم
              </Choice>
              <Choice on={!d.charity} tone="navy" onClick={() => set('charity', false)}>
                لا
              </Choice>
            </div>
          </Block>

          <Block title="رضا الوالدين عنه اليوم">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [100, 'راضيين تمامًا'],
                [75, 'راضيين'],
                [50, 'متوسط'],
                [25, 'مش راضيين'],
              ].map(([v, label]) => (
                <Choice key={v} on={d.parentsSatisfaction === v} tone={(v as number) >= 75 ? 'green' : (v as number) >= 50 ? 'amber' : 'red'} onClick={() => set('parentsSatisfaction', v as number)}>
                  {label}
                </Choice>
              ))}
            </div>
          </Block>

          <Block title="ملاحظة" hint="(اختياري)">
            <textarea className="input min-h-[60px]" value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="أي شي حابب يعرفه المشرف" />
          </Block>
        </div>
      </div>

      {missing.length > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] text-amber-800">باقي تختار: {missing.join('، ')}</p>}
      <button className="btn-accent w-full py-3.5 text-[16px]" onClick={save} disabled={busy || missing.length > 0 || future}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} حفظ يوم {dayLabel}
      </button>
    </section>
  );
}
