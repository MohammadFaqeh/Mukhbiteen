import { BookOpen, RotateCcw } from 'lucide-react';
import { useParentStudent } from '@/hooks/useParentStudent';
import NextSessionTicket from '@/components/parent/NextSessionTicket';
import RecitationStatusCard from '@/components/parent/RecitationStatusCard';
import PageHeader from '@/components/shared/PageHeader';
import { formatLongDate } from '@/utils/format';
import { hasMeasure, isApproved } from '@/utils/quran';

export default function ParentNext() {
  const { student, sessions, requirement, assignments } = useParentStudent();
  const last = sessions.find((s) => s.memorization);
  return (
    <div>
      <PageHeader title="المطلوب والمطلوبات" subtitle={`الواجب المحدد من المشرف للطالب ${student?.name ?? ''}`} />
      <NextSessionTicket req={requirement} />
      {student && (
        <div className="mt-5">
          <RecitationStatusCard studentId={student.id} sessions={sessions} assignments={assignments} full />
        </div>
      )}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h3 className="section-title mb-3">ما أنجزه في آخر دوام</h3>
          {last ? (
            <div className="space-y-3 text-[14px]">
              <p className="text-[12px] text-navy-400">{formatLongDate(last.date)}</p>
              <p className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-4 w-4 text-navy-500" />
                <span>
                  {last.memorization!.required}
                  <span className="block text-[12px] text-navy-400">تم تسميع {last.memorization!.recited}{hasMeasure(last.memorization) && ` – بإنجاز ${last.memorization!.completion}/100`}{!isApproved(last.memorization) && ' – لم يُعتمد التسميع بعد'}</span>
                </span>
              </p>
              {last.revision && (
                <p className="flex items-start gap-2">
                  <RotateCcw className="mt-0.5 h-4 w-4 text-burgundy-600" />
                  <span>
                    {last.revision.required}
                    <span className="block text-[12px] text-navy-400">{hasMeasure(last.revision) ? `بإنجاز ${last.revision.completion}/100 و` : ''}علامة {last.revision.grade}/100{!isApproved(last.revision) && ' – لم تُعتمد بعد'}</span>
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-navy-400">لا يوجد سجل سابق.</p>
          )}
        </section>
        <section className="card-quiet p-5">
          <h3 className="section-title mb-3">كيف تساعد ابنك في التحضير؟</h3>
          <ul className="space-y-2.5 text-[14px] leading-7 text-navy-600">
            <li>• استمع إليه وهو يقرأ المقطع المطلوب مرة واحدة يوميًا على الأقل.</li>
            <li>• قسّم الحفظ على أيام الأسبوع بدل حفظه دفعة واحدة قبل الدوام.</li>
            <li>• اطلب منه تسميع آخر صفحتين قبل النوم لتثبيتهما.</li>
            <li>• شجّعه على المحافظة على جدول العبادات اليومي.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
