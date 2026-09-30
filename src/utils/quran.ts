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
 * يرجع النص بصيغة موحّدة وعدد الصفحات، أو null إذا النص مش أرقام صفحات.
 */
export function parsePageRanges(raw: string): { text: string; pages: number } | null {
  const s = raw
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\s*(?:إلى|الى|لـ|ل|to|[-–—ـ~])\s*/gi, '-')
    .trim();
  if (!s) return null;
  const parts = s.split(/\s*[,،;+&]\s*|\s+و?\s*/).filter(Boolean);
  let pages = 0;
  const out: string[] = [];
  for (const p of parts) {
    const m = p.match(/^(\d{1,3})(?:-(\d{1,3}))?$/);
    if (!m) return null;
    const a = +m[1];
    const b = m[2] ? +m[2] : a;
    if (a < 1 || b < a || b > 604) return null;
    pages += b - a + 1;
    out.push(b === a ? `${a}` : `${a}-${b}`);
  }
  return { text: out.join('، '), pages };
}
