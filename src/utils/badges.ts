/**
 * الأوسمة التحفيزية — تُقاس على دورات من 4 أيام دوام متتالية (مش بالشهر ولا بكل يوم):
 * أيام الدوام 1-4 دورة، 5-8 دورة، وهكذا — حتى لو امتدت الدورة بين شهرين.
 * يُعرض لولي الأمر أوسمة آخر دورة مكتملة، وتبقى ظاهرة حتى تكتمل الدورة التالية.
 * أوسمة العبادات تُقاس على أيام العبادات المعبّأة ضمن تواريخ الدورة نفسها.
 */
import type { DailyWorship, SessionRecord } from '@/types';

export type BadgeKey = 'attendance' | 'memQuality' | 'revQuality' | 'completion' | 'conduct' | 'fajr' | 'adhkar' | 'qiyam' | 'parents';

export interface Badge {
  key: BadgeKey;
  title: string;
  desc: string;
}

export const CYCLE_DAYS = 4;
const MIN_WORSHIP_DAYS = 5; // أقل عدد أيام عبادات معبّأة ضمن الدورة حتى تُحسب أوسمة العبادات

const attended = (s: SessionRecord) => s.attendance === 'present' || s.attendance === 'late';
const avg = (n: number[]) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0);
const share = <T,>(list: T[], f: (x: T) => boolean) => (list.length ? list.filter(f).length / list.length : 0);

/** آخر دورة مكتملة (4 أيام دوام) للطالب، أو null إذا لم يكتمل له 4 أيام بعد */
export function lastCycle(sessions: SessionRecord[]) {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const complete = Math.floor(sorted.length / CYCLE_DAYS);
  if (!complete) return null;
  const days = sorted.slice((complete - 1) * CYCLE_DAYS, complete * CYCLE_DAYS);
  return { days, from: days[0].date, to: days[days.length - 1].date };
}

/** أوسمة دورة من أيام الدوام (والعبادات المعبّأة ضمن تواريخها) */
export function cycleBadges(days: SessionRecord[], worship: DailyWorship[]): Badge[] {
  const out: Badge[] = [];
  if (!days.length) return out;
  const from = days[0].date;
  const to = days[days.length - 1].date;
  const present = days.filter(attended);
  const enough = Math.min(3, days.length); // أوسمة الجودة تحتاج 3 أيام حضور على الأقل من الأربعة

  if (days.every((s) => s.attendance === 'present')) out.push({ key: 'attendance', title: 'وسام الحضور الكامل', desc: 'حضر جميع أيام الدوام في موعدها' });

  const mem = present.filter((s) => s.memorization);
  const rev = present.filter((s) => s.revision);
  if (mem.length >= enough && avg(mem.map((s) => s.memorization!.grade)) >= 90) out.push({ key: 'memQuality', title: 'وسام إتقان الحفظ', desc: 'تسميع متقن للحفظ الجديد' });
  if (rev.length >= enough && avg(rev.map((s) => s.revision!.grade)) >= 90) out.push({ key: 'revQuality', title: 'وسام إتقان المراجعة', desc: 'مراجعة متقنة' });

  const memReq = mem.reduce((a, s) => a + s.memorization!.requiredPages, 0);
  const memDone = mem.reduce((a, s) => a + s.memorization!.completedPages, 0);
  const revReq = rev.reduce((a, s) => a + s.revision!.requiredPages, 0);
  const revDone = rev.reduce((a, s) => a + s.revision!.completedPages, 0);
  if (present.length >= enough && memReq + revReq > 0 && memDone >= memReq && revDone >= revReq) out.push({ key: 'completion', title: 'وسام الإنجاز الكامل', desc: 'أنجز جميع المطلوب حفظًا ومراجعةً' });

  const conduct = present.filter((s) => s.commitment);
  if (conduct.length >= enough && conduct.every((s) => s.commitment === 'excellent')) out.push({ key: 'conduct', title: 'وسام حسن الخلق', desc: 'التزام وسلوك ممتاز في أيام الدوام' });

  const wd = worship.filter((d) => d.date >= from && d.date <= to);
  if (wd.length >= MIN_WORSHIP_DAYS) {
    if (share(wd, (d) => d.prayers.fajr === 'mosque') >= 0.8) out.push({ key: 'fajr', title: 'وسام صلاة الفجر', desc: 'حافظ على صلاة الفجر في المسجد' });
    if (share(wd, (d) => d.morningAdhkar && d.eveningAdhkar) >= 0.9) out.push({ key: 'adhkar', title: 'وسام الذاكرين', desc: 'واظب على أذكار الصباح والمساء' });
    if (share(wd, (d) => d.qiyam) >= 0.5) out.push({ key: 'qiyam', title: 'وسام قيام الليل', desc: 'أكثر من قيام الليل' });
    if (avg(wd.map((d) => d.parentsSatisfaction)) >= 95) out.push({ key: 'parents', title: 'وسام برّ الوالدين', desc: 'نال رضا والديه' });
  }
  return out;
}
