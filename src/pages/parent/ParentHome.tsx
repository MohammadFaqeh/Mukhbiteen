import { Link } from 'react-router-dom';
import { HandHeart } from 'lucide-react';
import { useParentStudent } from '@/hooks/useParentStudent';
import StudentHero from '@/components/parent/StudentHero';
import NextSessionTicket from '@/components/parent/NextSessionTicket';
import RecitationStatusCard from '@/components/parent/RecitationStatusCard';
import WorshipCard from '@/components/parent/WorshipCard';
import { TODAY } from '@/utils/today';
import { weekDates, weekStartOf } from '@/utils/worship';

export default function ParentHome() {
  const { student, sessions, worship, stats, requirement, assignments } = useParentStudent();
  if (!student || !stats) return <p className="p-10 text-center text-navy-400">لم يتم العثور على بيانات الطالب.</p>;
  const weekDays = weekDates(weekStartOf(TODAY))
    .map((d) => worship.find((w) => w.date === d))
    .filter((x): x is (typeof worship)[number] => !!x);

  return (
    <div className="space-y-4 sm:space-y-5">
      <StudentHero student={student} stats={stats} />
      <NextSessionTicket req={requirement} />
      <RecitationStatusCard studentId={student.id} sessions={sessions} assignments={assignments} />

      <div className="space-y-2">
        <WorshipCard weekDays={weekDays} monthAverage={stats.worship} showMonthlyAverage={false} />
        <Link to="/parent/worship" className="btn-soft w-full justify-center">
          <HandHeart className="h-4 w-4" /> عرض جدول العبادات وتعبئة اليوم
        </Link>
      </div>
    </div>
  );
}
