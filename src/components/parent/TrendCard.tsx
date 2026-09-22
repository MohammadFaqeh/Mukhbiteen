import ScoreChart from '@/components/ui/ScoreChart';
import type { StudentStats } from '@/utils/stats';

export default function TrendCard({ stats }: { stats: StudentStats }) {
  const t = stats.trend;
  const best = t.length ? Math.max(...t.map((x) => x.score)) : 0;
  const first = t[0]?.score ?? 0;
  const last = t[t.length - 1]?.score ?? 0;
  return (
    <section className="card flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="section-title">تغيّر علامات الطالب</h3>
        <div className="flex gap-4 text-[12px] text-navy-400">
          <span>
            أعلى علامة <b className="text-navy-800">{best}</b>
          </span>
          <span>
            التغير <b className={last >= first ? 'text-emerald-700' : 'text-burgundy-600'}>{last - first >= 0 ? `+${last - first}` : last - first}</b>
          </span>
        </div>
      </div>
      <p className="mb-2 text-[12px] text-navy-400">آخر {t.length} أيام دوام حضرها الطالب</p>
      <div className="flex flex-1 items-center">
        <ScoreChart data={t} height={230} />
      </div>
    </section>
  );
}
