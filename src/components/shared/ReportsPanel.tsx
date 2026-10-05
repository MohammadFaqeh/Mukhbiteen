import { useMemo, useState } from 'react';
import { CalendarRange, Download, FileText, History, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import type { Student } from '@/types';
import { downloadReport } from '@/utils/report';
import { TODAY } from '@/utils/today';
import { cx, formatDate } from '@/utils/format';

type Mode = 'period' | 'cumulative';

/** أقصى مدة لتقرير ولي الأمر: شهران */
const PARENT_MAX_MONTHS = 2;

/** نفس التاريخ قبل عدد من الأشهر (YYYY-MM-DD) */
function monthsBefore(iso: string, months: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

/**
 * تحميل تقرير الطالب PDF.
 * المشرف (admin): فترة بدون حد أو تقرير تراكمي من أول يوم مسجّل حتى اليوم.
 * ولي الأمر: فترة فقط، وبحد أقصى شهرين.
 */
export default function ReportsPanel({ student, admin, className }: { student: Student; admin?: boolean; className?: string }) {
  const { sessions, dailyWorship, tajweedMaterials } = useData();
  const toast = useToast();
  const mine = useMemo(() => sessions.filter((s) => s.studentId === student.id), [sessions, student.id]);
  const worship = useMemo(() => dailyWorship.filter((d) => d.studentId === student.id), [dailyWorship, student.id]);
  const earliest = useMemo(() => [...mine.map((s) => s.date), ...worship.map((d) => d.date)].sort()[0] ?? TODAY, [mine, worship]);

  const [mode, setMode] = useState<Mode>('period');
  const cumulative = admin && mode === 'cumulative';
  const [periodFrom, setPeriodFrom] = useState(`${TODAY.slice(0, 7)}-01`);
  const [periodTo, setPeriodTo] = useState(TODAY);
  const [busy, setBusy] = useState(false);

  const { from, to } = cumulative ? { from: earliest, to: TODAY } : { from: periodFrom, to: periodTo };
  const minFrom = admin || !periodTo ? undefined : monthsBefore(periodTo, PARENT_MAX_MONTHS);
  const tooLong = !cumulative && !!minFrom && !!periodFrom && periodFrom < minFrom;
  const invalid = !from || !to || from > to || tooLong;

  const run = async () => {
    if (invalid) return;
    setBusy(true);
    try {
      await downloadReport({ student, sessions: mine, worship, tajweedMaterials, from, to });
      toast('تم تجهيز التقرير وتحميله');
    } catch (e) {
      console.error(e);
      toast('تعذّر تجهيز التقرير، حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  const options: { key: Mode; icon: typeof FileText; title: string; desc: string }[] = [
    { key: 'period', icon: CalendarRange, title: 'تحديد فترة', desc: 'اختر تاريخ البداية والنهاية' },
    { key: 'cumulative', icon: History, title: 'تقرير تراكمي', desc: `من ${formatDate(earliest)} حتى اليوم` },
  ];

  return (
    <section className={cx('card p-5', className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
          <FileText className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h3 className="section-title">تحميل تقرير PDF</h3>
          <p className="text-[12px] text-navy-400">{student.name}</p>
        </div>
      </div>

      {admin && (
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {options.map(({ key, icon: Icon, title, desc }) => (
          <button
            key={key}
            role="radio"
            aria-checked={mode === key}
            onClick={() => setMode(key)}
            className={cx('flex items-center gap-3 rounded-xl border p-3 text-right transition', mode === key ? 'border-navy-800 bg-navy-50/70 ring-1 ring-navy-800' : 'border-navy-100 bg-white hover:bg-navy-50/50')}
          >
            <Icon className="h-5 w-5 shrink-0 text-burgundy-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-navy-800">{title}</span>
              <span className="block text-[12px] text-navy-400">{desc}</span>
            </span>
          </button>
        ))}
      </div>
      )}

      {!cumulative && (
        <div className={cx(admin && 'mt-3')}>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-navy-500">
              من تاريخ
              <input type="date" className="input mt-1" value={periodFrom} min={minFrom} max={periodTo || TODAY} onChange={(e) => setPeriodFrom(e.target.value)} />
            </label>
            <label className="text-[12px] text-navy-500">
              إلى تاريخ
              <input type="date" className="input mt-1" value={periodTo} min={periodFrom} max={TODAY} onChange={(e) => setPeriodTo(e.target.value)} />
            </label>
          </div>
          {!admin && !tooLong && <p className="mt-2 text-[12px] text-navy-400">أقصى مدة للتقرير شهران.</p>}
          {tooLong ? (
            <p className="mt-2 text-[12px] text-burgundy-600">أقصى مدة للتقرير شهران، يُرجى اختيار تاريخ بداية بعد {formatDate(minFrom!)}.</p>
          ) : (
            invalid && <p className="mt-2 text-[12px] text-burgundy-600">يجب أن يكون تاريخ البداية قبل تاريخ النهاية.</p>
          )}
        </div>
      )}

      <button onClick={run} disabled={busy || invalid} className="btn-primary mt-3 w-full py-3">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? 'جارٍ تجهيز التقرير...' : 'تحميل التقرير'}
      </button>
    </section>
  );
}
