/**
 * حساب الأجزاء المحفوظة — سجل لكل جزء (رقم الجزء + مصدره + تاريخ إتمامه) بدل عدّاد رقمي:
 *   memorizedJuz         مجموعة أرقام الأجزاء (Set) — الجزء لا يُحسب مرتين مهما تكرر تسميعه
 *   memorizedJuzSources  مصدر كل جزء: محفوظ سابقًا (prior) / أُتمّ يدويًا (manual) / أُتمّ تلقائيًا (auto)
 *   memorizedJuzDates    تاريخ الإتمام (يُكتب على الشهادة)
 *
 * الإتمام التلقائي: الجزء يُعتبر مكتملًا فقط إذا كانت كل صفحاته (مصحف المدينة) مسمّعة حفظًا جديدًا بتسميع معتمد —
 * من خانة "ما تم تسميعه" بأيام الدوام (أرقام صفحات مثل 582-583) ومن سجل إنجاز مطلوبات الحفظ بالصفحات.
 * مجرد إضافة تسميع لا يزيد العدد: لازم اكتمال كل صفحات الجزء واعتمادها.
 */
import type { Assignment, JuzSource, SessionRecord, Student } from '@/types';
import { isApproved, juzPages, parsePageRanges } from './quran';

export const JUZ_COUNT = 30;

/** الصفحات المسمّعة حفظًا بتسميع معتمد، مع تاريخ أول تسميع معتمد لكل صفحة */
export function approvedMemorizedPages(sessions: SessionRecord[], assignments: Assignment[], studentId: string) {
  const firstDate = new Map<number, string>();
  const add = (page: number, date: string) => {
    const prev = firstDate.get(page);
    if (!prev || date < prev) firstDate.set(page, date);
  };
  for (const s of sessions) {
    if (s.studentId !== studentId || !s.memorization || !isApproved(s.memorization)) continue;
    if (s.attendance !== 'present' && s.attendance !== 'late') continue;
    parsePageRanges(s.memorization.recited ?? '')?.list.forEach((p) => add(p, s.date));
  }
  for (const a of assignments) {
    if (a.category !== 'memorization' || a.unit !== 'page') continue;
    for (const p of a.progress) {
      if (p.studentId !== studentId || !p.approved || p.rangeFrom === undefined) continue;
      const to = p.rangeTo ?? p.rangeFrom;
      for (let i = Math.max(1, p.rangeFrom); i <= Math.min(604, to); i++) add(i, p.date);
    }
  }
  return firstDate;
}

/** الأجزاء المكتملة من الصفحات المعتمدة، مع تاريخ إتمام كل جزء (تاريخ آخر صفحة اكتملت به) */
export function completedJuzFromPages(pages: Map<number, string>) {
  const out = new Map<number, string>();
  for (let n = 1; n <= JUZ_COUNT; n++) {
    const [from, to] = juzPages(n);
    let last = '';
    let complete = true;
    for (let p = from; p <= to; p++) {
      const d = pages.get(p);
      if (!d) {
        complete = false;
        break;
      }
      if (d > last) last = d;
    }
    if (complete) out.set(n, last);
  }
  return out;
}

export const juzSource = (s: Student, n: number): JuzSource => s.memorizedJuzSources?.[String(n)] ?? 'manual';

/**
 * يعيد حساب الأجزاء التلقائية لطالب: يضيف كل جزء اكتملت صفحاته بتسميع معتمد، ويحذف جزءًا تلقائيًا
 * لم يعد مكتملًا (بعد تعديل أو حذف سجل تسميع). الأجزاء السابقة واليدوية لا تُلمس أبدًا.
 * يرجع null إذا لا تغيير (حتى لا نكتب لقاعدة البيانات بلا داعي).
 */
export function syncAutoJuz(student: Student, sessions: SessionRecord[], assignments: Assignment[]): Pick<Student, 'memorizedJuz' | 'memorizedJuzDates' | 'memorizedJuzSources'> | null {
  const completed = completedJuzFromPages(approvedMemorizedPages(sessions, assignments, student.id));
  const juz = new Set(student.memorizedJuz ?? []);
  const dates = { ...(student.memorizedJuzDates ?? {}) };
  const sources = { ...(student.memorizedJuzSources ?? {}) };
  let changed = false;

  for (const [n, date] of completed) {
    if (juz.has(n)) continue; // محفوظ أصلًا (سابقًا أو يدويًا أو تلقائيًا) — لا يُحسب مرتين
    juz.add(n);
    dates[String(n)] = date;
    sources[String(n)] = 'auto';
    changed = true;
  }
  for (const n of [...juz]) {
    if (sources[String(n)] === 'auto' && !completed.has(n)) {
      juz.delete(n);
      delete dates[String(n)];
      delete sources[String(n)];
      changed = true;
    }
  }
  if (!changed) return null;
  return { memorizedJuz: [...juz].sort((a, b) => a - b), memorizedJuzDates: dates, memorizedJuzSources: sources };
}

/** ملخص الأجزاء: الإجمالي، والمحفوظ سابقًا، والمكتمل داخل المشروع */
export function juzSummary(s: Student) {
  const all = [...new Set(s.memorizedJuz ?? [])];
  const prior = all.filter((n) => juzSource(s, n) === 'prior').length;
  return { total: all.length, prior, inProject: all.length - prior };
}
