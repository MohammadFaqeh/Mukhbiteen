/**
 * ================================================================
 *  البيانات التجريبية لمشروع المخبتين القرآني
 * ================================================================
 *  كل بيانات الموقع موجودة في هذا الملف فقط.
 *  - عدّل أسماء الطلاب وصورهم من مصفوفة `students`.
 *  - عدّل المطلوب للدوام القادم من `nextRequirements`.
 *  - عدّل صور السلايد شو من `activities`.
 *  - سجلات الدوام تُولَّد تلقائيًا من `studentProfiles` (قيم ثابتة غير عشوائية)،
 *    ويمكن إضافة سجلات يدوية في `manualSessions` لتظهر كما هي.
 *
 *  عند الربط مع Supabase لاحقًا: هذا الملف يُستبدل باستعلامات من الجداول،
 *  والأنواع في src/types تبقى كما هي.
 * ================================================================
 */
import type {
  Activity,
  DemoAccount,
  NextRequirement,
  SessionRecord,
  Student,
  Supervisor,
  WorshipRecord,
  CommitmentLevel,
  AttendanceStatus,
} from '@/types';

/** تاريخ "اليوم" في البيانات التجريبية */
export const TODAY = '2026-09-22';

export const PROJECT = {
  name: 'مشروع المخبتين القرآني',
  center: 'مركز كفرأبيل القرآني',
  group: 'مجموعة المخبتين',
  verse: 'وَبَشِّرِ الْمُخْبِتِينَ',
  logo: '/images/brand/mukhbiteen-logo.png',
  centerLogo: '/images/brand/center-logo.png',
  credit: 'تصميم وتطوير: م. محمد عادل الفقيه',
};

export const supervisor: Supervisor = {
  name: 'م. محمد عادل الفقيه',
  title: 'مشرف مشروع المخبتين القرآني',
  photo: '/images/brand/supervisor.jpg',
};

/* ------------------------------------------------------------------ */
/*  الطلاب                                                             */
/* ------------------------------------------------------------------ */
export const students: Student[] = [
  { id: 's01', name: 'أحمد عبد الحفيظ', shortName: 'أحمد عبد الحفيظ', photo: '/images/students/ahmad-abdulhafeez.jpg', birthDate: '2014-03-11', group: 'مجموعة المخبتين', guardianName: 'عبد الحفيظ', username: 'parent', joinedAt: '2025-09-01', active: true, notes: 'متميز في التسميع، يحتاج تثبيت المراجعة البعيدة.' },
  { id: 's02', name: 'عبد الباسط الفقيه', shortName: 'عبد الباسط الفقيه', photo: '/images/students/abdulbasit-alfaqih.jpg', birthDate: '2015-01-20', group: 'مجموعة المخبتين', guardianName: 'والد عبد الباسط', username: 'abdulbasit.p', joinedAt: '2025-09-01', active: true },
  { id: 's03', name: 'أحمد فؤاد', shortName: 'أحمد فؤاد', photo: '/images/students/ahmad-fouad.jpg', birthDate: '2014-07-02', group: 'مجموعة المخبتين', guardianName: 'فؤاد', username: 'ahmad.fouad.p', joinedAt: '2025-09-01', active: true },
  { id: 's04', name: 'أمير علاء', shortName: 'أمير علاء', photo: '/images/students/ameer-alaa.jpg', birthDate: '2015-05-14', group: 'مجموعة المخبتين', guardianName: 'علاء', username: 'ameer.p', joinedAt: '2025-10-12', active: true },
  { id: 's05', name: 'هارون', shortName: 'هارون', photo: '/images/students/haroun.jpg', birthDate: '2014-11-30', group: 'مجموعة المخبتين', guardianName: 'والد هارون', username: 'haroun.p', joinedAt: '2025-09-01', active: true },
  { id: 's06', name: 'جواد الخطيب', shortName: 'جواد الخطيب', photo: '/images/students/jawad-alkhatib.jpg', birthDate: '2013-12-05', group: 'مجموعة المخبتين', guardianName: 'والد جواد', username: 'jawad.p', joinedAt: '2025-09-01', active: true },
  { id: 's07', name: 'خالد مقابلة', shortName: 'خالد مقابلة', photo: '/images/students/khaled-muqabala.jpg', birthDate: '2014-02-17', group: 'مجموعة المخبتين', guardianName: 'والد خالد', username: 'khaled.p', joinedAt: '2025-11-03', active: true },
  { id: 's08', name: 'مسلم سعيد', shortName: 'مسلم سعيد', photo: '/images/students/muslim-saed.jpg', birthDate: '2015-08-09', group: 'مجموعة المخبتين', guardianName: 'سعيد', username: 'muslim.p', joinedAt: '2025-09-01', active: true },
  { id: 's09', name: 'أسيد مقابلة', shortName: 'أسيد مقابلة', photo: '/images/students/osaid-muqabala.jpg', birthDate: '2013-06-25', group: 'مجموعة المخبتين', guardianName: 'والد أسيد', username: 'osaid.p', joinedAt: '2025-09-01', active: true },
  { id: 's10', name: 'أسامة عثمان', shortName: 'أسامة عثمان', photo: '/images/students/osama-othman.jpg', birthDate: '2013-10-10', group: 'مجموعة المخبتين', guardianName: 'عثمان', username: 'osama.p', joinedAt: '2025-09-15', active: true },
  { id: 's11', name: 'تيم أيوب', shortName: 'تيم أيوب', photo: '/images/students/taim-ayoub.jpg', birthDate: '2015-04-01', group: 'مجموعة المخبتين', guardianName: 'أيوب', username: 'taim.p', joinedAt: '2025-09-01', active: true },
  { id: 's12', name: 'يحيى الزقيلي', shortName: 'يحيى الزقيلي', photo: '/images/students/yahya-zuqaili.jpg', birthDate: '2014-09-19', group: 'مجموعة المخبتين', guardianName: 'والد يحيى', username: 'yahya.p', joinedAt: '2025-09-01', active: true },
];

