import { BookOpenCheck, CalendarCheck, HeartHandshake, MoonStar, RotateCcw, Sparkles, Star, Sunrise, Target, Medal, type LucideIcon } from 'lucide-react';
import type { DailyWorship, SessionRecord } from '@/types';
import { badgesMonth, monthBadges, type BadgeKey } from '@/utils/badges';
import { formatMonthKey } from '@/utils/format';
import { TODAY } from '@/utils/today';

const ICONS: Record<BadgeKey, LucideIcon> = {
  attendance: CalendarCheck,
  memQuality: BookOpenCheck,
  revQuality: RotateCcw,
  completion: Target,
  conduct: Star,
  fajr: Sunrise,
  adhkar: Sparkles,
  qiyam: MoonStar,
  parents: HeartHandshake,
};

/** أوسمة الشهر — بطاقة هادئة لا تظهر إطلاقًا إذا لم ينل الطالب أي وسام */
export default function MonthBadges({ sessions, worship }: { sessions: SessionRecord[]; worship: DailyWorship[] }) {
  const month = badgesMonth(sessions, TODAY);
  const badges = monthBadges(sessions, worship, month);
  if (!badges.length) return null;
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-300/30 text-gold-600">
          <Medal className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h3 className="section-title">أوسمة شهر {formatMonthKey(month).split(' ')[0]}</h3>
          <p className="text-[12px] text-navy-400">تقديرًا لتميّز الطالب خلال الشهر</p>
        </div>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => {
          const Icon = ICONS[b.key];
          return (
            <li key={b.key} className="flex items-center gap-3 rounded-2xl border border-gold-300/50 bg-gradient-to-l from-sand-50 to-white px-3 py-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 text-navy-900 shadow-soft">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-extrabold text-navy-900">{b.title}</span>
                <span className="block text-[12px] text-navy-500">{b.desc}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
