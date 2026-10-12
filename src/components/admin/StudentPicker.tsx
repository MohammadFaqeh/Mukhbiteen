import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useData } from '@/context/DataContext';
import Avatar from '@/components/ui/Avatar';
import { normalizeArabic } from '@/utils/recitationLog';
import { cx } from '@/utils/format';

/** اختيار طلاب متعدد قابل للبحث، مع "تحديد الكل" واختيار مجموعة كاملة */
export default function StudentPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { students } = useData();
  const [q, setQ] = useState('');
  const active = useMemo(() => students.filter((s) => s.active), [students]);
  const groups = useMemo(() => [...new Set(active.map((s) => s.group))].sort((a, b) => a.localeCompare(b, 'ar')), [active]);
  const selected = new Set(value);
  const shown = useMemo(() => {
    const n = normalizeArabic(q);
    return n ? students.filter((s) => normalizeArabic(s.name).includes(n) || normalizeArabic(s.group).includes(n)) : active;
  }, [q, students, active]);

  const toggle = (id: string) => onChange(selected.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  const allOn = active.length > 0 && active.every((s) => selected.has(s.id));
  const groupOn = (g: string) => active.filter((s) => s.group === g).every((s) => selected.has(s.id));
  const setGroup = (g: string) => {
    const ids = active.filter((s) => s.group === g).map((s) => s.id);
    onChange(groupOn(g) ? value.filter((x) => !ids.includes(x)) : [...new Set([...value, ...ids])]);
  };

  return (
    <div className="rounded-2xl border border-navy-100 bg-white">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-navy-50 p-2">
        <button type="button" onClick={() => onChange(allOn ? [] : active.map((s) => s.id))} className={cx('rounded-full px-3 py-1 text-[12px] font-bold ring-1 ring-inset transition', allOn ? 'bg-navy-800 text-white ring-navy-800' : 'text-navy-600 ring-navy-100 hover:bg-navy-50')}>
          جميع الطلاب ({active.length})
        </button>
        {groups.length > 1 &&
          groups.map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g)} className={cx('rounded-full px-3 py-1 text-[12px] font-bold ring-1 ring-inset transition', groupOn(g) ? 'bg-burgundy-600 text-white ring-burgundy-600' : 'text-navy-600 ring-navy-100 hover:bg-navy-50')}>
              {g}
            </button>
          ))}
        <span className="mr-auto text-[12px] text-navy-400">تم تحديد {value.length}</span>
      </div>
      <div className="relative border-b border-navy-50 p-2">
        <Search className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
        <input className="input input-sm w-full pr-9" placeholder="ابحث باسم الطالب أو المجموعة" value={q} onChange={(e) => setQ(e.target.value)} aria-label="بحث عن طالب" />
      </div>
      <ul className="scrollbar-thin max-h-56 overflow-y-auto p-1.5">
        {shown.length === 0 && <li className="px-3 py-2 text-[13px] text-navy-400">لا يوجد طالب مطابق</li>}
        {shown.map((s) => {
          const on = selected.has(s.id);
          return (
            <li key={s.id}>
              <button type="button" onClick={() => toggle(s.id)} aria-pressed={on} className={cx('flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-right transition', on ? 'bg-navy-50' : 'hover:bg-navy-50/50')}>
                <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', on ? 'border-navy-800 bg-navy-800 text-white' : 'border-navy-200')}>{on && <Check className="h-3.5 w-3.5" />}</span>
                <Avatar name={s.name} src={s.photo} size={26} />
                <span className="flex-1 truncate text-[13px] font-medium text-navy-800">{s.name}</span>
                <span className="text-[11px] text-navy-400">{s.group}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
