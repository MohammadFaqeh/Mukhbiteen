import type { Student, TajweedCourse } from '@/types';

/** دورات التجويد بالترتيب من الأولى للأخيرة */
export const TAJWEED_COURSES: { key: TajweedCourse; label: string }[] = [
  { key: 'tamheedi', label: 'الدورة التمهيدية' },
  { key: 'mutawassit', label: 'الدورة المتوسطة' },
  { key: 'mutaqaddim', label: 'الدورة المتقدمة' },
  { key: 'itqan', label: 'دورة الإتقان' },
];

export const tajweedLabel = (k?: TajweedCourse) => TAJWEED_COURSES.find((c) => c.key === k)?.label ?? '—';

const ORDER = TAJWEED_COURSES.map((c) => c.key);
export const sortCourses = (list: TajweedCourse[]) => [...new Set(list)].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

/** كشف دورات التجويد كما سلّمه المشرف (بيانات-الطلاب.pdf) — يُطابَق مع الطلاب بالاسم */
export const TAJWEED_ROSTER: { name: string; birthDate: string; completed: TajweedCourse[]; current: TajweedCourse }[] = [
  { name: 'أحمد عبد الحفيظ مقابلة', birthDate: '2014-03-27', completed: ['tamheedi', 'mutawassit'], current: 'mutaqaddim' },
  { name: 'أحمد فؤاد الفقيه', birthDate: '2011-08-05', completed: ['tamheedi', 'mutawassit'], current: 'mutaqaddim' },
  { name: 'أسامة عثمان الفقيه', birthDate: '2011-06-20', completed: ['tamheedi', 'mutawassit', 'mutaqaddim'], current: 'itqan' },
  { name: 'أسيد محمد مقابلة', birthDate: '2014-03-12', completed: ['tamheedi', 'mutawassit'], current: 'mutaqaddim' },
  { name: 'أمير علاء الفقيه', birthDate: '2015-10-10', completed: ['tamheedi'], current: 'mutawassit' },
  { name: 'تيم أيوب الفقيه', birthDate: '2014-07-05', completed: ['tamheedi', 'mutawassit'], current: 'mutaqaddim' },
  { name: 'جواد مهند الخطيب', birthDate: '2014-04-20', completed: ['tamheedi', 'mutawassit'], current: 'mutaqaddim' },
  { name: 'خالد محمد مقابلة', birthDate: '2012-08-30', completed: ['tamheedi'], current: 'mutawassit' },
  { name: 'عبد الباسط محمد الفقيه', birthDate: '2015-08-25', completed: ['tamheedi'], current: 'mutawassit' },
  { name: 'مسلم سائد الفقيه', birthDate: '2012-03-11', completed: ['tamheedi'], current: 'mutawassit' },
  { name: 'هارون يوسف الشريدة', birthDate: '2014-08-04', completed: ['tamheedi', 'mutawassit'], current: 'mutaqaddim' },
  { name: 'يحيى محمد الزقيلي', birthDate: '2012-12-16', completed: ['tamheedi', 'mutawassit'], current: 'mutaqaddim' },
];

/** توحيد كتابة الاسم للمقارنة: الهمزات والتاء المربوطة والألف المقصورة والمسافات */
const norm = (s: string) =>
  s
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ً-ْـ]/g, '')
    .replace(/عبد\s+/g, 'عبد')
    .replace(/\s+/g, ' ')
    .trim();

/** يطابق سطر الكشف مع طالب: الاسم كاملًا، أو الاسم الأول واسم الأب (لو الاسم بالموقع مختصر أو العائلة مكتوبة غير شكل) */
export function matchRoster(students: Student[]) {
  return TAJWEED_ROSTER.map((row) => {
    const r = norm(row.name);
    const [first, father] = r.split(' ');
    const student =
      students.find((s) => norm(s.name) === r) ??
      students.find((s) => {
        const [f, fa] = norm(s.name).split(' ');
        return f === first && fa === father;
      });
    return { row, student };
  });
}
