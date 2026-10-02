import { useMemo, useState } from 'react';
import { CalendarRange, Download, FileBarChart2, FileText, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import type { Student } from '@/types';
import Select from '@/components/ui/Select';
import { downloadReport, type ReportKind } from '@/utils/report';
import { monthKey } from '@/utils/stats';
import { TODAY } from '@/utils/today';
import { cx, formatMonthKey } from '@/utils/format';

const lastDayOfMonth = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m, 0).getDate();
  const end = `${key}-${String(d).padStart(2, '0')}`;
  return end > TODAY ? TODAY : end;
};

/**
 * تحميل تقرير الطالب PDF.
 * ولي الأمر: تقرير شهري (يختار الشهر) أو فترة يحددها هو.
 * المشرف فقط (admin): التقرير الفصلي أيضًا.
 */
export default function ReportsPanel({ student, admin, className, dense }: { student: Student; admin?: boolean; className?: string; dense?: boolean }) {
  const { sessions, dailyWorship } = useData();
  const toast = useToast();
  const mine = useMemo(() => sessions.filter((s) => s.studentId === student.id), [sessions, student.id]);
  const worship = useMemo(() => dailyWorship.filter((d) => d.studentId === student.id), [dailyWorship, student.id]);

  const months = useMemo(
    () => [...new Set([monthKey(TODAY), ...mine.map((s) => monthKey(s.date)), ...worship.map((d) => monthKey(d.date))])].sort().reverse(),
    [mine, worship],
  );
  const earliest = useMemo(() => [...mine.map((s) => s.date), ...worship.map((d) => d.date)].sort()[0] ?? TODAY, [mine, worship]);

  const [kind, setKind] = useState<ReportKind>('month');
  const [month, setMonth] = useState(months[0]);
  const [from, setFrom] = useState(earliest);
  const [to, setTo] = useState(TODAY);
  const [busy, setBusy] = useState(false);

  const range = kind === 'month' ? { from: `${month}-01`, to: lastDayOfMonth(month) } : { from, to };
  const invalid = kind !== 'month' && (!from || !to || from > to);

  const run = async () => {
    if (invalid) return;
    setBusy(true);
    try {
      await downloadReport({ kind, student, sessions: mine, worship, ...range });
      toast('تم تجهيز التقرير وتحميله');
    } catch (e) {
      console.error(e);
      toast('تعذّر تجهيز التقرير، حاول مرة أخرى.');
    } finally {
      setBusy(false);
    }
  };

  const options: { key: ReportKind; icon: typeof FileText; title: string; desc: string }[] = [
    { key: 'month', icon: FileBarChart2, title: 'تقرير شهري', desc: 'الحفظ والمراجعة والحضور والعبادات لشهر تختاره' },
    { key: 'custom', icon: CalendarRange, title: 'فترة محددة', desc: 'اختر تاريخ البداية والنهاية بنفسك' },
    ...(admin ? [{ key: 'term' as const, icon: FileText, title: 'التقرير الفصلي', desc: 'ملخص الفصل كاملًا مع الأداء حسب الأشهر (للمشرف فقط)' }] : []),
  ];

  const pick = (k: ReportKind) => {
    setKind(k);
    if (k === 'term') {
      setFrom(earliest);
      setTo(TODAY);
    }
  };

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

      <div className={cx('grid gap-2', dense && (admin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'))} role="radiogroup">
        {options.map(({ key, icon: Icon, title, desc }) => (
          <button
            key={key}
            role="radio"
            aria-checked={kind === key}
            onClick={() => pick(key)}
            className={cx('flex items-center gap-3 rounded-xl border p-3 text-right transition', kind === key ? 'border-navy-800 bg-navy-50/70 ring-1 ring-navy-800' : 'border-navy-100 bg-white hover:bg-navy-50/50')}
          >
            <Icon className="h-5 w-5 shrink-0 text-burgundy-600" />
            <span className="flex-1">
              <span className="block text-[14px] font-bold text-navy-800">{title}</span>
              <span className="block text-[12px] text-navy-400">{desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3">
        {kind === 'month' ? (
          <Select ariaLabel="الشهر" value={month} onChange={setMonth} options={months.map((m) => ({ value: m, label: formatMonthKey(m) }))} />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[12px] text-navy-500">
              من تاريخ
              <input type="date" className="input mt-1" value={from} max={to || TODAY} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="text-[12px] text-navy-500">
              إلى تاريخ
              <input type="date" className="input mt-1" value={to} min={from} max={TODAY} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        )}
        {invalid && <p className="mt-2 text-[12px] text-burgundy-600">تاريخ البداية لازم يكون قبل تاريخ النهاية.</p>}
      </div>

      <button onClick={run} disabled={busy || invalid} className="btn-primary mt-3 w-full py-3">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? 'جارٍ تجهيز التقرير...' : 'تحميل التقرير'}
      </button>
    </section>
  );
}
