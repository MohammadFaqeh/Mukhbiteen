import { HandHeart } from 'lucide-react';
import type { DailyWorship } from '@/types';
import { ProgressBar } from '@/components/ui/Progress';
import { PRAYER_ITEMS, dailyWorshipScore, weekWorshipScore } from '@/utils/worship';
import { cx, formatDate, pct } from '@/utils/format';

const LOC_TONE: Record<string, string> = {
  mosque: 'bg-emerald-50 text-emerald-700',
  home: 'bg-amber-50 text-amber-700',
  missed: 'bg-burgundy-50 text-burgundy-500',
};

export default function WorshipCard({ weekDays, monthAverage }: { weekDays: DailyWorship[]; monthAverage: number }) {
  const weekScore = weekWorshipScore(weekDays);
  const latest = weekDays[weekDays.length - 1];
  const latestScore = latest ? dailyWorshipScore(latest) : 0;

  return (
    <section className="card flex h-full flex-col p-5">
      <header className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <HandHeart className="h-[18px] w-[18px]" />
          </span>
          <h3 className="section-title">جدول العبادات</h3>
        </div>
        {latest && <span className="text-[12px] text-navy-400">آخر تسجيل: {formatDate(latest.date)}</span>}
      </header>
      {latest ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRAYER_ITEMS.map(({ key, label }) => (
            <span key={key} className={cx('rounded-lg px-2 py-1 text-[11px] font-medium', LOC_TONE[latest.prayers[key]])}>
              {label}
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-[12px] text-navy-400">لا يوجد تسجيل بعد لهذا الأسبوع.</p>
      )}
      <div className="mt-auto grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-navy-50/70 p-3">
          <p className="text-[12px] text-navy-500">علامة الأسبوع</p>
          <p className="text-[22px] font-extrabold text-navy-900">{pct(weekScore)}</p>
          <ProgressBar value={weekScore} thin tone="green" />
        </div>
        <div className="rounded-xl bg-sand-50 p-3">
          <p className="text-[12px] text-navy-500">معدل الشهر</p>
          <p className="text-[22px] font-extrabold text-navy-900">{pct(monthAverage)}</p>
          <ProgressBar value={monthAverage} thin tone="gold" />
        </div>
      </div>
      {latest && (
        <div className="mt-3 rounded-xl bg-navy-50/40 p-3 text-center">
          <p className="text-[11px] text-navy-400">علامة آخر يوم مسجَّل</p>
          <p className="text-[16px] font-bold text-navy-800">{pct(latestScore)}</p>
        </div>
      )}
    </section>
  );
}
