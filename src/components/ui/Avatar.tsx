import { useState } from 'react';
import { cx, initials } from '@/utils/format';

interface Props {
  name: string;
  src?: string;
  size?: number;
  className?: string;
  rounded?: 'full' | 'xl' | '2xl';
}

export default function Avatar({ name, src, size = 44, className, rounded = 'full' }: Props) {
  const [failed, setFailed] = useState(false);
  const r = { full: 'rounded-full', xl: 'rounded-xl', '2xl': 'rounded-2xl' }[rounded];
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cx('shrink-0 bg-navy-50 object-cover object-[50%_22%]', r, className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={cx('inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-navy-700 to-burgundy-700 font-bold text-white', r, className)}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}
