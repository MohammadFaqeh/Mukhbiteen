import { CalendarCheck, HandHeart, TrendingUp } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import type { StudentStats } from '@/utils/stats';
import { formatMonthKey, pct } from '@/utils/format';

export default function StatsRow({ stats, month }: { stats: StudentStats; month: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <StatCard icon={TrendingUp} label={`معدل شهر ${formatMonthKey(month).split(' ')[0]}`} value={pct(stats.monthAverage)} progress={stats.monthAverage} tone="burgundy" />
      <StatCard icon={CalendarCheck} label="الحضور" value={pct(stats.attendance)} progress={stats.attendance} tone="green" />
      <StatCard icon={HandHeart} label="العبادات" value={pct(stats.worship)} progress={stats.worship} tone="gold" />
    </div>
  );
}