/* ------------------------------------------------------------------ */
/*  الحسابات التجريبية                                                 */
/* ------------------------------------------------------------------ */
export const demoAccounts: DemoAccount[] = [
  { role: 'admin', username: 'admin', password: 'admin123', displayName: 'م. محمد عادل الفقيه' },
  { role: 'parent', username: 'parent', password: 'parent123', displayName: 'ولي أمر الطالب أحمد عبد الحفيظ', studentId: 's01' },
];

/* ------------------------------------------------------------------ */
/*  صور وأنشطة السلايد شو                                              */
/* ------------------------------------------------------------------ */
export const activities: Activity[] = [
  { id: 'a1', image: '/images/activities/session-1.svg', title: 'جانب من لقاء اليوم', description: 'جانب من تسميع ومراجعة الطلاب خلال اللقاء.', date: '2026-09-22', durationDays: 6 },
  { id: 'a2', image: '/images/activities/session-2.svg', title: 'حلقة التجويد الأسبوعية', description: 'تطبيق عملي على أحكام المدود مع الشيخ المشرف.', date: '2026-09-18', durationDays: 6 },
  { id: 'a3', image: '/images/activities/session-3.svg', title: 'تكريم المتميزين', description: 'تكريم أصحاب أعلى المعدلات في شهر أغسطس.', date: '2026-09-11', durationDays: 14 },
  { id: 'a4', image: '/images/activities/session-4.svg', title: 'درس في آداب حامل القرآن', description: 'لقاء تربوي قصير قبل بدء التسميع.', date: '2026-09-08', durationDays: 6 },
  { id: 'a5', image: '/images/activities/session-5.svg', title: 'مراجعة جماعية للجزء الأول', description: 'مراجعة جماعية بالتناوب بين الطلاب.', date: '2026-09-04', durationDays: 6 },
];

