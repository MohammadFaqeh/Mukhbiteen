import { PROJECT } from '@/data/mockData';

export default function Footer() {
  return (
    <footer className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-navy-100/70 pt-5 text-[12px] text-navy-400 sm:flex-row">
      <span>
        {PROJECT.name} – {PROJECT.center}
      </span>
      <span>{PROJECT.credit}</span>
    </footer>
  );
}
