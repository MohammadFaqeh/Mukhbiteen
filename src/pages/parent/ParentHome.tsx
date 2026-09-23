import { useParentStudent } from '@/hooks/useParentStudent';
import StudentHero from '@/components/parent/StudentHero';
import HonorBoardCard from '@/components/parent/HonorBoardCard';
import Slideshow from '@/components/parent/Slideshow';
import NextSessionTicket from '@/components/parent/NextSessionTicket';
import StatsRow from '@/components/parent/StatsRow';
import TrendCard from '@/components/parent/TrendCard';
import WorshipCard from '@/components/parent/WorshipCard';
import { CommitmentCard, MemorizationCard, RevisionCard } from '@/components/parent/QuranCards';
import SessionTimeline from '@/components/parent/SessionTimeline';
import ReportsPanel from '@/components/shared/ReportsPanel';
import SupervisorCard from '@/components/parent/SupervisorCard';
import { TODAY } from '@/utils/today';
import { isActivityLive, monthKey } from '@/utils/stats';
import { weekDates, weekStartOf } from '@/utils/worship';

export default function ParentHome() {
  const { student, sessions, worship, stats, requirement, activities } = useParentStudent();
  if (!student || !stats) return <p className="p-10 text-center text-navy-400">لم يتم العثور على بيانات الطالب.</p>;
  const live = activities.filter((a) => isActivityLive(a, TODAY));
  const month = stats.lastSession ? monthKey(stats.lastSession.date) : TODAY.slice(0, 7);
  const weekDays = weekDates(weekStartOf(TODAY))
    .map((d) => worship.find((w) => w.date === d))
    .filter((x): x is (typeof worship)[number] => !!x);

  return (
    <div className="space-y-4 sm:space-y-5">
      <StudentHero student={student} stats={stats} />

      <HonorBoardCard />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <NextSessionTicket req={requirement} className="lg:col-span-7 xl:col-span-8" />
        <Slideshow items={live.length ? live : activities.slice(0, 3)} className="min-h-[280px] lg:col-span-5 xl:col-span-4" />
      </div>

      <StatsRow stats={stats} month={month} />

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-12">
        <div className="md:col-span-2 xl:col-span-7">
          <TrendCard stats={stats} />
        </div>
        <div className="md:col-span-2 xl:col-span-5">
          <WorshipCard weekDays={weekDays} monthAverage={stats.worship} />
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
        <MemorizationCard last={sessions.find((s) => s.memorization)} />
        <RevisionCard sessions={sessions} />
        <CommitmentCard stats={stats} />
      </div>

      <SessionTimeline sessions={sessions} studentName={student.name} />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <ReportsPanel studentName={student.name} dense className="lg:col-span-8" />
        <div className="lg:col-span-4">
          <SupervisorCard />
        </div>
      </div>
    </div>
  );
}
