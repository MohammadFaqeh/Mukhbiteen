import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { SessionRecord } from '@/types';
import { AttendanceBadge } from '@/components/ui/Badge';
import SessionDetail from '@/components/shared/SessionDetail';
import { cx, formatDayMonth, weekday } from '@/utils/format';

/** آخر أيام الدوام كخط زمني أفقي */
export default function SessionTimeline({ sessions, limit = 8, title = 'آخر أيام الدوام', studentName }: { sessions: SessionRecord[]; limit?: number; title?: string; studentName?: string }) {
  const [open, setOpen] = useState<SessionRecord | null>(null);
  const list = sessions.slice(0, limit);
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="section-title">{title}</h3>
        <span className="text-[12px] text-navy-400">اضغط على اليوم لعرض التفاصيل</span>
      </div>
      <div className="no-scrollbar -mx-5 overflow-x-auto px-5">
        <ol className="relative flex min-w-max gap-3 pb-1 pt-3">
          <span className="absolute inset-x-0 top-[18px] h-px bg-navy-100" aria-hidden />
          {list.map((s, i) => {
            const ok = s.attendance === 'present' || s.attendance === 'late';
            return (
              <li key={s.id} className="relative w-[150px]">
                <span className={cx('relative z-10 mx-auto mb-3 block h-3 w-3 rounded-full ring-4 ring-white', i === 0 ? 'bg-burgundy-600' : ok ? 'bg-navy-700' : 'bg-navy-200')} />
                <button
                  onClick={() => setOpen(s)}
                  className={cx('w-full rounded-2xl border p-3 text-right transition hover:-translate-y-0.5 hover:shadow-soft', i === 0 ? 'border-burgundy-200 bg-burgundy-50/40' : 'border-navy-100 bg-white')}
                >
                  <p className="text-[11px] text-navy-400">{weekday(s.date)}</p>
                  <p className="text-[16px] font-bold text-navy-900">{formatDayMonth(s.date)}</p>
                  <AttendanceBadge status={s.attendance} className="mt-2" />
                  {ok ? (
                    <div className="mt-3 space-y-0.5 text-[12px] text-navy-500">
                      <p>
                        علامة اليوم: <b className="text-navy-900">{s.score}/100</b>
                      </p>
                      {s.memorization && <p>الحفظ: {s.memorization.completion}%</p>}
                    </div>
                  ) : (
                    <p className="mt-3 text-[12px] text-navy-300">لا توجد علامات</p>
                  )}
                  <span className="mt-2 flex items-center gap-1 text-[11px] font-medium text-burgundy-600">
                    التفاصيل <ChevronLeft className="h-3 w-3" />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <SessionDetail session={open} onClose={() => setOpen(null)} studentName={studentName} />
    </section>
  );
}
