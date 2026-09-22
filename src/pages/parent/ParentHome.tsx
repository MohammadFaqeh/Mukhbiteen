import { useParentStudent } from '@/hooks/useParentStudent';
import StudentHero from '@/components/parent/StudentHero';
import Slideshow from '@/components/parent/Slideshow';
import NextSessionTicket from '@/components/parent/NextSessionTicket';
import StatsRow from '@/components/parent/StatsRow';
import AverageCard from '@/components/parent/AverageCard';
import TrendCard from '@/components/parent/TrendCard';
import WorshipCard from '@/components/parent/WorshipCard';
import { CommitmentCard, MemorizationCard, RevisionCard } from '@/components/parent/QuranCards';
import SessionTimeline from '@/components/parent/SessionTimeline';
import ReportsPanel from '@/components/shared/ReportsPanel';
import SupervisorCard from '@/components/parent/SupervisorCard';
import { TODAY } from '@/data/mockData';
import { isActivityLive, monthKey } from '@/utils/stats';

export default function ParentHome() {
  const { student, sessions, stats, requirement, activities } = useParentStudent();
  if (!student || !stats) return <p className="p-10 text-center text-navy-400">لم يتم العثور على بيانات الطالب.</p>;
  const live = activities.filter((a) => isActivityLive(a, TODAY));
  const month = stats.lastSession ? monthKey(stats.lastSession.date) : TODAY.slice(0, 7);

  return (
    <div className="space-y-4 sm:space-y-5">
      <StudentHero student={student} stats={stats} />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <NextSessionTicket req={requirement} className="lg:col-span-7 xl:col-span-8" />
        <Slideshow items={live.length ? live : activities.slice(0, 3)} className="min-h-[280px] lg:col-span-5 xl:col-span-4" />
      </div>

      <StatsRow stats={stats} month={month} />

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <AverageCard sessions={sessions} studentId={student.id} />
        </div>
        <div className="md:col-span-2 xl:col-span-5 xl:order-none">
          <TrendCard stats={stats} />
        </div>
        <div className="md:col-span-1 xl:col-span-4">
          <WorshipCard last={stats.lastAttended} monthAverage={stats.worship} />
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
