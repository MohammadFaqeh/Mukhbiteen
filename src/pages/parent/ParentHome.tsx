import { Link } from 'react-router-dom';
import { HandHeart } from 'lucide-react';
import { useParentStudent } from '@/hooks/useParentStudent';
import StudentHero from '@/components/parent/StudentHero';
import HonorBoardCard from '@/components/parent/HonorBoardCard';
import Slideshow from '@/components/parent/Slideshow';
import NextSessionTicket from '@/components/parent/NextSessionTicket';
import StatsRow from '@/components/parent/StatsRow';
import CycleBadges from '@/components/parent/CycleBadges';
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

      <NextSessionTicket req={requirement} />

      <Slideshow items={live.length ? live : activities.slice(0, 3)} className="min-h-[300px] sm:min-h-[420px] lg:min-h-[520px]" />

      <StatsRow stats={stats} month={month} />

      <CycleBadges sessions={sessions} worship={worship} />

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-12">
        <div className="md:col-span-2 xl:col-span-7">
          <TrendCard stats={stats} />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2 xl:col-span-5">
          <WorshipCard weekDays={weekDays} monthAverage={stats.worship} />
          <Link to="/parent/worship" className="btn-soft justify-center">
            <HandHeart className="h-4 w-4" /> تعبئة عبادات اليوم
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
        <MemorizationCard last={sessions.find((s) => s.memorization)} />
        <RevisionCard sessions={sessions} />
        <CommitmentCard stats={stats} />
      </div>

      <SessionTimeline sessions={sessions} studentName={student.name} />

      <div className="grid gap-4 sm:gap-5 lg:grid-cols-12">
        <ReportsPanel student={student} className="lg:col-span-8" />
        <div className="lg:col-span-4">
          <SupervisorCard />
        </div>
      </div>
    </div>
  );
}
