import { useMemo, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import type { Student } from '@/types';
import { downloadReport } from '@/utils/report';
import { TODAY } from '@/utils/today';
import { cx } from '@/utils/format';

const shiftDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** آخر يوم بالشهر السابق، وأول يومه */
const lastMonthRange = () => {
  const end = shiftDays(`${TODAY.slice(0, 7)}-01`, -1);
  return { from: `${end.slice(0, 7)}-01`, to: end };
};

/** تحميل تقرير الطالب PDF عن فترة يحددها المشرف أو ولي الأمر (مع اختصارات جاهزة لأشهر الفترات) */
export default function ReportsPanel({ student, className }: { student: Student; className?: string }) {
  const { sessions, dailyWorship, tajweedMaterials } = useData();
  const toast = useToast();
  const mine = useMemo(() => sessions.filter((s) => s.studentId === student.id), [sessions, student.id]);
  const worship = useMemo(() => dailyWorship.filter((d) => d.studentId === student.id), [dailyWorship, student.id]);
  const earliest = useMemo(() => [...mine.map((s) => s.date), ...worship.map((d) => d.date)].sort()[0] ?? TODAY, [mine, worship]);

  const presets = [
    { label: 'آخر أسبوع', from: shiftDays(TODAY, -6), to: TODAY },
    { label: 'هذا الشهر', from: `${TODAY.slice(0, 7)}-01`, to: TODAY },
    { label: 'آخر 30 يوم', from: shiftDays(TODAY, -29), to: TODAY },
    { label: 'الشهر الماضي', ...lastMonthRange() },
    { label: 'من البداية', from: earliest, to: TODAY },
  ];

  const [from, setFrom] = useState(presets[1].from);
  const [to, setTo] = useState(TODAY);
  const [busy, setBusy] = useState(false);
  const invalid = !from || !to || from > to;

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

      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setFrom(p.from);
              setTo(p.to);
            }}
            className={cx(
              'rounded-full border px-3 py-1.5 text-[12px] font-bold transition',
              from === p.from && to === p.to ? 'border-navy-800 bg-navy-800 text-white' : 'border-navy-100 bg-white text-navy-600 hover:bg-navy-50',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
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
        {invalid && <p className="mt-2 text-[12px] text-burgundy-600">تاريخ البداية لازم يكون قبل تاريخ النهاية.</p>}
      </div>

      <button onClick={run} disabled={busy || invalid} className="btn-primary mt-3 w-full py-3">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? 'جارٍ تجهيز التقرير...' : 'تحميل التقرير'}
      </button>
    </section>
  );
}
