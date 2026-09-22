import { cx } from '@/utils/format';

export default function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-navy-100 bg-white px-4 py-3">
      <span>
        <span className="block text-[14px] font-bold text-navy-800">{label}</span>
        {description && <span className="block text-[12px] text-navy-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-burgundy-600' : 'bg-navy-100')}
      >
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'right-[22px]' : 'right-0.5')} />
      </button>
    </label>
  );
}
