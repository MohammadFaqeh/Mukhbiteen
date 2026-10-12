/**
 * أنواع البيانات الأساسية للمشروع، مطابقة لجداول Supabase (انظر supabase/schema.sql).
 */

export type Role = 'admin' | 'parent';

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late';

export type CommitmentLevel = 'excellent' | 'very_good' | 'good' | 'needs_work';

export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerLocation = 'mosque' | 'home' | 'missed';

/**
 * جدول العبادات اليومي (من السبت إلى الجمعة، والجمعة فيها قراءة سورة الكهف).
 * يُعبّئه ولي الأمر يومًا بيوم، ومستقل تمامًا عن أيام حضور المركز (SessionRecord).
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
  kahf: boolean; // قراءة سورة الكهف (يوم الجمعة فقط)
  notes?: string;
}

/** دورات التجويد بالترتيب */
export type TajweedCourse = 'tamheedi' | 'mutawassit' | 'mutaqaddim' | 'itqan' | 'ijaza';

/** فصل من فصول دورة التجويد — date = تاريخ إعطائه للطلاب (فاضي = لسا ما انأخذ) */
export interface TajweedChapter {
  id: string;
  title: string;
  date?: string; // YYYY-MM-DD
}

/**
 * مادة دورة التجويد (ملف PDF يرفعه المشرف ويظهر لولي أمر كل طالب مسجّل بالدورة)
 * + فصولها: ثابتة للدورة كلها (مش لكل طالب) — كل طالب مسجّل بالدورة يتبعها تلقائيًا.
 */
export interface TajweedMaterial {
  course: TajweedCourse;
  pdfUrl?: string;
  fileName?: string;
  updatedAt?: string;
  chapters?: TajweedChapter[];
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
  tajweedCompleted?: TajweedCourse[]; // دورات التجويد التي اجتازها
  tajweedCurrent?: TajweedCourse; // الدورة المسجّل فيها حاليًا
  memorizedJuz?: number[]; // أرقام الأجزاء المحفوظة كاملة (1-30) — يحددها المشرف يدويًا
  memorizedJuzDates?: Record<string, string>; // تاريخ إتمام كل جزء (رقم الجزء ← YYYY-MM-DD) — يُكتب على شهادة الجزء
  /** مصدر كل جزء محفوظ (رقم الجزء ← المصدر). الجزء غير الموجود هنا يُعامل كـ manual (سجلات ما قبل هذه الميزة) */
  memorizedJuzSources?: Record<string, JuzSource>;
}

/**
 * مصدر الجزء المحفوظ:
 *  prior  = محفوظ قبل الالتحاق بالمشروع (تُدخله الإدارة)
 *  manual = أُتمّ في المشروع وحدّده المشرف يدويًا
 *  auto   = أُتمّ في المشروع واكتشفه النظام من سجل التسميع المعتمد (كل صفحات الجزء مسمّعة ومعتمدة)
 */
export type JuzSource = 'prior' | 'manual' | 'auto';

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
  /**
   * اعتماد التسميع: false = سمّع الطالب لكن التسميع لم يُعتمد (يحتاج إعادة) فلا يُحسب منجزًا (الإنجاز 0).
   * غير موجود (سجلات ما قبل هذه الميزة) = معتمد.
   */
  approved?: boolean;
  notes?: string;
}

export interface RevisionEntry {
  required: string;
  revised: string;
  requiredPages: number;
  completedPages: number;
  completion: number;
  grade: number;
  approved?: boolean;
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
  /** عدد صفحات المطلوب — للمشرف فقط (لا يظهر لولي الأمر)، يعبّي خانة العدد بملف الدوام القادم */
  memorizationPages?: number;
  revisionPages?: number;
  extraTask?: string;
  notes?: string;
  updatedAt: string;
}

/** صورة ضمن منشور الأنشطة — العنوان اختياري لكل صورة */
export interface ActivityImage {
  url: string;
  caption?: string;
}

