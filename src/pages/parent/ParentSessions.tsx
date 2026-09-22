import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useParentStudent } from '@/hooks/useParentStudent';
import PageHeader from '@/components/shared/PageHeader';
import SessionTimeline from '@/components/parent/SessionTimeline';
import SessionDetail from '@/components/shared/SessionDetail';
import Select from '@/components/ui/Select';
import { AttendanceBadge, CommitmentBadge } from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import { CalendarCheck, CalendarX, Clock } from 'lucide-react';
import type { SessionRecord } from '@/types';
import { availableMonths, attendanceRate, monthKey } from '@/utils/stats';
import { formatLongDate, formatMonthKey, pct } from '@/utils/format';

export default function ParentSessions() {
  const { student, sessions } = useParentStudent();
  const months = useMemo(() => availableMonths(sessions), [sessions]);
  const [month, setMonth] = useState('all');
  const [open, setOpen] = useState<SessionRecord | null>(null);
  const list = month === 'all' ? sessions : sessions.filter((s) => monthKey(s.date) === month);

  return (
    <div className="space-y-4">
      <PageHeader
        title="سجل الدوام"
        subtitle="جميع أيام الدوام المسجلة للطالب"
        actions={<Select value={month} onChange={setMonth} ariaLabel="الشهر" className="w-44" options={[{ value: 'all', label: 'كل الأشهر' }, ...months.map((m) => ({ value: m, label: formatMonthKey(m) }))]} />}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={CalendarCheck} label="نسبة الحضور" value={pct(attendanceRate(list))} tone="green" />
        <StatCard icon={Clock} label="أيام التأخير" value={String(list.filter((s) => s.attendance === 'late').length)} tone="gold" />
        <StatCard icon={CalendarX} label="أيام الغياب" value={String(list.filter((s) => s.attendance === 'absent' || s.attendance === 'excused').length)} tone="burgundy" />
      </div>
      <SessionTimeline sessions={list} limit={10} title="الخط الزمني" studentName={student?.name} />
      <section className="card overflow-hidden">
        <ul className="divide-y divide-navy-50">
          {list.map((s) => (
            <li key={s.id}>
              <button onClick={() => setOpen(s)} className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-right transition hover:bg-navy-50/40">
                <span className="w-52 text-[14px] font-medium text-navy-800">{formatLongDate(s.date)}</span>
                <AttendanceBadge status={s.attendance} />
                {s.commitment && <CommitmentBadge level={s.commitment} />}
                <span className="text-[13px] text-navy-500">{s.score !== undefined ? `علامة اليوم ${s.score}/100` : '—'}</span>
                <ChevronLeft className="mr-auto h-4 w-4 text-navy-300" />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <SessionDetail session={open} onClose={() => setOpen(null)} studentName={student?.name} />
    </div>
  );
}
