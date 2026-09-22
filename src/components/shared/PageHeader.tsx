import type { ReactNode } from 'react';

export default function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[24px] font-extrabold text-navy-900 sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-navy-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
