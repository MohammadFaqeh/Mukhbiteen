import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useData } from '@/context/DataContext';
import Avatar from '@/components/ui/Avatar';
import { normalizeArabic } from '@/utils/recitationLog';
import { cx, formatDate } from '@/utils/format';

/** بحث سريع عن طالب من أي صفحة إدارة ← يفتح سجل دوامه مباشرة للتعديل */
export default function StudentQuickFind() {
  const { students, sessions } = useData();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const n = normalizeArabic(q);
    if (!n) return [];
    return students
      .filter((s) => normalizeArabic(s.name).includes(n) || normalizeArabic(s.guardianName).includes(n))
      .slice(0, 8)
      .map((s) => ({ s, last: sessions.filter((x) => x.studentId === s.id).reduce<string>((a, x) => (x.date > a ? x.date : a), '') }));
  }, [q, students, sessions]);

  const go = (id: string) => {
    navigate(`/admin/students/${id}?tab=sessions`);
    setQ('');
    setOpen(false);
    input.current?.blur();
  };

  return (
    <div className="relative order-last w-full flex-none sm:order-none sm:max-w-xs sm:flex-1">
      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
      <input
        ref={input}
        className="input input-sm w-full pr-9"
        placeholder="ابحث عن طالب للتعديل…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
          else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
          else if (e.key === 'Enter' && results[active]) go(results[active].s.id);
          else if (e.key === 'Escape') setOpen(false);
        }}
        aria-label="بحث عن طالب"
      />
      {open && q.trim() && (
        <ul className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-lift">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-[13px] text-navy-400">لا يوجد طالب بهذا الاسم</li>
          ) : (
            results.map(({ s, last }, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(s.id)}
                  onMouseEnter={() => setActive(i)}
                  className={cx('flex w-full items-center gap-3 px-3 py-2 text-right', i === active && 'bg-navy-50')}
                >
                  <Avatar name={s.name} src={s.photo} size={30} />
                  <span className="flex-1 truncate text-[13px] font-bold text-navy-800">{s.name}</span>
                  <span className="text-[11px] text-navy-400">{last ? `آخر دوام ${formatDate(last)}` : 'لا يوجد دوام'}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
