/**
 * الأوسمة الشهرية التحفيزية — تُقاس على الشهر كاملًا (مش كل يوم دوام):
 * أوسمة الدوام تحتاج 4 أيام دوام على الأقل بالشهر، وأوسمة العبادات تحتاج 12 يومًا معبّأً على الأقل،
 * حتى لا يأخذ الطالب وسامًا من يوم أو يومين فقط.
 */
import type { DailyWorship, SessionRecord } from '@/types';
import { monthKey } from './stats';

export type BadgeKey = 'attendance' | 'memQuality' | 'revQuality' | 'completion' | 'conduct' | 'fajr' | 'adhkar' | 'qiyam' | 'parents';

export interface Badge {
  key: BadgeKey;
  title: string;
  desc: string;
}

const MIN_SESSIONS = 4;
const MIN_WORSHIP_DAYS = 12;

const attended = (s: SessionRecord) => s.attendance === 'present' || s.attendance === 'late';
const avg = (n: number[]) => (n.length ? n.reduce((a, b) => a + b, 0) / n.length : 0);
const share = <T,>(list: T[], f: (x: T) => boolean) => (list.length ? list.filter(f).length / list.length : 0);

/** أوسمة الطالب لشهر معيّن (YYYY-MM) */
export function monthBadges(sessions: SessionRecord[], worship: DailyWorship[], month: string): Badge[] {
  const out: Badge[] = [];
  const ms = sessions.filter((s) => monthKey(s.date) === month);
  const present = ms.filter(attended);

  if (present.length >= MIN_SESSIONS) {
    if (ms.every((s) => s.attendance === 'present')) out.push({ key: 'attendance', title: 'وسام الحضور الكامل', desc: 'حضر جميع أيام الدوام في موعدها' });

    const mem = present.filter((s) => s.memorization);
    const rev = present.filter((s) => s.revision);
    const memReq = mem.reduce((a, s) => a + s.memorization!.requiredPages, 0);
    const memDone = mem.reduce((a, s) => a + s.memorization!.completedPages, 0);
    const revReq = rev.reduce((a, s) => a + s.revision!.requiredPages, 0);
    const revDone = rev.reduce((a, s) => a + s.revision!.completedPages, 0);

    if (mem.length >= MIN_SESSIONS && avg(mem.map((s) => s.memorization!.grade)) >= 90) out.push({ key: 'memQuality', title: 'وسام إتقان الحفظ', desc: 'تسميع متقن للحفظ الجديد طوال الشهر' });
    if (rev.length >= MIN_SESSIONS && avg(rev.map((s) => s.revision!.grade)) >= 90) out.push({ key: 'revQuality', title: 'وسام إتقان المراجعة', desc: 'مراجعة متقنة طوال الشهر' });
    if (memReq + revReq > 0 && memDone >= memReq && revDone >= revReq) out.push({ key: 'completion', title: 'وسام الإنجاز الكامل', desc: 'أنجز جميع المطلوب حفظًا ومراجعةً' });

    const conduct = present.filter((s) => s.commitment);
    if (conduct.length >= MIN_SESSIONS && conduct.every((s) => s.commitment === 'excellent')) out.push({ key: 'conduct', title: 'وسام حسن الخلق', desc: 'التزام وسلوك ممتاز في كل أيام الدوام' });
  }

  const wd = worship.filter((d) => monthKey(d.date) === month);
  if (wd.length >= MIN_WORSHIP_DAYS) {
    if (share(wd, (d) => d.prayers.fajr === 'mosque') >= 0.8) out.push({ key: 'fajr', title: 'وسام صلاة الفجر', desc: 'حافظ على صلاة الفجر في المسجد' });
    if (share(wd, (d) => d.morningAdhkar && d.eveningAdhkar) >= 0.9) out.push({ key: 'adhkar', title: 'وسام الذاكرين', desc: 'واظب على أذكار الصباح والمساء' });
    if (share(wd, (d) => d.qiyam) >= 0.5) out.push({ key: 'qiyam', title: 'وسام قيام الليل', desc: 'أكثر من قيام الليل خلال الشهر' });
    if (avg(wd.map((d) => d.parentsSatisfaction)) >= 95) out.push({ key: 'parents', title: 'وسام برّ الوالدين', desc: 'نال رضا والديه طوال الشهر' });
  }
  return out;
}

/**
 * الشهر الذي تُعرض أوسمته: الشهر الحالي إذا اكتملت فيه أيام الدوام الكافية، وإلا الشهر السابق
 * (في أول الشهر لا تكون البيانات كافية بعد، فيبقى وسام الشهر الماضي ظاهرًا).
 */
export function badgesMonth(sessions: SessionRecord[], today: string) {
  const current = today.slice(0, 7);
  if (sessions.filter((s) => monthKey(s.date) === current && attended(s)).length >= MIN_SESSIONS) return current;
  const d = new Date(`${current}-15T12:00:00`);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}
