import type { AttendanceStatus, CommitmentLevel } from '@/types';

export const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const toDate = (iso: string) => new Date(`${iso}T12:00:00`);

/** 22 سبتمبر 2026 */
export function formatDate(iso: string) {
  const d = toDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
/** 22 سبتمبر */
export function formatDayMonth(iso: string) {
  const d = toDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
/** الثلاثاء 22 سبتمبر 2026 */
export function formatLongDate(iso: string) {
  return `${WEEKDAYS[toDate(iso).getDay()]} ${formatDate(iso)}`;
}
export function weekday(iso: string) {
  return WEEKDAYS[toDate(iso).getDay()];
}
/** 22/09/2026 */
export function formatNumericDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
/** 2026-09 → سبتمبر 2026 */
export function formatMonthKey(key: string) {
  const [y, m] = key.split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((toDate(toIso).getTime() - toDate(fromIso).getTime()) / 86_400_000);
}

export function remainingLabel(days: number) {
  if (days < 0) return 'انتهى موعد الدوام';
  if (days === 0) return 'الدوام اليوم';
  if (days === 1) return 'متبقي يوم واحد على الدوام';
  if (days === 2) return 'متبقي يومان على الدوام';
  if (days <= 10) return `متبقي ${days} أيام على الدوام`;
  return `متبقي ${days} يومًا على الدوام`;
}

/** منذ 5 دقائق / منذ 3 ساعات / منذ يومين — لأوقات الإشعارات */
export function timeAgo(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return 'الآن';
  if (min === 1) return 'منذ دقيقة';
  if (min === 2) return 'منذ دقيقتين';
  if (min < 60) return min <= 10 ? `منذ ${min} دقائق` : `منذ ${min} دقيقة`;
  const h = Math.round(min / 60);
  if (h === 1) return 'منذ ساعة';
  if (h === 2) return 'منذ ساعتين';
  if (h < 24) return h <= 10 ? `منذ ${h} ساعات` : `منذ ${h} ساعة`;
  const d = Math.round(h / 24);
  return d === 1 ? 'منذ يوم' : d === 2 ? 'منذ يومين' : `منذ ${d} أيام`;
}

export const pct =(n: number, digits = 1) => `${Number.isInteger(n) ? n : n.toFixed(digits)}%`;
export const round1 = (n: number) => Math.round(n * 10) / 10;

export const attendanceLabels: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absent: 'غائب',
  excused: 'غائب بعذر',
  late: 'متأخر',
};

export const commitmentLabels: Record<CommitmentLevel, string> = {
  excellent: 'ممتاز',
  very_good: 'جيد جدًا',
  good: 'جيد',
  needs_work: 'يحتاج متابعة',
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/** العمر بالسنوات الكاملة من تاريخ الميلاد (YYYY-MM-DD) حتى تاريخ مرجعي، أو null إن لم يُدخل */
export function ageYears(birthDate: string | undefined, today: string): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}/.test(birthDate)) return null;
  const [by, bm, bd] = birthDate.slice(0, 10).split('-').map(Number);
  const [ty, tm, td] = today.slice(0, 10).split('-').map(Number);
  const age = ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
  return age >= 0 ? age : null;
}

/** "سنة" / "سنتان" / "7 سنوات" / "12 سنة" */
export function ageLabel(n: number) {
  if (n === 1) return 'سنة';
  if (n === 2) return 'سنتان';
  if (n >= 3 && n <= 10) return `${n} سنوات`;
  return `${n} سنة`;
}
