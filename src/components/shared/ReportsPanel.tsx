import { useState } from 'react';
import { CalendarRange, Download, FileBarChart2, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { cx } from '@/utils/format';

/** أزرار التقارير (واجهة فقط – لا يتم إنشاء PDF حقيقي حاليًا) */
export default function ReportsPanel({ studentName, className, dense }: { studentName: string; className?: string; dense?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = (key: string, msg: string) => {
    setBusy(key);
    setTimeout(() => {
      setBusy(null);
      toast(msg);
    }, 900);
  };
  const items = [
    { key: 'month', icon: FileBarChart2, title: 'تقرير الشهر الحالي', desc: 'العلامات والحضور والعبادات لشهر سبتمبر', msg: 'تم تجهيز تقرير الشهر (تجريبي)' },
    { key: 'term', icon: CalendarRange, title: 'تقرير الفصل', desc: 'ملخص الأداء منذ بداية الفصل', msg: 'تم تجهيز تقرير الفصل (تجريبي)' },
  ];
  return (
    <section className={cx('card p-5', className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
          <FileText className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h3 className="section-title">التقارير</h3>
          <p className="text-[12px] text-navy-400">{studentName}</p>
        </div>
      </div>
      <div className={cx('grid gap-3', dense ? 'sm:grid-cols-2' : '')}>
        {items.map(({ key, icon: Icon, title, desc, msg }) => (
          <button key={key} onClick={() => run(key, msg)} className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white p-3 text-right transition hover:border-navy-200 hover:bg-navy-50/50">
            <Icon className="h-5 w-5 shrink-0 text-burgundy-600" />
            <span className="flex-1">
              <span className="block text-[14px] font-bold text-navy-800">{title}</span>
              <span className="block text-[12px] text-navy-400">{desc}</span>
            </span>
            {busy === key && <Loader2 className="h-4 w-4 animate-spin text-navy-400" />}
          </button>
        ))}
      </div>
      <button onClick={() => run('dl', 'بدأ تحميل التقرير (ملف تجريبي)')} className={cx('btn-primary mt-3 w-full')}>
        {busy === 'dl' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        تحميل التقرير
      </button>
    </section>
  );
}
