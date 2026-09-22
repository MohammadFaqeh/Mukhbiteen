import type { ReactNode } from 'react';
import type { AttendanceStatus, CommitmentLevel } from '@/types';
import { attendanceLabels, commitmentLabels, cx } from '@/utils/format';

type Tone = 'navy' | 'burgundy' | 'green' | 'amber' | 'gray' | 'gold';
const tones: Record<Tone, string> = {
  navy: 'bg-navy-50 text-navy-700 ring-navy-100',
  burgundy: 'bg-burgundy-50 text-burgundy-700 ring-burgundy-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  gold: 'bg-sand-100 text-gold-600 ring-sand-200',
};

export default function Badge({ tone = 'navy', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1 ring-inset', tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const attTone: Record<AttendanceStatus, Tone> = { present: 'green', late: 'amber', excused: 'gray', absent: 'burgundy' };
export function AttendanceBadge({ status, className }: { status: AttendanceStatus; className?: string }) {
  return (
    <Badge tone={attTone[status]} dot className={className}>
      {attendanceLabels[status]}
    </Badge>
  );
}

const comTone: Record<CommitmentLevel, Tone> = { excellent: 'gold', very_good: 'navy', good: 'gray', needs_work: 'burgundy' };
export function CommitmentBadge({ level, className }: { level: CommitmentLevel; className?: string }) {
  return (
    <Badge tone={comTone[level]} className={className}>
      {commitmentLabels[level]}
    </Badge>
  );
}
