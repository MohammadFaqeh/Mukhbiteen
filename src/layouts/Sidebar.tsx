import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import { ProjectLogo, CenterLogo } from '@/components/brand/Logos';
import { PROJECT } from '@/data/mockData';
import { cx } from '@/utils/format';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface Props {
  items: NavItem[];
  onLogout: () => void;
  footer?: ReactNode; // بطاقة صغيرة أسفل القائمة
  tone: 'parent' | 'admin';
  subtitle: string;
}

function NavList({ items, onNavigate, tone }: { items: NavItem[]; onNavigate?: () => void; tone: Props['tone'] }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition',
              isActive
                ? tone === 'parent'
                  ? 'bg-white text-navy-900 shadow-soft'
                  : 'bg-navy-800 text-white shadow-soft'
                : 'text-navy-500 hover:bg-white/70 hover:text-navy-800',
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive && tone === 'parent' && <span className="absolute -right-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-l-full bg-burgundy-600" />}
              <Icon className={cx('h-[18px] w-[18px]', isActive && tone === 'parent' && 'text-burgundy-600')} strokeWidth={1.8} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Sidebar({ items, onLogout, footer, tone, subtitle }: Props) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  const inner = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="flex flex-col items-center px-2 pb-5 pt-2 text-center">
        <ProjectLogo className="h-24 w-auto" />
        <p className="mt-1 text-[13px] font-bold text-navy-800">{PROJECT.name}</p>
        <p className="text-[11px] text-navy-400">{subtitle}</p>
      </div>
      <div className="mb-4 h-px bg-gradient-to-l from-transparent via-navy-100 to-transparent" />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <NavList items={items} onNavigate={onNavigate} tone={tone} />
      </div>
      {footer && <div className="mt-4">{footer}</div>}
      <button onClick={onLogout} className="mt-3 flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] font-medium text-burgundy-600 transition hover:bg-burgundy-50">
        <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
        تسجيل الخروج
      </button>
      <div className="mt-3 flex items-center justify-center gap-2 border-t border-navy-100/70 pt-3 text-[11px] text-navy-400">
        <CenterLogo className="h-7 w-auto" />
        {PROJECT.center}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={cx('fixed inset-y-0 right-0 z-30 hidden w-[260px] border-l border-navy-100/60 p-5 lg:block', tone === 'parent' ? 'bg-sand-50/70 backdrop-blur-md' : 'bg-white/80 backdrop-blur-md')}>
        {inner()}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-navy-100/60 bg-paper/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <ProjectLogo className="h-11 w-auto" />
          <div className="leading-tight">
            <p className="text-[13px] font-bold text-navy-800">{PROJECT.name}</p>
            <p className="text-[11px] text-navy-400">{subtitle}</p>
          </div>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-xl border border-navy-100 bg-white p-2 text-navy-700" aria-label="فتح القائمة">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 animate-fade-in bg-navy-950/40" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" />
          <aside className="absolute inset-y-0 right-0 w-[82%] max-w-[300px] animate-slide-in bg-paper p-5 shadow-lift">
            <button onClick={() => setOpen(false)} className="absolute left-4 top-4 rounded-full p-2 text-navy-400 hover:bg-navy-50" aria-label="إغلاق">
              <X className="h-5 w-5" />
            </button>
            {inner(() => setOpen(false))}
          </aside>
        </div>
      )}
    </>
  );
}
