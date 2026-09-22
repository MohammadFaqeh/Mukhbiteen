import { Check, X } from 'lucide-react';
import type { WorshipKey, WorshipRecord } from '@/types';
import { cx, worshipItems } from '@/utils/format';

interface Props {
  value?: WorshipRecord;
  onToggle?: (k: WorshipKey) => void; // إن وُجدت يصبح الجدول قابلًا للتعديل (للإدارة فقط)
  compact?: boolean;
  columns?: string; // فئات Tailwind لعدد الأعمدة
}

/** جدول العبادات – للعرض فقط لولي الأمر، وقابل للنقر في لوحة الإدارة */
export default function WorshipGrid({ value, onToggle, compact, columns }: Props) {
  return (
    <div className={cx('grid gap-2', columns ?? (compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'))}>
      {worshipItems.map(({ key, label }) => {
        const done = !!value?.[key];
        const Tag = onToggle ? 'button' : 'div';
        return (
          <Tag
            key={key}
            type={onToggle ? 'button' : undefined}
            onClick={onToggle ? () => onToggle(key) : undefined}
            aria-pressed={onToggle ? done : undefined}
            className={cx(
              'flex items-center gap-2 rounded-xl border px-2.5 text-right transition',
              compact ? 'py-1.5 text-[12px]' : 'py-2.5 text-[13px]',
              done ? 'border-emerald-100 bg-emerald-50/70 text-navy-800' : 'border-burgundy-100 bg-burgundy-50/50 text-navy-500',
              onToggle && 'cursor-pointer hover:shadow-soft active:scale-[.98]',
            )}
          >
            <span className={cx('flex shrink-0 items-center justify-center rounded-full text-white', compact ? 'h-4 w-4' : 'h-5 w-5', done ? 'bg-emerald-600' : 'bg-burgundy-400')}>
              {done ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="font-medium">{label}</span>
          </Tag>
        );
      })}
    </div>
  );
}
