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

export interface MemorizationEntry {
  required: string; // الحفظ المطلوب
  recited: string; // ما تم تسميعه
  completion: number; // نسبة الإنجاز %
  grade: number; // تقييم التسميع /100
  notes?: string;
}

export interface RevisionEntry {
  required: string;
  revised: string;
  completion: number;
  grade: number;
  notes?: string;
}

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
