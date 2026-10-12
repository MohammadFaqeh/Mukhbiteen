/**
 * المصدر الموحّد لحساب إنجاز المطلوبات — تستخدمه صفحة الإدارة وصفحة الطالب وواجهة ولي الأمر وإحصائيات المجموعة.
 *
 * نسبة الإنجاز = المقدار المنجز والمعتمد ÷ المقدار المطلوب × 100
 *  - مطلوب بنطاق (مثلًا الآيات 1–20): المنجز = عدد الآيات/الصفحات المعتمدة داخل النطاق بدون تكرار
 *    (تسميع الآيات 1–10 مرتين يبقى 10 آيات).
 *  - مطلوب بعدد فقط (مثلًا 3 أحاديث): المنجز = مجموع المقادير المعتمدة (بحد أقصى المطلوب).
 *  - مطلوب بلا مقدار: لا تُولَّد نسبة (percent = undefined) والحالة تحددها الإدارة.
 * التسميع غير المعتمد يظهر منفصلًا (pending) ولا يدخل بالنسبة.
 *
 * التقصير: المطلوب "متأخر" فقط إذا تجاوز تاريخ الاستحقاق ولم يكتمل — قبل الاستحقاق لا يُعتبر الطالب مقصرًا.
 */
import type { Assignment, AssignmentCategory, AssignmentStatus, AssignmentStoredStatus, AssignmentUnit, SessionRecord } from '@/types';
import { pageShortfall } from './quran';

export const unitLabels: Record<AssignmentUnit, { one: string; many: string }> = {
  page: { one: 'صفحة', many: 'صفحات' },
  ayah: { one: 'آية', many: 'آيات' },
  hadith: { one: 'حديث', many: 'أحاديث' },
  item: { one: 'بند', many: 'بنود' },
};

export const categoryLabels: Record<AssignmentCategory, string> = {
  memorization: 'حفظ قرآن',
  revision: 'مراجعة',
  other: 'مطلوب آخر',
};

export const statusLabels: Record<AssignmentStatus, string> = {
  not_started: 'لم يبدأ',
  in_progress: 'قيد الإنجاز',
  completed: 'مكتمل',
  overdue: 'متأخر',
};

export const statusTone: Record<AssignmentStatus, 'gray' | 'amber' | 'green' | 'burgundy'> = {
  not_started: 'gray',
  in_progress: 'amber',
  completed: 'green',
  overdue: 'burgundy',
};

export const amountLabel = (n: number, unit?: AssignmentUnit) => (unit ? `${n} ${n === 1 ? unitLabels[unit].one : unitLabels[unit].many}` : String(n));

export type Measure = 'range' | 'amount' | 'none';
export const measureOf = (a: Pick<Assignment, 'unit' | 'rangeFrom' | 'rangeTo' | 'targetAmount'>): Measure =>
  !a.unit ? 'none' : a.rangeFrom !== undefined && a.rangeTo !== undefined && a.rangeTo >= a.rangeFrom ? 'range' : (a.targetAmount ?? 0) > 0 ? 'amount' : 'none';

/** ضغط أرقام متتالية إلى نطاقات: [1,2,3,7,8] ← [[1,3],[7,8]] */
function toRanges(nums: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const n of [...nums].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && n === last[1] + 1) last[1] = n;
    else out.push([n, n]);
  }
  return out;
}

export const rangesText = (r: [number, number][]) => r.map(([a, b]) => (a === b ? `${a}` : `${a}–${b}`)).join('، ');

export interface AssignmentProgressInfo {
  measure: Measure;
  required?: number;
  done: number; // المعتمد
  pending: number; // سُمّع ولم يُعتمد (وليس ضمن المعتمد)
  percent?: number; // من 100 — غير موجودة للمطلوب بلا مقدار
  doneRanges: [number, number][];
  remainingRanges: [number, number][];
  status: AssignmentStatus; // الحالة المعروضة (تشمل "متأخر")
  stored: AssignmentStoredStatus; // الحالة بدون التأخر (تُحفظ بقاعدة البيانات للإشعارات)
  overdue: boolean;
  lastRecitedAt?: string;
}

