import type { ReactNode } from 'react';
import type { AttendanceStatus, CommitmentLevel } from '@/types';
import { attendanceLabels, commitmentLabels, cx } from '@/utils/format';

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

const attColors: Record<AttendanceStatus, string> = {
  present: 'data-[on=true]:bg-emerald-600 data-[on=true]:text-white',
  late: 'data-[on=true]:bg-amber-500 data-[on=true]:text-white',
  excused: 'data-[on=true]:bg-slate-500 data-[on=true]:text-white',
  absent: 'data-[on=true]:bg-burgundy-600 data-[on=true]:text-white',
};

/** اختيار الحضور كأزرار سريعة */
export function AttendancePicker({ value, onChange, size = 'md' }: { value: AttendanceStatus; onChange: (v: AttendanceStatus) => void; size?: 'sm' | 'md' }) {
  const opts: AttendanceStatus[] = ['present', 'absent', 'excused', 'late'];
  return (
    <div className="inline-flex w-full rounded-xl bg-navy-50 p-1" role="radiogroup">
      {opts.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          data-on={value === o}
          onClick={() => onChange(o)}
          className={cx('flex-1 whitespace-nowrap rounded-lg font-bold text-navy-500 transition hover:text-navy-800', size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-3 py-2 text-[13px]', attColors[o])}
        >
          {attendanceLabels[o]}
        </button>
      ))}
    </div>
  );
}

export function CommitmentSelect({ value, onChange, small }: { value?: CommitmentLevel; onChange: (v: CommitmentLevel) => void; small?: boolean }) {
  return (
    <select className={cx('input', small && 'input-sm')} value={value ?? 'excellent'} onChange={(e) => onChange(e.target.value as CommitmentLevel)}>
      {(Object.keys(commitmentLabels) as CommitmentLevel[]).map((k) => (
        <option key={k} value={k}>
          {commitmentLabels[k]}
        </option>
      ))}
    </select>
  );
}

export function NumberInput({ value, onChange, max = 100, small, placeholder, ariaLabel }: { value?: number; onChange: (v: number | undefined) => void; max?: number; small?: boolean; placeholder?: string; ariaLabel?: string }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      aria-label={ariaLabel}
      placeholder={placeholder}
      className={cx('input text-center', small && 'input-sm')}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : Math.max(0, Math.min(max, Number(v))));
      }}
    />
  );
}
