import type { ReactNode } from 'react';
import type { AttendanceStatus, CommitmentLevel, CompletionStatus } from '@/types';
import { attendanceLabels, commitmentLabels, cx } from '@/utils/format';
import { completionStatus, completionStatusLabels, completionStatusTone, hasMeasure, isApproved } from '@/utils/quran';

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

export function CompletionBadge({ status, className }: { status: CompletionStatus; className?: string }) {
  return (
    <Badge tone={completionStatusTone[status]} className={className}>
      {completionStatusLabels[status]}
    </Badge>
  );
}

/**
 * حالة جزء (حفظ/مراجعة) بيوم دوام: سُمّع ولم يُعتمد / بلا عدد صفحات محدد (لا نسبة مضللة) / أتمّ / جزئي / لم يُنجز
 */
export function PartStatusBadge({ part, className }: { part?: { requiredPages: number; completedPages: number; completion: number; approved?: boolean } | null; className?: string }) {
  if (!part) return null;
  if (!isApproved(part) && part.completedPages > 0)
    return (
      <Badge tone="amber" className={className}>
        سُمّع ولم يُعتمد بعد
      </Badge>
    );
  if (!hasMeasure(part))
    return (
      <Badge tone="gray" className={className}>
        لم يُحدَّد عدد صفحات مطلوب
      </Badge>
    );
  return <CompletionBadge status={completionStatus(part.completion)} className={className} />;
}
