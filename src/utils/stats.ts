import type { CommitmentLevel, DailyWorship, SessionRecord } from '@/types';
import { round1 } from './format';
import { dailyWorshipScore } from './worship';

const attended = (s: SessionRecord) => s.attendance === 'present' || s.attendance === 'late';

const avg = (nums: number[]) => (nums.length ? round1(nums.reduce((a, b) => a + b, 0) / nums.length) : 0);

/** نسبة الحضور: الحاضر والمتأخر من مجموع الأيام (الغياب بعذر لا يُحتسب ضد الطالب) */
export function attendanceRate(list: SessionRecord[]) {
  const counted = list.filter((s) => s.attendance !== 'excused');
  if (!counted.length) return 100;
  return round1((counted.filter(attended).length / counted.length) * 100);
}

export const monthKey = (iso: string) => iso.slice(0, 7);

export function availableMonths(list: SessionRecord[]) {
  return [...new Set(list.map((s) => monthKey(s.date)))].sort().reverse();
}

const levelScore: Record<CommitmentLevel, number> = { excellent: 4, very_good: 3, good: 2, needs_work: 1 };
export function overallCommitment(list: SessionRecord[]): CommitmentLevel {
  const vals = list.filter((s) => s.commitment).slice(0, 8).map((s) => levelScore[s.commitment!]);
  const a = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 4;
  if (a >= 3.5) return 'excellent';
  if (a >= 2.75) return 'very_good';
  if (a >= 2) return 'good';
  return 'needs_work';
}

export interface StudentStats {
  cumulative: number;
  monthAverage: number;
  attendance: number;
  worship: number;
  lastScore?: number;
  lastSession?: SessionRecord;
  lastAttended?: SessionRecord;
  memorization: number; // متوسط تقييم التسميع
  revision: number;
  commitment: CommitmentLevel;
  trend: { date: string; score: number }[];
  sessionsCount: number;
}

/** الإحصائيات الكاملة لطالب (السجلات مرتبة من الأحدث للأقدم) */
export function studentStats(all: SessionRecord[], dailyWorship: DailyWorship[], studentId: string, month?: string): StudentStats {
  const list = all.filter((s) => s.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));
  const scored = list.filter((s) => attended(s) && typeof s.score === 'number');
  const m = month ?? (list[0] ? monthKey(list[0].date) : '');
  const inMonth = scored.filter((s) => monthKey(s.date) === m);
  const worshipDays = dailyWorship.filter((d) => d.studentId === studentId && monthKey(d.date) === m);
  return {
    cumulative: avg(scored.map((s) => s.score!)),
    monthAverage: avg(inMonth.map((s) => s.score!)),
    attendance: attendanceRate(list),
    worship: avg(worshipDays.map((d) => dailyWorshipScore(d))),
    lastScore: scored[0]?.score,
    lastSession: list[0],
    lastAttended: scored[0],
    memorization: avg(scored.filter((s) => s.memorization).map((s) => s.memorization!.grade)),
    revision: avg(scored.filter((s) => s.revision).map((s) => s.revision!.grade)),
    commitment: overallCommitment(scored),
    trend: scored.slice(0, 8).reverse().map((s) => ({ date: s.date, score: s.score! })),
    sessionsCount: list.length,
  };
}

export interface RangeStats {
  average: number;
  attendance: number;
  worship: number;
  sessionsCount: number;
}

/** إحصائيات طالب خلال فترة زمنية محددة (from/to شاملتان) — تُستخدم بالتقارير ولوحة الشرف */
export function studentStatsInRange(all: SessionRecord[], dailyWorship: DailyWorship[], studentId: string, from: string, to: string): RangeStats {
  const list = all.filter((s) => s.studentId === studentId && s.date >= from && s.date <= to);
  const scored = list.filter((s) => attended(s) && typeof s.score === 'number');
  const worshipDays = dailyWorship.filter((d) => d.studentId === studentId && d.date >= from && d.date <= to);
  return {
    average: avg(scored.map((s) => s.score!)),
    attendance: attendanceRate(list),
    worship: avg(worshipDays.map((d) => dailyWorshipScore(d))),
    sessionsCount: list.length,
  };
}

export function studentSessions(all: SessionRecord[], studentId: string) {
  return all.filter((s) => s.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));
}

/** معادلة العلامة المقترحة: حضور 10% + حفظ 30% + مراجعة 30% + عبادات 20% + تقييم 10% */
export function suggestScore(input: {
  attendance: SessionRecord['attendance'];
  memGrade?: number;
  revGrade?: number;
  weekWorship?: number; // علامة أسبوع العبادات (سبت-خميس) المرتبط بهذا اليوم، من 100
  evaluation?: number; // 0..100
}) {
  if (input.attendance === 'absent' || input.attendance === 'excused') return 0;
  const att = input.attendance === 'late' ? 6 : 10;
  const mem = input.memGrade ?? input.revGrade ?? 0;
  const rev = input.revGrade ?? input.memGrade ?? 0;
  const w = input.weekWorship ?? 0;
  const ev = input.evaluation ?? 90;
  return Math.round(att + mem * 0.3 + rev * 0.3 + w * 0.2 + ev * 0.1);
}

/** هل الصورة ما زالت ضمن مدة العرض في السلايد شو؟ */
export function isActivityLive(a: { date: string; durationDays: number }, today: string) {
  const start = new Date(`${a.date}T12:00:00`).getTime();
  const now = new Date(`${today}T12:00:00`).getTime();
  const diff = Math.round((now - start) / 86_400_000);
  return diff >= 0 && diff < a.durationDays;
}
