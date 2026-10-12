import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useNotifications } from '@/context/NotificationsContext';
import Avatar from '@/components/ui/Avatar';
import { buildSearchIndex, kindLabels, searchIndex } from '@/utils/search';
import { cx } from '@/utils/format';

/**
 * بحث شامل أعلى الموقع: الطلاب، أولياء الأمور، المجموعات، المطلوبات، سجلات التسميع، الأنشطة، الإشعارات والصفحات —
 * ضمن ما يملك المستخدم صلاحية رؤيته فقط. النتائج مقسمة حسب النوع، والضغط ينقل مباشرة لمكانها.
 */
export default function GlobalSearch({ className }: { className?: string }) {
  const { user } = useAuth();
  const { students, sessions, assignments, activities } = useData();
  const { items: notifications } = useNotifications();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(q);
  const admin = user?.role === 'admin';

  const index = useMemo(
    () => (user ? buildSearchIndex({ role: user.role, students, sessions, assignments, activities, notifications }) : []),
    [user, students, sessions, assignments, activities, notifications],
  );
  const groups = useMemo(() => searchIndex(index, deferred), [index, deferred]);
  const flat = groups.flatMap((g) => g.items);

  const go = (to: string) => {
    navigate(to);
    setQ('');
    setOpen(false);
    input.current?.blur();
  };

  let n = -1;
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
      <input
        ref={input}
        type="search"
        className="input input-sm w-full pr-9"
        placeholder={admin ? 'ابحث عن طالب، مجموعة، مطلوب، صفحة…' : 'ابحث في صفحات ابنك ومطلوباته…'}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, flat.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && flat[active]) go(flat[active].to);
          else if (e.key === 'Escape') setOpen(false);
        }}
        aria-label="بحث شامل"
        role="combobox"
        aria-expanded={open && !!q.trim()}
      />
      {open && q.trim() && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 max-h-[min(460px,70vh)] min-w-[280px] overflow-y-auto rounded-xl border border-navy-100 bg-white shadow-lift scrollbar-thin" role="listbox">
          {groups.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-navy-400">لا توجد نتائج مطابقة</p>
          ) : (
            groups.map((g) => (
              <div key={g.kind}>
                <p className="sticky top-0 bg-paper/95 px-3 py-1.5 text-[11px] font-bold text-navy-400 backdrop-blur">{kindLabels[g.kind]}</p>
                <ul>
                  {g.items.map((it) => {
                    n += 1;
                    const i = n;
                    return (
                      <li key={`${it.kind}-${it.to}-${it.title}`}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => go(it.to)}
                          onMouseEnter={() => setActive(i)}
                          className={cx('flex w-full items-center gap-3 px-3 py-2 text-right', i === active && 'bg-navy-50')}
                          role="option"
                          aria-selected={i === active}
                        >
                          {(it.kind === 'student' || it.kind === 'guardian') && <Avatar name={it.title} src={it.photo} size={28} />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-bold text-navy-800">{it.title}</span>
                            {it.subtitle && <span className="block truncate text-[11px] text-navy-400">{it.subtitle}</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
