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

export const pct = (n: number, digits = 1) => `${Number.isInteger(n) ? n : n.toFixed(digits)}%`;
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
