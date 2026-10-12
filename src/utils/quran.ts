import type { CompletionStatus } from '@/types';
import { round1 } from './format';

/** نسبة الإنجاز = المنجز÷المطلوب×100، محسوبة دائمًا وليست مُدخلة يدويًا. آمنة إن كان المطلوب صفرًا. */
export function completionPercent(requiredPages: number, completedPages: number): number {
  if (!requiredPages || requiredPages <= 0) return completedPages > 0 ? 100 : 0;
  return round1(Math.max(0, Math.min(100, (completedPages / requiredPages) * 100)));
}

/** حالة الإنجاز المشتقة من النسبة: أتم المطلوب / أنجز جزئيًا / لم ينجز */
export function completionStatus(completion: number): CompletionStatus {
  if (completion >= 100) return 'completed';
  if (completion <= 0) return 'not_done';
  return 'partial';
}

export const completionStatusLabels: Record<CompletionStatus, string> = {
  completed: 'أتمّ المطلوب',
  partial: 'أنجز جزئيًا',
  not_done: 'لم يُنجز',
};

export const completionStatusTone: Record<CompletionStatus, 'green' | 'gold' | 'burgundy'> = {
  completed: 'green',
  partial: 'gold',
  not_done: 'burgundy',
};

/**
 * جزء (حفظ/مراجعة) مطلوب فعلًا من الطالب؟ مطلوب إذا فيه عدد صفحات مطلوبة، أو مكتوب شو المطلوب (نص)،
 * أو سمّع شيء. الجزء الفاضي من كل هذا = غير مطلوب أصلًا، فلا يظهر ولا يدخل بأي حساب (بدل ما ينحسب له 0% ظلمًا).
 * والمطلوب المكتوب نصًا بلا تسميع يبقى محفوظًا ويُحسب إنجازه 0 — عشان يضل معروف شو كان مطلوب منه.
 */
export function isAssigned(p: { required?: string; requiredPages?: number; completedPages?: number; recited?: string; revised?: string } | null | undefined) {
  return !!p && ((p.requiredPages ?? 0) > 0 || (p.completedPages ?? 0) > 0 || !!(p.required ?? '').trim() || !!(p.recited ?? p.revised ?? '').trim());
}

/**
 * أرقام الصفحات المسمّعة بصيغة مرنة: "415-416" أو "415 - 416" أو "415 إلى 416" أو "12, 15-16" أو أرقام عربية.
 * يرجع النص بصيغة موحّدة وعدد الصفحات وقائمة الصفحات نفسها، أو null إذا النص مش أرقام صفحات.
 * الصفحة المكررة بأكثر من مقطع ("1-5، 3-6") تُحسب مرة واحدة فقط.
 */
export function parsePageRanges(raw: string): { text: string; pages: number; list: number[] } | null {
  const s = raw
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s*(?:إلى|الى|لـ|ل|to|[-–—ـ~])\s*/gi, '-')
    .trim();
  if (!s) return null;
  const parts = s.split(/\s*[,،;+&]\s*|\s+و?\s*/).filter(Boolean);
  const set = new Set<number>();
  const out: string[] = [];
  for (const p of parts) {
    const m = p.match(/^(\d{1,3})(?:-(\d{1,3}))?$/);
    if (!m) return null;
    const a = +m[1];
    const b = m[2] ? +m[2] : a;
    if (a < 1 || b < a || b > 604) return null;
    for (let i = a; i <= b; i++) set.add(i);
    out.push(b === a ? `${a}` : `${a}-${b}`);
  }
  return { text: out.join('، '), pages: set.size, list: [...set].sort((x, y) => x - y) };
}

/** التسميع معتمد؟ السجلات القديمة (بلا حقل اعتماد) تُعتبر معتمدة */
export const isApproved = (p: { approved?: boolean } | null | undefined) => p?.approved !== false;

/**
 * المصدر الموحّد لنسبة إنجاز الحفظ/المراجعة بيوم دوام (من 100):
 *   المنجز المعتمد ÷ المطلوب × 100 — والتسميع غير المعتمد لا يُحسب منجزًا (0).
 * كل الموقع يقرأ e.completion، وهي تُعاد حسابها من هنا عند القراءة من قاعدة البيانات وعند الحفظ،
 * فلا يوجد مكان ثاني يحسبها بمنطق مختلف.
 */
export function entryCompletion(p: { requiredPages: number; completedPages: number; approved?: boolean }): number {
  return isApproved(p) ? completionPercent(p.requiredPages, p.completedPages) : 0;
}

/** هل للجزء مقدار محدد (عدد صفحات مطلوبة)؟ بدونه لا نعرض نسبة إنجاز قد تكون مضللة */
export const hasMeasure = (p: { requiredPages?: number } | null | undefined) => (p?.requiredPages ?? 0) > 0;

/**
 * تقصير جزء (حفظ/مراجعة) عن عدد الصفحات المطلوبة: null إذا أتمّ المطلوب (معتمدًا) أو لم يُحدَّد عدد صفحات.
 * pending = سمّع صفحات لكن التسميع لم يُعتمد بعد — يُميَّز عن "لم يسمّع".
 * يُستخدم لإبراز التقصير لولي الأمر (سمّع كذا من أصل كذا).
 */
export function pageShortfall(p: { requiredPages?: number; completedPages?: number; approved?: boolean } | null | undefined) {
  const required = p?.requiredPages ?? 0;
  const recited = p?.completedPages ?? 0;
  const done = isApproved(p) ? recited : 0;
  if (required <= 0 || done >= required) return null;
  return { required, done, missing: required - done, none: done <= 0, pending: !isApproved(p) && recited > 0 ? recited : 0 };
}

/* ---------------- الأجزاء (مصحف المدينة، 604 صفحات) ---------------- */

/** صفحات الجزء: الأول 1–21، والأجزاء 2–29 كل جزء 20 صفحة، والثلاثون 582–604 */
export function juzPages(n: number): [from: number, to: number] {
  const from = n === 1 ? 1 : 20 * (n - 1) + 2;
  const to = n === 30 ? 604 : 20 * n + 1;
  return [from, to];
}
