import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ListChecks, ShieldCheck } from 'lucide-react';
import type { Assignment, SessionRecord } from '@/types';
import AssignmentProgressView, { AssignmentStatusBadge } from '@/components/shared/AssignmentProgressView';
import { assignmentProgress, categoryLabels, recitationStanding } from '@/utils/assignments';
import { TODAY } from '@/utils/today';
import { cx, daysBetween, formatDate } from '@/utils/format';

type Short = NonNullable<ReturnType<typeof recitationStanding>['memShort']>;
const shortText = (label: string, f: Short) =>
  f.pending ? `${label}: سمّع ${f.pending} من ${f.required} صفحات ولم يُعتمد التسميع بعد` : f.none ? `${label}: لم يُسمّع شيئًا من ${f.required} صفحات مطلوبة` : `${label}: سمّع ${f.done} من أصل ${f.required} صفحات (ينقصه ${f.missing})`;

/**
 * لولي الأمر: هل ابنه ملتزم أم مقصّر بالتسميع، وما المطلوب وما أُنجز وما بقي.
 * التقصير يُحسب فقط بعد حلول الموعد (يوم الدوام أو تاريخ استحقاق المطلوب) — لا قبله.
 * full = صفحة المطلوبات (كل المطلوبات بما فيها المكتملة)، وإلا: المطلوبات الجارية فقط.
 */
export default function RecitationStatusCard({ studentId, sessions, assignments, full }: { studentId: string; sessions: SessionRecord[]; assignments: Assignment[]; full?: boolean }) {
  const st = recitationStanding(sessions, assignments, studentId, TODAY);
  const items = assignments
    .filter((a) => a.visibleToParents && a.targets.some((t) => t.studentId === studentId))
    .map((a) => ({ a, p: assignmentProgress(a, studentId, TODAY) }))
    .filter(({ p }) => full || p.stored !== 'completed' || (!!p.lastRecitedAt && daysBetween(p.lastRecitedAt, TODAY) <= 7)) // المكتمل يبقى ظاهرًا أسبوعًا
    .sort((x, y) => Number(y.p.overdue) - Number(x.p.overdue) || (x.a.dueDate ?? '9999').localeCompare(y.a.dueDate ?? '9999'));

  if (!items.length && !st.lastSession) return null;

  return (
    <section className={cx('card overflow-hidden', st.behind && 'ring-1 ring-burgundy-200')}>
      <header className={cx('flex flex-wrap items-center gap-3 px-5 py-4', st.behind ? 'bg-burgundy-50/70' : 'bg-emerald-50/60')}>
        <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', st.behind ? 'bg-burgundy-600' : 'bg-emerald-600')}>
          {st.behind ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cx('text-[16px] font-extrabold', st.behind ? 'text-burgundy-700' : 'text-emerald-800')}>{st.behind ? 'يوجد تقصير في التسميع المطلوب' : 'ملتزم بالتسميع المطلوب'}</p>
          <p className="text-[12px] text-navy-500">آخر تسميع: {st.lastRecitedAt ? formatDate(st.lastRecitedAt) : 'لا يوجد بعد'}</p>
        </div>
        {!full && items.length > 0 && (
          <Link to="/parent/next" className="flex items-center gap-1 text-[12px] font-bold text-burgundy-600 hover:underline">
            عرض المطلوب عند الكل <ChevronLeft className="h-3.5 w-3.5" />
          </Link>
        )}
      </header>

      {(st.memShort || st.revShort || st.overdue.length > 0) && (
        <ul className="space-y-1 border-b border-navy-50 px-5 py-3 text-[13px] font-medium text-burgundy-700">
          {st.lastSession && st.memShort && <li>• يوم {formatDate(st.lastSession.date)} — {shortText('الحفظ', st.memShort)}</li>}
          {st.lastSession && st.revShort && <li>• يوم {formatDate(st.lastSession.date)} — {shortText('المراجعة', st.revShort)}</li>}
          {st.overdue.map(({ a }) => (
            <li key={a.id}>
              • تجاوز موعد "{a.title}" ({formatDate(a.dueDate!)}) ولم يكتمل
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 ? (
        <ul className="divide-y divide-navy-50">
          {items.map(({ a, p }) => (
            <li key={a.id} className="px-5 py-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <ListChecks className="h-4 w-4 text-navy-400" />
                <span className="text-[14px] font-extrabold text-navy-900">{a.title}</span>
                <span className="text-[11px] text-navy-400">{categoryLabels[a.category]}</span>
                <AssignmentStatusBadge status={p.status} className="mr-auto" />
              </div>
              {a.description && <p className="mb-2 text-[13px] leading-6 text-navy-600">{a.description}</p>}
              <AssignmentProgressView a={a} p={p} />
            </li>
          ))}
        </ul>
      ) : (
        full && <p className="px-5 py-6 text-center text-[13px] text-navy-400">لا توجد مطلوبات حاليًا.</p>
      )}
    </section>
  );
}
