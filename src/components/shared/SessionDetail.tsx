import type { ReactNode } from 'react';
import { BookOpen, CalendarDays, MessageSquareText, RotateCcw } from 'lucide-react';
import type { SessionRecord } from '@/types';
import Modal from '@/components/ui/Modal';
import { AttendanceBadge, CommitmentBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { formatLongDate } from '@/utils/format';

function Block({ icon: Icon, title, children }: { icon: typeof BookOpen; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-navy-100/70 p-4">
      <p className="mb-2 flex items-center gap-2 text-[13px] font-bold text-navy-700">
        <Icon className="h-4 w-4 text-burgundy-600" />
        {title}
      </p>
      {children}
    </div>
  );
}
function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-[13px]">
      <span className="text-navy-400">{k}</span>
      <span className="text-left font-medium text-navy-800">{v}</span>
    </div>
  );
}

/** نافذة تفاصيل يوم الدوام (للعرض فقط) */
export default function SessionDetail({ session, onClose, studentName }: { session: SessionRecord | null; onClose: () => void; studentName?: string }) {
  const s = session;
  const attended = s && (s.attendance === 'present' || s.attendance === 'late');
  return (
    <Modal open={!!s} onClose={onClose} size="lg" title="تفاصيل يوم الدوام" subtitle={studentName}>
      {s && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy-800 p-4 text-white">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-gold-300" />
              <div>
                <p className="text-[12px] text-navy-200">التاريخ</p>
                <p className="font-bold">{formatLongDate(s.date)}</p>
              </div>
            </div>
            {attended && (
              <div className="text-left">
                <p className="text-[12px] text-navy-200">علامة اليوم</p>
                <p className="text-[26px] font-extrabold leading-none">
                  {s.score}
                  <span className="text-[14px] font-medium text-navy-200">/100</span>
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-6 px-1 text-[13px]">
            <span className="flex items-center gap-2 text-navy-500">
              الحضور: <AttendanceBadge status={s.attendance} />
            </span>
            {s.commitment && (
              <span className="flex items-center gap-2 text-navy-500">
                الالتزام: <CommitmentBadge level={s.commitment} />
              </span>
            )}
          </div>

          {attended ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Block icon={BookOpen} title="الحفظ">
                {s.memorization ? (
                  <>
                    <KV k="الحفظ المطلوب" v={s.memorization.required} />
                    <KV k="تم التسميع" v={s.memorization.recited} />
                    <KV k="تقييم التسميع" v={`${s.memorization.grade}/100`} />
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-navy-400">
                      <ProgressBar value={s.memorization.completion} thin />
                      {s.memorization.completion}%
                    </div>
                  </>
                ) : (
                  <p className="text-[13px] text-navy-400">لا يوجد حفظ مطلوب في هذا اليوم.</p>
                )}
              </Block>
              <Block icon={RotateCcw} title="المراجعة">
                {s.revision ? (
                  <>
                    <KV k="المراجعة" v={s.revision.required} />
                    <KV k="ما تمت مراجعته" v={s.revision.revised} />
                    <KV k="العلامة" v={`${s.revision.grade}/100`} />
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-navy-400">
                      <ProgressBar value={s.revision.completion} thin tone="burgundy" />
                      {s.revision.completion}%
                    </div>
                  </>
                ) : (
                  <p className="text-[13px] text-navy-400">لا توجد مراجعة في هذا اليوم.</p>
                )}
              </Block>
            </div>
          ) : (
            <p className="rounded-2xl bg-sand-50 p-4 text-[14px] text-navy-600">لم يحضر الطالب هذا اليوم، لذلك لا توجد علامات مسجلة.</p>
          )}

          {s.notes && (
            <Block icon={MessageSquareText} title="ملاحظات المشرف">
              <p className="text-[14px] leading-7 text-navy-700">{s.notes}</p>
            </Block>
          )}
        </div>
      )}
    </Modal>
  );
}
