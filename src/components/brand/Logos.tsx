import { PROJECT } from '@/data/mockData';
import { cx } from '@/utils/format';

/** شعارا المشروع والمركز كما هما دون أي تعديل */
export function ProjectLogo({ className }: { className?: string }) {
  return <img src={PROJECT.logo} alt={`شعار ${PROJECT.name}`} className={cx('object-contain', className)} />;
}

export function CenterLogo({ className }: { className?: string }) {
  return <img src={PROJECT.centerLogo} alt={`شعار ${PROJECT.center}`} className={cx('object-contain', className)} />;
}

export function LogoPair({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const h = { sm: 'h-10', md: 'h-14', lg: 'h-24' }[size];
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <ProjectLogo className={cx(h, 'w-auto')} />
      <span className="h-8 w-px bg-navy-100" />
      <CenterLogo className={cx(h, 'w-auto opacity-90')} />
    </div>
  );
}
