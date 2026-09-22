import { cx } from '@/utils/format';

/** النجمة الثمانية – عنصر زخرفي صغير يستخدم في العناوين والشارات */
export default function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx('h-4 w-4', className)} aria-hidden>
      <g fill="currentColor">
        <rect x="6" y="6" width="12" height="12" />
        <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
      </g>
    </svg>
  );
}
