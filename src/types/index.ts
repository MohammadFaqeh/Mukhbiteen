/**
 * أنواع البيانات الأساسية للمشروع.
 * صُممت لتطابق جداول Supabase المستقبلية (students, sessions, next_requirements, activities, guardians)
 * بحيث يتم الربط لاحقًا دون تغيير واجهات المكونات.
 */

export type Role = 'admin' | 'parent';

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late';

export type CommitmentLevel = 'excellent' | 'very_good' | 'good' | 'needs_work';

export type WorshipKey =
  | 'fajr'
  | 'dhuhr'
  | 'asr'
  | 'maghrib'
  | 'isha'
  | 'morningAdhkar'
  | 'eveningAdhkar'
  | 'quranWird';

export type WorshipRecord = Record<WorshipKey, boolean>;

export interface Student {
  id: string;
  name: string; // الاسم الكامل
  shortName: string; // الاسم المختصر (يظهر في البطاقات)
  photo?: string; // مسار الصورة داخل public/
  birthDate: string; // YYYY-MM-DD
  group: string;
  guardianName: string;
  username: string; // اسم مستخدم ولي الأمر
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
  worship?: WorshipRecord;
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

export interface DemoAccount {
  role: Role;
  username: string;
  password: string;
  displayName: string;
  studentId?: string; // لحساب ولي الأمر
}

export interface Supervisor {
  name: string;
  title: string;
  photo: string;
}
