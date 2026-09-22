import { CalendarDays, Clock3, Users2 } from 'lucide-react';
import type { Student } from '@/types';
import type { StudentStats } from '@/utils/stats';
import { CommitmentBadge } from '@/components/ui/Badge';
import StarMark from '@/components/brand/StarMark';
import { CenterLogo } from '@/components/brand/Logos';
import { PROJECT } from '@/data/mockData';
import { formatDate } from '@/utils/format';

/** صورة الطالب داخل إطار على شكل محراب */
export function ArchPortrait({ src, name, className = 'h-40 w-32' }: { src?: string; name: string; className?: string }) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <div className="absolute -inset-1.5 rounded-t-[999px] rounded-b-2xl border border-gold-400/60" />
      <div className="relative h-full w-full overflow-hidden rounded-t-[999px] rounded-b-2xl bg-navy-100 shadow-lift">
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover object-[50%_25%]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-navy-700 to-burgundy-700 text-3xl font-bold text-white">{name[0]}</div>
        )}
      </div>
    </div>
  );
}

export default function StudentHero({ student, stats }: { student: Student; stats: StudentStats }) {
  const updated = stats.lastSession?.date;
  return (
    <section className="card relative overflow-hidden p-5 sm:p-7">
      {/* زخرفة خلفية */}
      <div className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full bg-burgundy-100/50 blur-2xl" />
      <svg className="pointer-events-none absolute -left-10 bottom-0 h-56 w-56 text-navy-800 opacity-[0.05]" viewBox="0 0 100 100" aria-hidden>
        <g fill="none" stroke="currentColor" strokeWidth=".8">
          <rect x="20" y="20" width="60" height="60" />
          <rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)" />
          <circle cx="50" cy="50" r="14" />
        </g>
      </svg>

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <ArchPortrait src={student.photo} name={student.name} className="mx-auto h-44 w-36 sm:mx-0" />
        <div className="flex-1 text-center sm:text-right">
          <p className="flex items-center justify-center gap-2 text-[13px] font-medium text-burgundy-600 sm:justify-start">
            <StarMark className="h-3 w-3" />
            {PROJECT.name}
          </p>
          <h1 className="mt-2 text-[26px] font-extrabold leading-snug text-navy-900 sm:text-[32px]">
            أهلًا بكم في صفحة الطالب
            <span className="block text-navy-700">{student.name}</span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-navy-500 sm:justify-start">
            <span className="flex items-center gap-1.5">
              <Users2 className="h-4 w-4 text-navy-300" />
              {student.group}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-navy-300" />
              آخر تحديث: {updated ? formatDate(updated) : '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-navy-300" />
              {stats.sessionsCount} يوم دوام مسجل
            </span>
            <span className="flex items-center gap-1.5">
              الحالة:
              <CommitmentBadge level={stats.commitment} />
            </span>
          </div>
        </div>
        <div className="hidden flex-col items-center gap-1 self-stretch border-r border-navy-100/70 pr-6 text-center xl:flex xl:justify-center">
          <CenterLogo className="h-16 w-auto" />
          <span className="text-[12px] font-medium text-navy-600">{PROJECT.center}</span>
        </div>
      </div>
    </section>
  );
}