/** إنجاز طالب واحد على مطلوب واحد */
export function assignmentProgress(a: Assignment, studentId: string, today: string): AssignmentProgressInfo {
  const measure = measureOf(a);
  const entries = a.progress.filter((p) => p.studentId === studentId);
  const lastRecitedAt = entries.reduce<string | undefined>((m, p) => (!m || p.date > m ? p.date : m), undefined);
  let required: number | undefined;
  let done = 0;
  let pending = 0;
  let doneRanges: [number, number][] = [];
  let remainingRanges: [number, number][] = [];

  if (measure === 'range') {
    const from = a.rangeFrom!;
    const to = a.rangeTo!;
    required = to - from + 1;
    const ok = new Set<number>();
    const waiting = new Set<number>();
    for (const p of entries) {
      if (p.rangeFrom === undefined) continue;
      const pf = Math.max(from, p.rangeFrom);
      const pt = Math.min(to, p.rangeTo ?? p.rangeFrom);
      for (let i = pf; i <= pt; i++) (p.approved ? ok : waiting).add(i);
    }
    done = ok.size;
    pending = [...waiting].filter((i) => !ok.has(i)).length;
    doneRanges = toRanges([...ok]);
    const rest: number[] = [];
    for (let i = from; i <= to; i++) if (!ok.has(i)) rest.push(i);
    remainingRanges = toRanges(rest);
  } else if (measure === 'amount') {
    required = a.targetAmount!;
    done = Math.min(required, entries.filter((p) => p.approved).reduce((s, p) => s + (p.amount ?? 0), 0));
    pending = entries.filter((p) => !p.approved).reduce((s, p) => s + (p.amount ?? 0), 0);
  }

  const manual = a.targets.find((t) => t.studentId === studentId)?.status ?? 'not_started';
  const stored: AssignmentStoredStatus =
    measure === 'none' ? manual : required && done >= required ? 'completed' : done > 0 || pending > 0 ? 'in_progress' : 'not_started';
  const overdue = stored !== 'completed' && !!a.dueDate && a.dueDate < today;
  return {
    measure,
    required,
    done,
    pending,
    percent: required ? Math.round((done / required) * 1000) / 10 : undefined,
    doneRanges,
    remainingRanges,
    status: overdue ? 'overdue' : stored,
    stored,
    overdue,
    lastRecitedAt,
  };
}

/** وصف المقدار المطلوب: "الآيات 1–20" أو "3 أحاديث" */
export function requiredText(a: Assignment) {
  const m = measureOf(a);
  if (m === 'range') return `${a.unit === 'page' ? 'الصفحات' : a.unit === 'ayah' ? 'الآيات' : unitLabels[a.unit!].many} ${a.rangeFrom}–${a.rangeTo}`;
  if (m === 'amount') return amountLabel(a.targetAmount!, a.unit);
  return '';
}

/** المطلوبات الخاصة بطالب (للأهل: الظاهرة لهم فقط) */
export function studentAssignments(all: Assignment[], studentId: string, parentView = false) {
  return all.filter((a) => a.targets.some((t) => t.studentId === studentId) && (!parentView || a.visibleToParents));
}

/**
 * الالتزام بالمطلوبات لطالب: من المطلوبات التي حلّ موعد استحقاقها (أو اكتملت)، كم نسبة المكتمل منها.
 * undefined = لا يوجد مطلوب مستحق بعد (فلا يُحكم عليه).
 */
export function assignmentCommitment(all: Assignment[], studentId: string, today: string) {
  const due = studentAssignments(all, studentId)
    .map((a) => ({ a, p: assignmentProgress(a, studentId, today) }))
    .filter(({ a, p }) => p.stored === 'completed' || (!!a.dueDate && a.dueDate < today));
  if (!due.length) return undefined;
  return Math.round((due.filter(({ p }) => p.stored === 'completed').length / due.length) * 1000) / 10;
}

/**
 * هل الطالب ملتزم أم مقصّر بالتسميع؟ (لولي الأمر)
 *  - مقصّر إذا: عنده مطلوب تجاوز موعد استحقاقه ولم يكتمل، أو آخر يوم دوام حضره فيه تقصير عن الصفحات المطلوبة
 *    (يوم الدوام نفسه هو موعد استحقاق مطلوبه، فالتقصير فيه تقصير فعلي).
 *  - المطلوب الذي لم يحن موعده لا يُعتبر تقصيرًا مهما كان إنجازه.
 */
export function recitationStanding(sessions: SessionRecord[], assignments: Assignment[], studentId: string, today: string, parentView = true) {
  const mine = studentAssignments(assignments, studentId, parentView).map((a) => ({ a, p: assignmentProgress(a, studentId, today) }));
  const overdue = mine.filter(({ p }) => p.overdue);
  const lastSession = sessions
    .filter((s) => s.studentId === studentId && (s.attendance === 'present' || s.attendance === 'late'))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const memShort = lastSession ? pageShortfall(lastSession.memorization) : null;
  const revShort = lastSession ? pageShortfall(lastSession.revision) : null;
  const recitedDates = [
    ...sessions.filter((s) => s.studentId === studentId && ((s.memorization?.completedPages ?? 0) > 0 || (s.revision?.completedPages ?? 0) > 0)).map((s) => s.date),
    ...mine.flatMap(({ a }) => a.progress.filter((p) => p.studentId === studentId).map((p) => p.date)),
  ];
  return {
    behind: overdue.length > 0 || !!memShort || !!revShort,
    overdue,
    lastSession,
    memShort,
    revShort,
    lastRecitedAt: recitedDates.sort().reverse()[0] as string | undefined,
  };
}