/**
 * منشور بالسلايد شو: صورة أو أكثر مرفوعة معًا. العنوان الرئيسي اختياري ويظهر على أول صورة فقط،
 * وكل صورة ممكن يكون لها عنوانها الخاص (أو بدون عنوان).
 */
export interface Activity {
  id: string;
  image: string; // أول صورة (للتوافق مع السجلات القديمة)
  images: ActivityImage[];
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

/* ------------------------------------------------------------------
 *  المطلوبات المرنة (تجويد، حفظ حديث، درس، واجب…) — جدول assignments
 * ------------------------------------------------------------------ */

/** نوع المطلوب: الحفظ بالصفحات يدخل بحساب الأجزاء المحفوظة تلقائيًا */
export type AssignmentCategory = 'memorization' | 'revision' | 'other';

/** وحدة قياس المقدار المطلوب */
export type AssignmentUnit = 'page' | 'ayah' | 'hadith' | 'item';

/** الحالة المخزّنة لكل طالب (المتأخر لا يُخزَّن: يُشتق من تاريخ الاستحقاق) */
export type AssignmentStoredStatus = 'not_started' | 'in_progress' | 'completed';
export type AssignmentStatus = AssignmentStoredStatus | 'overdue';

export interface AssignmentTarget {
  studentId: string;
  /** للمطلوب بلا مقدار: تحددها الإدارة يدويًا. للمطلوب بمقدار: تُحسب من سجل الإنجاز وتُحفظ للإشعارات */
  status: AssignmentStoredStatus;
}

/**
 * تسميع/إنجاز على مطلوب: نطاق (من–إلى) إذا كان المطلوب نطاقًا، أو مقدار إذا كان المطلوب عددًا.
 * approved = false: سمّع ولم يُعتمد بعد — لا يُحسب منجزًا.
 */
export interface AssignmentProgress {
  id: string;
  assignmentId: string;
  studentId: string;
  date: string;
  rangeFrom?: number;
  rangeTo?: number;
  amount?: number;
  approved: boolean;
  note?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  category: AssignmentCategory;
  dueDate?: string; // YYYY-MM-DD — اختياري
  visibleToParents: boolean;
  /** بلا وحدة = مطلوب بلا مقدار (لا تُولَّد له نسبة) */
  unit?: AssignmentUnit;
  /** المطلوب نطاق: من الآية/الصفحة rangeFrom إلى rangeTo (شاملتان) */
  rangeFrom?: number;
  rangeTo?: number;
  /** أو المطلوب عدد فقط (مثلًا 3 أحاديث) */
  targetAmount?: number;
  createdAt: string;
  updatedAt: string;
  targets: AssignmentTarget[];
  progress: AssignmentProgress[];
}

/* ------------------------------------------------------------------
 *  الإشعارات
 * ------------------------------------------------------------------ */

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  link?: string;
  kind: 'manual' | 'auto';
  sendAt: string; // ISO
  readAt?: string | null; // لإشعارات المستخدم الحالي فقط
}

/** إشعار مرسل من الإدارة (للسجل) مع عدد المستلمين ومن قرأه */
export interface SentNotification extends AppNotification {
  recipients: number;
  read: number;
  ruleId?: string;
}

export type NotificationRuleType = 'session_reminder' | 'assignment_new' | 'assignment_due' | 'assignment_overdue' | 'recitation_shortfall';

export interface NotificationRule {
  id: string;
  type: NotificationRuleType;
  name: string;
  enabled: boolean;
  titleTemplate: string;
  bodyTemplate: string;
  /** المجموعات المستهدفة — فارغة = كل أولياء الأمور */
  audience: string[];
  /** أيام الدوام (0 = الأحد … 6 = السبت) — لتذكير الدوام */
  weekdays: number[];
  /** ساعة الدوام (HH:MM) — تظهر بالرسالة */
  sessionTime?: string;
  /** ساعة الإرسال (HH:MM) بتوقيت المركز */
  sendTime?: string;
  /** قبل الاستحقاق بكم ساعة — لقرب موعد الاستحقاق */
  hoursBefore?: number;
}
