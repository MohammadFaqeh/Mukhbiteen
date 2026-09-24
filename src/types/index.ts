/**
 * أنواع البيانات الأساسية للمشروع، مطابقة لجداول Supabase (انظر supabase/schema.sql).
 */

export type Role = 'admin' | 'parent';

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late';

export type CommitmentLevel = 'excellent' | 'very_good' | 'good' | 'needs_work';

export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerLocation = 'mosque' | 'home' | 'missed';

/**
 * جدول العبادات اليومي (من السبت إلى الخميس – يوم الجمعة هو يوم الدوام بالمركز ويُقيَّم مباشرة).
 * يُعبّئ أسبوعيًا من ورقة ولي الأمر، ومستقل تمامًا عن أيام حضور المركز (SessionRecord).
 */
export interface DailyWorship {
  id: string; // `${studentId}-${date}`
  studentId: string;
  date: string; // YYYY-MM-DD
  prayers: Record<PrayerKey, PrayerLocation>;
  morningAdhkar: boolean;
  eveningAdhkar: boolean;
  sleepAdhkar: boolean;
  duhaRakahs: number; // صلاة الضحى
  qiyam: boolean; // قيام الليل
  witrRakahs: number;
  rawatibRakahs: number; // السنن الرواتب، من أصل 12
  parentsSatisfaction: number; // نسبة رضا الوالدين 0-100
  wirdFromPage?: number; // ورد القراءة نظرًا عن المصحف
  wirdToPage?: number;
  charity: boolean; // الصدقة (مرة على الأقل بالأسبوع) – نفس القيمة تتكرر على كل أيام أسبوعها
  notes?: string;
}

export interface Student {
  id: string;
  name: string; // الاسم الكامل
  shortName: string; // الاسم المختصر (يظهر في البطاقات)
  photo?: string; // رابط الصورة في Supabase Storage
  birthDate: string; // YYYY-MM-DD
  group: string;
  guardianName: string;
  guardianEmail?: string; // بريد ولي الأمر لتسجيل الدخول عبر Supabase Auth
  joinedAt: string;
  notes?: string;
  active: boolean;
}

/**
 * المطلوب/المنجز عدد صفحات فعلي، ونسبة الإنجاز تُحسب منهما تلقائيًا (منجز÷مطلوب×100) —
 * لا تُكتب يدويًا. العلامة (grade) مستقلة تمامًا عن نسبة الإنجاز: قد يُنجز الطالب نصف
 * المطلوب لكن بإتقان تام، أو يُنجز الكل بإتقان أقل.
 */
export interface MemorizationEntry {
  required: string; // وصف الحفظ المطلوب (نص حر)
  recited: string; // وصف ما تم تسميعه فعليًا (نص حر)
  requiredPages: number; // عدد صفحات الحفظ المطلوبة
  completedPages: number; // عدد صفحات الحفظ المسمَّعة فعليًا
  completion: number; // نسبة الإنجاز % = completedPages ÷ requiredPages × 100 (محسوبة، غير مُدخلة يدويًا)
  grade: number; // جودة التسميع /100 (مستقلة عن نسبة الإنجاز)
  notes?: string;
}

export interface RevisionEntry {
  required: string;
  revised: string;
  requiredPages: number;
  completedPages: number;
  completion: number;
  grade: number;
  notes?: string;
}

export type CompletionStatus = 'completed' | 'partial' | 'not_done';

export interface SessionRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  attendance: AttendanceStatus;
  commitment?: CommitmentLevel;
  score?: number; // علامة اليوم /100
  memorization?: MemorizationEntry | null;
  revision?: RevisionEntry | null;
  notes?: string;
}

export interface NextRequirement {
  studentId: string;
  date: string; // تاريخ الدوام القادم
  memorization: string;
  revision: string;
  extraTask?: string;
  notes?: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  image: string;
  title: string;
  description: string;
  date: string; // تاريخ النشر
  durationDays: number; // مدة العرض بالأيام
}

export interface Supervisor {
  name: string;
  title: string;
  photo: string;
}

export interface HonorBoardEntry {
  studentId: string;
  name: string;
  photo?: string;
  average: number;
  rank: number;
}

/**
 * لوحة الشرف: لقطة مجمّدة من ترتيب المجموعة لحظة النشر (لا تتغيّر لاحقًا حتى لو تعدّلت البيانات).
 * لا تظهر لأولياء الأمور إلا إذا published = true، ويُظهرها الموقع لكل الأهالي دفعة واحدة.
 */
export interface HonorBoard {
  id: string;
  title: string;
  periodFrom: string;
  periodTo: string;
  published: boolean;
  entries: HonorBoardEntry[];
  createdAt: string;
}
