import { CalendarClock, Hourglass } from 'lucide-react';
import type { Assignment, AssignmentStatus } from '@/types';
import Badge from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { amountLabel, rangesText, requiredText, statusLabels, statusTone, unitLabels, type AssignmentProgressInfo } from '@/utils/assignments';
import { formatDate } from '@/utils/format';

export function AssignmentStatusBadge({ status, className }: { status: AssignmentStatus; className?: string }) {
  return (
    <Badge tone={statusTone[status]} dot className={className}>
      {statusLabels[status]}
    </Badge>
  );
}

/** "الآيات 1–15" للنطاقات، أو "10 صفحات" للعدد */
function partText(a: Assignment, ranges: [number, number][], amount: number, measure: AssignmentProgressInfo['measure']) {
  if (measure === 'range') return ranges.length ? `${a.unit ? unitLabels[a.unit].many : ''} ${rangesText(ranges)}` : '—';
  return amountLabel(amount, a.unit);
}

/**
 * تفاصيل إنجاز طالب على مطلوب: المطلوب، ما أُنجز (معتمد)، ما سُمّع ولم يُعتمد، المتبقي، النسبة من 100، الحالة،
 * تاريخ الاستحقاق وتاريخ آخر تسميع. نفس العرض للإدارة ولولي الأمر.
 */
export default function AssignmentProgressView({ a, p, compact }: { a: Assignment; p: AssignmentProgressInfo; compact?: boolean }) {
  const req = requiredText(a);
  return (
    <div className="space-y-2">
      {p.measure !== 'none' ? (
        <div className="flex items-center gap-2">
          <ProgressBar value={p.percent ?? 0} thin tone={p.overdue ? 'burgundy' : p.stored === 'completed' ? 'green' : 'navy'} />
          <b className="w-[60px] shrink-0 text-left text-[13px] text-navy-800">{p.percent ?? 0}/100</b>
        </div>
      ) : (
        <p className="text-[12px] text-navy-400">مطلوب بلا مقدار محدد — الحالة تحددها الإدارة</p>
      )}
      {p.measure !== 'none' && (
        <dl className={compact ? 'grid gap-x-4 gap-y-1 text-[12px] sm:grid-cols-2' : 'grid gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-2'}>
          <div className="flex gap-1.5">
            <dt className="text-navy-400">المطلوب:</dt>
            <dd className="font-medium text-navy-800">{req}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-navy-400">المنجز المعتمد:</dt>
            <dd className="font-medium text-emerald-700">{p.done ? partText(a, p.doneRanges, p.done, p.measure) : 'لم يُنجز شيء بعد'}</dd>
          </div>
          {p.stored !== 'completed' && (
            <div className="flex gap-1.5">
              <dt className="text-navy-400">المتبقي:</dt>
              <dd className="font-medium text-burgundy-700">{p.measure === 'range' ? partText(a, p.remainingRanges, 0, p.measure) : amountLabel((p.required ?? 0) - p.done, a.unit)}</dd>
            </div>
          )}
          {p.pending > 0 && (
            <div className="flex items-center gap-1.5">
              <dt className="flex items-center gap-1 text-amber-700">
                <Hourglass className="h-3.5 w-3.5" /> سُمّع ولم يُعتمد:
              </dt>
              <dd className="font-medium text-amber-700">{amountLabel(p.pending, a.unit)}</dd>
            </div>
          )}
        </dl>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-navy-400">
        {a.dueDate && (
          <span className="flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" /> الاستحقاق: {formatDate(a.dueDate)}
          </span>
        )}
        <span>آخر تسميع: {p.lastRecitedAt ? formatDate(p.lastRecitedAt) : 'لا يوجد'}</span>
      </div>
    </div>
  );
}
