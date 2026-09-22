import { BookMarked, CalendarDays, Hourglass, ListChecks, NotebookPen, RotateCcw } from 'lucide-react';
import type { NextRequirement } from '@/types';
import { TODAY } from '@/data/mockData';
import { cx, daysBetween, formatDate, formatNumericDate, remainingLabel, weekday } from '@/utils/format';

/**
 * بطاقة "المطلوب للدوام القادم" على شكل تذكرة – مستوحاة من شريط الشعار المسنّن.
 * هي العنصر الأبرز في صفحة ولي الأمر.
 */
export default function NextSessionTicket({ req, className }: { req?: NextRequirement; className?: string }) {
  if (!req)
    return (
      <div className={cx('card flex items-center justify-center p-8 text-center text-navy-400', className)}>
        لم يُحدَّد المطلوب للدوام القادم بعد.
      </div>
    );

  const days = daysBetween(TODAY, req.date);
  const [, , d] = req.date.split('-');
  const rows = [
    { icon: BookMarked, label: 'الحفظ المطلوب', value: req.memorization, strong: true },
    { icon: RotateCcw, label: 'المراجعة', value: req.revision },
    req.extraTask ? { icon: ListChecks, label: 'مهمة إضافية', value: req.extraTask } : null,
    req.notes ? { icon: NotebookPen, label: 'ملاحظة', value: req.notes } : null,
  ].filter(Boolean) as { icon: typeof BookMarked; label: string; value: string; strong?: boolean }[];

  return (
    <section className={cx('relative', className)} aria-labelledby="next-title">
      <div className="ticket-edge relative flex h-full flex-col overflow-hidden rounded-t-[1.4rem] bg-burgundy-700 shadow-ticket sm:flex-row">
        {/* كعب التذكرة: التاريخ */}
        <div className="relative flex shrink-0 flex-row items-center justify-between gap-4 bg-gradient-to-b from-burgundy-600 to-burgundy-800 px-6 py-5 text-white sm:w-[190px] sm:flex-col sm:justify-center sm:py-8 sm:text-center">
          <div>
            <p className="flex items-center gap-1.5 text-[12px] text-burgundy-100 sm:justify-center">
              <CalendarDays className="h-4 w-4" />
              الدوام القادم
            </p>
            <p className="mt-1 text-[20px] font-bold">{weekday(req.date)}</p>
          </div>
          <p className="text-[64px] font-extrabold leading-none text-white sm:my-1">{Number(d)}</p>
          <div className="text-left sm:text-center">
            <p className="text-[13px] text-burgundy-100">{formatDate(req.date).replace(/^\d+\s/, '')}</p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">
              <Hourglass className="h-3 w-3" />
              {remainingLabel(days)}
            </p>
          </div>
          {/* خط التثقيب */}
          <span className="absolute -left-px top-4 bottom-4 hidden border-l-2 border-dashed border-sand-100/60 sm:block" />
        </div>

        {/* جسم التذكرة */}
        <div className="paper-grain relative flex-1 bg-sand-50 px-6 pb-8 pt-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="next-title" className="text-[20px] font-extrabold text-navy-900">
              المطلوب للدوام القادم
            </h2>
            <span className="text-[11px] text-navy-400">حُدِّث في {formatNumericDate(req.updatedAt)}</span>
          </div>
          <dl className="mt-4 grid gap-3 md:grid-cols-2">
            {rows.map(({ icon: Icon, label, value, strong }) => (
              <div key={label} className={cx('flex gap-3 rounded-xl p-3', strong ? 'bg-white shadow-soft md:col-span-2' : 'bg-white/60')}>
                <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', strong ? 'bg-navy-800 text-white' : 'bg-sand-100 text-burgundy-700')}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <dt className="text-[12px] text-navy-400">{label}</dt>
                  <dd className={cx('text-navy-900', strong ? 'text-[18px] font-bold' : 'text-[14px] font-medium')}>{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
