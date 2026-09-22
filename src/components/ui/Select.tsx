import { ChevronDown } from 'lucide-react';
import { cx } from '@/utils/format';

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  small?: boolean;
  ariaLabel?: string;
}

export default function Select({ value, onChange, options, className, small, ariaLabel }: Props) {
  return (
    <div className={cx('relative', className)}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx('input appearance-none pl-9', small && 'input-sm pl-8')}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className={cx('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400', small ? 'h-3.5 w-3.5 left-2.5' : 'h-4 w-4')} />
    </div>
  );
}
