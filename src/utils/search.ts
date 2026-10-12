/**
 * فهرس البحث الشامل — يُبنى من البيانات التي يملك المستخدم صلاحية رؤيتها أصلًا
 * (ولي الأمر لا تصله من قاعدة البيانات إلا بيانات ابنه، فلا يمكن أن يظهر له غيرها).
 * البحث جزئي ويتجاهل التشكيل واختلاف الهمزات والتاء المربوطة والياء، وكل كلمة بالبحث لازم تطابق.
 */
import type { Activity, AppNotification, Assignment, Role, SessionRecord, Student } from '@/types';
import { TAJWEED_COURSES } from '@/data/tajweed';
import { normalizeArabic } from './recitationLog';
import { formatDate } from './format';

export type SearchKind = 'page' | 'student' | 'guardian' | 'group' | 'assignment' | 'session' | 'activity' | 'notification' | 'tajweed';

export const kindLabels: Record<SearchKind, string> = {
  page: 'الصفحات',
  student: 'الطلاب',
  guardian: 'أولياء الأمور',
  group: 'المجموعات',
  assignment: 'المطلوبات',
  session: 'سجلات التسميع والدوام',
  activity: 'الدروس والأنشطة',
  notification: 'الإشعارات',
  tajweed: 'التجويد',
};

const KIND_ORDER: SearchKind[] = ['page', 'student', 'guardian', 'group', 'assignment', 'session', 'activity', 'tajweed', 'notification'];

export interface SearchItem {
  kind: SearchKind;
  title: string;
  subtitle?: string;
  to: string;
  photo?: string;
  text: string; // النص الموحّد للمطابقة
}

export const normalizeSearch = (s: string) => normalizeArabic(s).toLowerCase();

const item = (kind: SearchKind, title: string, to: string, extra: (string | undefined)[] = [], subtitle?: string, photo?: string): SearchItem => ({
  kind,
  title,
  subtitle,
  to,
  photo,
  text: normalizeSearch([title, subtitle, ...extra].filter(Boolean).join(' ')),
});

const ADMIN_PAGES: [string, string, string?][] = [
  ['لوحة التحكم', '/admin', 'الرئيسية احصائيات متوسط'],
  ['إدارة الطلاب', '/admin/students', 'طلاب اضافة طالب'],
  ['تسجيل دوام اليوم', '/admin/attendance', 'حضور غياب تسميع علامات'],
  ['استيراد سجل التسميع', '/admin/import', 'excel اكسل ملف رفع'],
  ['المطلوبات', '/admin/assignments', 'واجب مطلوب جديد تجويد حديث درس'],
  ['الإشعارات', '/admin/notifications', 'اشعار تذكير جدولة رسائل'],
  ['الإشعارات التلقائية', '/admin/notifications?tab=auto', 'قواعد تذكير بالدوام الفجر تقصير'],
  ['التجويد', '/admin/tajweed', 'دورات احكام'],
  ['الصور والأنشطة', '/admin/activities', 'سلايد صور نشاط درس'],
  ['التقارير', '/admin/reports', 'تقرير pdf لوحة الشرف'],
];

const PARENT_PAGES: [string, string, string?][] = [
  ['الرئيسية', '/parent'],
  ['المطلوب القادم والمطلوبات', '/parent/next', 'واجب مطلوب تقصير'],
  ['الحفظ والمراجعة', '/parent/quran', 'اجزاء تسميع شهادة'],
  ['العبادات', '/parent/worship', 'صلاة اذكار جدول'],
  ['التجويد', '/parent/tajweed', 'دورة احكام'],
  ['سجل الدوام', '/parent/sessions', 'حضور غياب'],
  ['التقارير', '/parent/reports', 'تقرير pdf'],
];

export function buildSearchIndex(input: {
  role: Role;
  students: Student[];
  sessions: SessionRecord[];
  assignments: Assignment[];
  activities: Activity[];
  notifications: AppNotification[];
}): SearchItem[] {
  const { role, students, sessions, assignments, activities, notifications } = input;
  const admin = role === 'admin';
  const out: SearchItem[] = [];
  const name = (id: string) => students.find((s) => s.id === id)?.name ?? '';

  (admin ? ADMIN_PAGES : PARENT_PAGES).forEach(([t, to, kw]) => out.push(item('page', t, to, [kw])));

  if (admin) {
    students.forEach((s) => {
      out.push(item('student', s.name, `/admin/students/${s.id}`, [s.shortName, s.guardianEmail], s.group, s.photo));
      if (s.guardianName) out.push(item('guardian', s.guardianName, `/admin/students/${s.id}`, [s.guardianEmail], `ولي أمر ${s.name}`));
    });
    [...new Set(students.map((s) => s.group))].forEach((g) => {
      const n = students.filter((s) => s.group === g).length;
      out.push(item('group', g, `/admin/students?group=${encodeURIComponent(g)}`, [], `${n} طالبًا`));
    });
    TAJWEED_COURSES.forEach((c) => out.push(item('tajweed', c.label, '/admin/tajweed')));
  }

  assignments
    .filter((a) => admin || a.visibleToParents)
    .forEach((a) => {
      const who = admin ? (a.targets.length === 1 ? name(a.targets[0].studentId) : `${a.targets.length} طلاب`) : '';
      out.push(item('assignment', a.title, admin ? `/admin/assignments?id=${a.id}` : '/parent/next', [a.description], [who, a.dueDate && `الاستحقاق ${formatDate(a.dueDate)}`].filter(Boolean).join(' · ')));
    });

  sessions.forEach((s) => {
    const texts = [s.notes, s.memorization?.required, s.memorization?.recited, s.memorization?.notes, s.revision?.required, s.revision?.revised, s.revision?.notes].filter(Boolean) as string[];
    if (!texts.length) return;
    const to = admin ? `/admin/students/${s.studentId}?tab=sessions&date=${s.date}` : '/parent/sessions';
    out.push(item('session', `${admin ? `${name(s.studentId)} — ` : ''}${formatDate(s.date)}`, to, texts, texts[0]));
  });

  activities.forEach((a) => {
    const captions = a.images.map((i) => i.caption).filter(Boolean) as string[];
    if (!a.title && !a.description && !captions.length) return;
    out.push(item('activity', a.title || captions[0] || 'نشاط', admin ? '/admin/activities' : '/parent', [a.description, ...captions], formatDate(a.date)));
  });

  notifications.forEach((n) => out.push(item('notification', n.title, n.link && !admin ? n.link : admin ? '/admin/notifications?tab=sent' : '/parent', [n.body], n.body)));

  return out;
}

/** نتائج مجمّعة حسب النوع — حد أقصى لكل نوع حتى تبقى القائمة سريعة ومرتبة */
export function searchIndex(index: SearchItem[], query: string, perKind = 5) {
  const q = normalizeSearch(query);
  if (!q) return [];
  const words = q.split(' ').filter(Boolean);
  const hits = index
    .filter((it) => words.every((w) => it.text.includes(w)))
    .map((it) => ({ it, score: it.text.startsWith(q) ? 0 : normalizeSearch(it.title).includes(q) ? 1 : 2 }))
    .sort((a, b) => a.score - b.score);
  return KIND_ORDER.map((kind) => ({ kind, items: hits.filter((h) => h.it.kind === kind).slice(0, perKind).map((h) => h.it) })).filter((g) => g.items.length);
}
