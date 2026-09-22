/**
 * خلفية الهوية البصرية المشتركة: Off-white + نمط النجمة الثمانية بشفافية عالية
 * + أشكال ضبابية كحلية وخمرية في الزوايا.
 */
const STAR_PATTERN = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>
  <g fill='none' stroke='#1E2B45' stroke-width='1'>
    <path d='M60 18 L72 48 L102 60 L72 72 L60 102 L48 72 L18 60 L48 48 Z'/>
    <rect x='35' y='35' width='50' height='50' transform='rotate(45 60 60)'/>
    <rect x='35' y='35' width='50' height='50'/>
    <circle cx='60' cy='60' r='9'/>
    <path d='M0 0 L18 0 M0 0 L0 18 M120 0 L102 0 M120 0 L120 18 M0 120 L18 120 M0 120 L0 102 M120 120 L102 120 M120 120 L120 102'/>
  </g>
</svg>`);

export default function BrandBackground({ variant = 'parent' }: { variant?: 'parent' | 'admin' | 'login' }) {
  const strong = variant === 'login';
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-paper">
      <div className="absolute inset-0 bg-gradient-to-bl from-white via-paper to-sand-50" />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,${STAR_PATTERN}")`,
          backgroundSize: '120px 120px',
          opacity: strong ? 0.045 : variant === 'admin' ? 0.03 : 0.04,
          maskImage: 'radial-gradient(ellipse at 85% 0%, #000 0%, rgba(0,0,0,.35) 45%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 85% 0%, #000 0%, rgba(0,0,0,.35) 45%, transparent 75%)',
        }}
      />
      <div className="absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-navy-300/20 blur-3xl" />
      <div className="absolute -bottom-48 -left-40 h-[36rem] w-[36rem] rounded-full bg-burgundy-200/25 blur-3xl" />
      {variant !== 'admin' && <div className="absolute left-1/3 top-1/3 h-72 w-72 rounded-full bg-sand-200/30 blur-3xl" />}
      {/* نجمة كبيرة شفافة جدًا في الزاوية */}
      <svg className="absolute -bottom-24 -left-24 h-[26rem] w-[26rem] text-burgundy-600 opacity-[0.05]" viewBox="0 0 200 200">
        <g fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="45" y="45" width="110" height="110" />
          <rect x="45" y="45" width="110" height="110" transform="rotate(45 100 100)" />
          <rect x="62" y="62" width="76" height="76" />
          <rect x="62" y="62" width="76" height="76" transform="rotate(45 100 100)" />
          <circle cx="100" cy="100" r="22" />
        </g>
      </svg>
    </div>
  );
}
