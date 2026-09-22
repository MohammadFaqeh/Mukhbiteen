import { HandHeart } from 'lucide-react';
import type { SessionRecord } from '@/types';
import WorshipGrid from '@/components/shared/WorshipGrid';
import { ProgressBar } from '@/components/ui/Progress';
import { worshipCount, worshipPercent } from '@/utils/stats';
import { formatDate, pct } from '@/utils/format';

export default function WorshipCard({ last, monthAverage }: { last?: SessionRecord; monthAverage: number }) {
  const today = worshipPercent(last?.worship);
  const c = worshipCount(last?.worship);
  return (
    <section className="card flex h-full flex-col p-5">
      <header className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <HandHeart className="h-[18px] w-[18px]" />
          </span>
          <h3 className="section-title">جدول العبادات</h3>
        </div>
        <span className="text-[12px] text-navy-400">{last ? formatDate(last.date) : ''}</span>
      </header>
      <p className="mb-3 text-[12px] text-navy-400">
        أنجز {c.done} من {c.total}
      </p>
      <WorshipGrid value={last?.worship} columns="grid-cols-2" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-navy-50/70 p-3">
          <p className="text-[12px] text-navy-500">نسبة الالتزام اليوم</p>
          <p className="text-[22px] font-extrabold text-navy-900">{pct(today)}</p>
          <ProgressBar value={today} thin tone="green" />
        </div>
        <div className="rounded-xl bg-sand-50 p-3">
          <p className="text-[12px] text-navy-500">معدل الشهر</p>
          <p className="text-[22px] font-extrabold text-navy-900">{pct(monthAverage)}</p>
          <ProgressBar value={monthAverage} thin tone="gold" />
        </div>
      </div>
    </section>
  );
}
