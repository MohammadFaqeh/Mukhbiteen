import type { DailyWorship, PrayerKey } from '@/types';
import { round1 } from './format';

export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const PRAYER_ITEMS: { key: PrayerKey; label: string }[] = [
  { key: 'fajr', label: 'الفجر' },
  { key: 'dhuhr', label: 'الظهر' },
  { key: 'asr', label: 'العصر' },
  { key: 'maghrib', label: 'المغرب' },
  { key: 'isha', label: 'العشاء' },
];

/** أيام أسبوع العبادات المتابَعة (السبت..الخميس) – الجمعة يوم الدوام بالمركز ويُقيَّم مباشرة هناك */
export const WEEKDAY_LABELS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** بداية أسبوع العبادات (يوم السبت) الذي يقع فيه هذا التاريخ */
export function weekStartOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const shift = (d.getDay() + 1) % 7; // السبت=6→0، الأحد=0→1، ...الجمعة=5→6
  d.setDate(d.getDate() - shift);
  return d.toISOString().slice(0, 10);
}

/** الأيام الستة لأسبوع العبادات بدءًا من تاريخ السبت المعطى */
export function weekDates(weekStart: string): string[] {
  const out: string[] = [];
  const d = new Date(`${weekStart}T12:00:00`);
  for (let i = 0; i < 6; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function emptyDailyWorship(studentId: string, date: string): DailyWorship {
  return {
    id: `${studentId}-${date}`,
    studentId,
    date,
    prayers: { fajr: 'mosque', dhuhr: 'mosque', asr: 'mosque', maghrib: 'mosque', isha: 'mosque' },
    morningAdhkar: true,
    eveningAdhkar: true,
    sleepAdhkar: true,
    duhaRakahs: 2,
    qiyam: false,
    witrRakahs: 1,
    rawatibRakahs: 0,
    parentsSatisfaction: 100,
    wirdFromPage: undefined,
    wirdToPage: undefined,
    charity: false,
    notes: '',
  };
}

/**
 * علامة اليوم من 100: الصلوات 50 (المسجد 10 لكل صلاة، البيت 6) + 3 أذكار 15 (5 لكل ذكر)
 * + الضحى 5 + قيام الليل 5 + الوتر 5 + السنن الرواتب 5 (نسبيًا من 12) + رضا الوالدين 10 + ورد القراءة 5
 */
export function dailyWorshipScore(d: DailyWorship): number {
  const prayerPts = PRAYER_KEYS.reduce((sum, k) => sum + (d.prayers[k] === 'mosque' ? 10 : d.prayers[k] === 'home' ? 6 : 0), 0);
  const adhkarPts = [d.morningAdhkar, d.eveningAdhkar, d.sleepAdhkar].filter(Boolean).length * 5;
  const duhaPts = d.duhaRakahs > 0 ? 5 : 0;
  const qiyamPts = d.qiyam ? 5 : 0;
  const witrPts = d.witrRakahs > 0 ? 5 : 0;
  const rawatibPts = (clamp(d.rawatibRakahs, 0, 12) / 12) * 5;
  const parentsPts = (clamp(d.parentsSatisfaction, 0, 100) / 100) * 10;
  const wirdPts = d.wirdFromPage != null && d.wirdToPage != null && d.wirdToPage > d.wirdFromPage ? 5 : 0;
  return round1(clamp(prayerPts + adhkarPts + duhaPts + qiyamPts + witrPts + rawatibPts + parentsPts + wirdPts, 0, 100));
}

/** علامة الأسبوع: متوسط الأيام المسجَّلة + مكافأة صغيرة إن تصدّق مرة خلال الأسبوع */
export function weekWorshipScore(days: DailyWorship[]): number {
  if (!days.length) return 0;
  const avg = days.reduce((a, d) => a + dailyWorshipScore(d), 0) / days.length;
  const bonus = days.some((d) => d.charity) ? 3 : 0;
  return round1(clamp(avg + bonus, 0, 100));
}

/** عدد صفحات ورد اليوم (نظرًا عن المصحف)، أو undefined إن لم يُسجَّل */
export function wirdPages(d: DailyWorship): number | undefined {
  if (d.wirdFromPage == null || d.wirdToPage == null) return undefined;
  return Math.max(0, d.wirdToPage - d.wirdFromPage);
}
