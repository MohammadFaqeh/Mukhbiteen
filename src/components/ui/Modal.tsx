import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '@/utils/format';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const w = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <button className="absolute inset-0 animate-fade-in bg-navy-950/40 backdrop-blur-[3px]" onClick={onClose} aria-label="إغلاق" />
      <div className={cx('relative flex max-h-[92vh] w-full animate-pop-in flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift sm:rounded-3xl', w)}>
        <header className="flex items-start justify-between gap-4 border-b border-navy-50 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-navy-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] text-navy-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-navy-400 transition hover:bg-navy-50 hover:text-navy-700" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="scrollbar-thin overflow-y-auto px-6 py-5">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-navy-50 bg-paper/60 px-6 py-4">{footer}</footer>}
      </div>
    </div>
  );
}
