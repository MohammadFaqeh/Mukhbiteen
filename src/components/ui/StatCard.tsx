import type { LucideIcon } from 'lucide-react';
import { ProgressBar } from './Progress';
import { cx } from '@/utils/format';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  progress?: number;
  tone?: 'navy' | 'burgundy' | 'gold' | 'green';
  className?: string;
}

export default function StatCard({ icon: Icon, label, value, hint, progress, tone = 'navy', className }: Props) {
  const iconBg = {
    navy: 'bg-navy-50 text-navy-700',
    burgundy: 'bg-burgundy-50 text-burgundy-600',
    gold: 'bg-sand-100 text-gold-600',
    green: 'bg-emerald-50 text-emerald-700',
  }[tone];
  return (
    <div className={cx('card flex flex-col gap-2 p-3 sm:gap-3 sm:p-5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium leading-tight text-navy-500 sm:text-[13px]">{label}</span>
        <span className={cx('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex', iconBg)}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-extrabold leading-none tracking-tight text-navy-900 sm:text-[30px]">{value}</span>
        {hint && <span className="text-[12px] text-navy-400">{hint}</span>}
      </div>
      {typeof progress === 'number' && <ProgressBar value={progress} tone={tone} thin />}
    </div>
  );
}