/* ------------------------------------------------------------------ */
/*  المطلوب للدوام القادم                                               */
/* ------------------------------------------------------------------ */
const NEXT_DATE = '2026-09-24';
export const nextRequirements: NextRequirement[] = [
  { studentId: 's01', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 120 إلى 135', revision: 'الصفحات 15 إلى 25', extraTask: 'مراجعة أحكام المدود', notes: 'التركيز على تثبيت آخر صفحتين.', updatedAt: TODAY },
  { studentId: 's02', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 142 إلى 152', revision: 'الصفحات 20 إلى 28', extraTask: 'حفظ حديث النية', notes: 'الانتباه لمخارج الحروف.', updatedAt: TODAY },
  { studentId: 's03', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 90 إلى 101', revision: 'الصفحات 5 إلى 12', extraTask: 'مراجعة أحكام النون الساكنة', updatedAt: TODAY },
  { studentId: 's04', date: NEXT_DATE, memorization: 'سورة آل عمران من الآية 1 إلى 12', revision: 'الجزء الثاني – الربع الأول', updatedAt: TODAY },
  { studentId: 's05', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 60 إلى 70', revision: 'الصفحات 1 إلى 8', extraTask: 'كتابة معاني الكلمات الغريبة', updatedAt: TODAY },
  { studentId: 's06', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 177 إلى 186', revision: 'الجزء الأول كاملًا', notes: 'ممتاز، الاستمرار على نفس الوتيرة.', updatedAt: TODAY },
  { studentId: 's07', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 40 إلى 48', revision: 'الصفحات 1 إلى 6', updatedAt: TODAY },
  { studentId: 's08', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 102 إلى 110', revision: 'الصفحات 10 إلى 16', extraTask: 'مراجعة أحكام الميم الساكنة', updatedAt: TODAY },
  { studentId: 's09', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 196 إلى 203', revision: 'الجزء الثاني – الربع الثاني', updatedAt: TODAY },
  { studentId: 's10', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 210 إلى 216', revision: 'الجزء الأول – النصف الثاني', extraTask: 'تلخيص درس آداب التلاوة', updatedAt: TODAY },
  { studentId: 's11', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 75 إلى 82', revision: 'الصفحات 4 إلى 10', notes: 'تكرار المقطع خمس مرات قبل النوم.', updatedAt: TODAY },
  { studentId: 's12', date: NEXT_DATE, memorization: 'سورة البقرة من الآية 130 إلى 141', revision: 'الصفحات 12 إلى 20', updatedAt: TODAY },
];

/* ------------------------------------------------------------------ */
/*  توليد سجلات الدوام (تولد نفس النتائج في كل مرة)                     */
/* ------------------------------------------------------------------ */
interface StudentProfile {
  level: number; // مستوى الأداء 0..1
  reliability: number; // الانتظام في الحضور 0..1
  surah: string;
  startAyah: number; // بداية الحفظ في يوليو
  step: number; // عدد الآيات لكل دوام
  worship: number; // مستوى الالتزام بالعبادات 0..1
}

const studentProfiles: Record<string, StudentProfile> = {
  s01: { level: 0.93, reliability: 0.96, surah: 'البقرة', startAyah: 30, step: 3, worship: 0.9 },
  s02: { level: 0.95, reliability: 0.98, surah: 'البقرة', startAyah: 50, step: 4, worship: 0.93 },
  s03: { level: 0.86, reliability: 0.9, surah: 'البقرة', startAyah: 20, step: 3, worship: 0.82 },
  s04: { level: 0.9, reliability: 0.94, surah: 'البقرة', startAyah: 180, step: 4, worship: 0.88 },
  s05: { level: 0.82, reliability: 0.88, surah: 'البقرة', startAyah: 8, step: 2, worship: 0.8 },
  s06: { level: 0.97, reliability: 0.98, surah: 'البقرة', startAyah: 80, step: 4, worship: 0.96 },
  s07: { level: 0.84, reliability: 0.86, surah: 'البقرة', startAyah: 1, step: 2, worship: 0.78 },
  s08: { level: 0.89, reliability: 0.95, surah: 'البقرة', startAyah: 30, step: 3, worship: 0.87 },
  s09: { level: 0.92, reliability: 0.97, surah: 'البقرة', startAyah: 110, step: 4, worship: 0.91 },
  s10: { level: 0.94, reliability: 0.93, surah: 'البقرة', startAyah: 130, step: 3, worship: 0.9 },
  s11: { level: 0.87, reliability: 0.92, surah: 'البقرة', startAyah: 20, step: 2, worship: 0.84 },
  s12: { level: 0.91, reliability: 0.95, surah: 'البقرة', startAyah: 60, step: 3, worship: 0.89 },
};

/** مولد أرقام شبه عشوائية ثابت حتى تبقى البيانات نفسها عند كل تشغيل */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** أيام الدوام: الثلاثاء والجمعة من بداية يوليو حتى اليوم */
function sessionDates(): string[] {
  const out: string[] = [];
  const d = new Date('2026-07-01T12:00:00');
  const end = new Date(`${TODAY}T12:00:00`);
  while (d <= end) {
    const day = d.getDay();
    if (day === 2 || day === 5) out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const revisionPlan = ['الجزء الأول – الربع الأول', 'الجزء الأول – الربع الثاني', 'الجزء الأول – النصف الأول', 'الجزء الأول', 'الصفحات 1 إلى 10', 'الصفحات 11 إلى 20'];

function commitmentFrom(v: number): CommitmentLevel {
  if (v >= 0.92) return 'excellent';
  if (v >= 0.85) return 'very_good';
  if (v >= 0.76) return 'good';
  return 'needs_work';
}

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

function generateSessions(): SessionRecord[] {
  const dates = sessionDates();
  const all: SessionRecord[] = [];
  students.forEach((st, si) => {
    const p = studentProfiles[st.id];
    const rnd = seeded(97 * (si + 3));
    let ayah = p.startAyah;
    dates.forEach((date, di) => {
      const r = rnd();
      let attendance: AttendanceStatus = 'present';
      if (r > p.reliability) attendance = r > p.reliability + (1 - p.reliability) / 2 ? 'absent' : 'excused';
      else if (r > p.reliability - 0.05) attendance = 'late';

      const id = `${st.id}-${date}`;
      if (attendance === 'absent' || attendance === 'excused') {
        all.push({ id, studentId: st.id, date, attendance, notes: attendance === 'excused' ? 'غياب بعذر مسبق من ولي الأمر.' : undefined });
        return;
      }
      const wobble = (rnd() - 0.5) * 0.12;
      const perf = clamp(p.level + wobble, 0.6, 1);
      const from = ayah;
      const to = ayah + p.step + (di % 3 === 0 ? 1 : 0);
      const completion = Math.round(clamp(perf * 100 + (rnd() - 0.4) * 10, 60, 100));
      const recitedTo = Math.max(from, Math.round(from + (to - from) * (completion / 100)));
      ayah = to + 1;
      const memGrade = Math.round(clamp(perf * 100 + (rnd() - 0.5) * 6, 60, 100));
      const revGrade = Math.round(clamp(perf * 100 + (rnd() - 0.6) * 8, 60, 100));
      const revCompletion = Math.round(clamp(perf * 100 - rnd() * 8, 55, 100));
      const worship: WorshipRecord = {
        fajr: rnd() < p.worship - 0.05,
        dhuhr: rnd() < p.worship + 0.08,
        asr: rnd() < p.worship + 0.06,
        maghrib: rnd() < p.worship + 0.1,
        isha: rnd() < p.worship + 0.04,
        morningAdhkar: rnd() < p.worship - 0.08,
        eveningAdhkar: rnd() < p.worship - 0.12,
        quranWird: rnd() < p.worship,
      };
      const hasRevision = di % 4 !== 3;
      const score = Math.round(
        clamp(
          (attendance === 'late' ? 6 : 10) +
            memGrade * 0.3 +
            (hasRevision ? revGrade : memGrade) * 0.3 +
            (Object.values(worship).filter(Boolean).length / 8) * 20 +
            perf * 10,
        ),
      );
      all.push({
        id,
        studentId: st.id,
        date,
        attendance,
        commitment: commitmentFrom(perf - (attendance === 'late' ? 0.06 : 0)),
        score,
        memorization: {
          required: `سورة ${p.surah} – الآيات ${from} إلى ${to}`,
          recited: `الآيات ${from} إلى ${recitedTo}`,
          completion,
          grade: memGrade,
        },
        revision: hasRevision
          ? { required: revisionPlan[di % revisionPlan.length], revised: revisionPlan[di % revisionPlan.length], completion: revCompletion, grade: revGrade }
          : null,
        worship,
        notes: perf > 0.95 ? 'أداء مميز، بارك الله فيه.' : perf < 0.82 ? 'يحتاج إلى مزيد من التكرار في البيت.' : undefined,
      });
    });
  });
  return all;
}

/** سجلات يدوية تستبدل السجلات المولدة لنفس الطالب والتاريخ */
const manualSessions: SessionRecord[] = [
  {
    id: 's01-2026-09-22', studentId: 's01', date: '2026-09-22', attendance: 'present', commitment: 'excellent', score: 94,
    memorization: { required: 'سورة البقرة – الآيات 100 إلى 115', recited: 'الآيات 100 إلى 113', completion: 90, grade: 94, notes: 'إتقان واضح مع تردد بسيط في الآية 112.' },
    revision: { required: 'الجزء الأول', revised: 'الجزء الأول', completion: 88, grade: 91 },
    worship: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true, morningAdhkar: true, eveningAdhkar: false, quranWird: true },
    notes: 'أداء مميز، مع الحاجة إلى تثبيت آخر موضع.',
  },
  {
    id: 's01-2026-09-18', studentId: 's01', date: '2026-09-18', attendance: 'present', commitment: 'excellent', score: 91,
    memorization: { required: 'سورة البقرة – الآيات 88 إلى 99', recited: 'الآيات 88 إلى 99', completion: 100, grade: 92 },
    revision: { required: 'الصفحات 1 إلى 10', revised: 'الصفحات 1 إلى 9', completion: 85, grade: 89 },
    worship: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true, morningAdhkar: false, eveningAdhkar: true, quranWird: true },
  },
  { id: 's01-2026-09-15', studentId: 's01', date: '2026-09-15', attendance: 'excused', notes: 'غياب بعذر مسبق من ولي الأمر.' },
  {
    id: 's01-2026-09-11', studentId: 's01', date: '2026-09-11', attendance: 'present', commitment: 'very_good', score: 89,
    memorization: { required: 'سورة البقرة – الآيات 80 إلى 87', recited: 'الآيات 80 إلى 86', completion: 88, grade: 90 },
    revision: { required: 'الجزء الأول – النصف الأول', revised: 'الجزء الأول – النصف الأول', completion: 84, grade: 88 },
    worship: { fajr: false, dhuhr: true, asr: true, maghrib: true, isha: true, morningAdhkar: true, eveningAdhkar: true, quranWird: true },
  },
  {
    id: 's01-2026-09-08', studentId: 's01', date: '2026-09-08', attendance: 'present', commitment: 'excellent', score: 96,
    memorization: { required: 'سورة البقرة – الآيات 72 إلى 79', recited: 'الآيات 72 إلى 79', completion: 100, grade: 97 },
    revision: { required: 'الجزء الأول – الربع الثاني', revised: 'الجزء الأول – الربع الثاني', completion: 95, grade: 94 },
    worship: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true, morningAdhkar: true, eveningAdhkar: true, quranWird: true },
    notes: 'تسميع متقن بلا أخطاء.',
  },
  {
    id: 's01-2026-09-04', studentId: 's01', date: '2026-09-04', attendance: 'present', commitment: 'very_good', score: 88,
    memorization: { required: 'سورة البقرة – الآيات 64 إلى 71', recited: 'الآيات 64 إلى 70', completion: 87, grade: 88 },
    revision: { required: 'الجزء الأول – الربع الأول', revised: 'الجزء الأول – الربع الأول', completion: 82, grade: 86 },
    worship: { fajr: true, dhuhr: true, asr: false, maghrib: true, isha: true, morningAdhkar: true, eveningAdhkar: false, quranWird: true },
  },
  {
    id: 's01-2026-09-01', studentId: 's01', date: '2026-09-01', attendance: 'present', commitment: 'excellent', score: 90,
    memorization: { required: 'سورة البقرة – الآيات 58 إلى 63', recited: 'الآيات 58 إلى 63', completion: 100, grade: 91 },
    revision: null,
    worship: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true, morningAdhkar: true, eveningAdhkar: false, quranWird: true },
  },
  {
    id: 's01-2026-08-28', studentId: 's01', date: '2026-08-28', attendance: 'late', commitment: 'good', score: 85,
    memorization: { required: 'سورة البقرة – الآيات 52 إلى 57', recited: 'الآيات 52 إلى 56', completion: 83, grade: 86 },
    revision: { required: 'الصفحات 11 إلى 20', revised: 'الصفحات 11 إلى 17', completion: 75, grade: 84 },
    worship: { fajr: false, dhuhr: true, asr: true, maghrib: true, isha: true, morningAdhkar: false, eveningAdhkar: true, quranWird: true },
    notes: 'تأخر ربع ساعة عن بداية اللقاء.',
  },
];

function mergeSessions(): SessionRecord[] {
  const map = new Map(generateSessions().map((s) => [s.id, s]));
  manualSessions.forEach((m) => map.set(m.id, m));
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export const sessions: SessionRecord[] = mergeSessions();

/** مجموعة البيانات الأولية كاملة (يستخدمها DataContext) */
export const initialData = {
  students,
  sessions,
  nextRequirements,
  activities,
};
export type AppData = typeof initialData;
