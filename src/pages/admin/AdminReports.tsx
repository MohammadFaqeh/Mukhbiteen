import { useMemo, useState } from 'react';
import { Award, Loader2, Medal, Trophy } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/shared/PageHeader';
import Select from '@/components/ui/Select';
import Avatar from '@/components/ui/Avatar';
import { CommitmentBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { studentStats, studentStatsInRange } from '@/utils/stats';
import { periodPresets } from '@/utils/period';
import { cx, formatDate, pct } from '@/utils/format';

type Mode = 'normal' | 'honor';

export default function AdminReports() {
  const { students, sessions, dailyWorship, honorBoards, publishHonorBoard, unpublishHonorBoard } = useData();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('normal');

  const presets = useMemo(() => periodPresets(sessions), [sessions]);
  const [periodKey, setPeriodKey] = useState('month');
  const [customFrom, setCustomFrom] = useState(presets[2]?.from ?? '');
  const [customTo, setCustomTo] = useState(presets[2]?.to ?? '');
  const period =
    periodKey === 'custom'
      ? { key: 'custom', label: 'فترة مخصصة', from: customFrom, to: customTo }
      : presets.find((p) => p.key === periodKey) ?? presets[0];

  const rows = useMemo(
    () =>
      students
        .map((s) => ({ s, all: studentStats(sessions, dailyWorship, s.id), range: studentStatsInRange(sessions, dailyWorship, s.id, period.from, period.to) }))
        .sort((a, b) => b.range.average - a.range.average),
    [students, sessions, dailyWorship, period.from, period.to],
  );

  const publishedBoard = honorBoards.find((h) => h.published);

  const [title, setTitle] = useState('');
  const [publishing, setPublishing] = useState(false);
  const ranked = rows.filter((r) => r.range.sessionsCount > 0);

  const publish = async () => {
    setPublishing(true);
    try {
      await publishHonorBoard({
        title: title.trim() || `لوحة الشرف – ${period.label}`,
        periodFrom: period.from,
        periodTo: period.to,
        entries: ranked.map((r, i) => ({ studentId: r.s.id, name: r.s.name, photo: r.s.photo, average: r.range.average, rank: i + 1 })),
      });
      toast('تم نشر لوحة الشرف لكل أولياء الأمور');
      setTitle('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'حدث خطأ أثناء النشر.');
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    if (!publishedBoard) return;
    if (!confirm('إلغاء نشر لوحة الشرف الحالية عن كل أولياء الأمور؟')) return;
    try {
      await unpublishHonorBoard(publishedBoard.id);
      toast('تم إلغاء نشر لوحة الشرف');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'حدث خطأ.');
    }
  };

  return (
    <div>
      <PageHeader
        title="التقارير"
        subtitle={`تقرير المجموعة – ${period.label}`}
        actions={
          <>
            <Select className="w-40" ariaLabel="الفترة" value={periodKey} onChange={setPeriodKey} options={[...presets.map((p) => ({ value: p.key, label: p.label })), { value: 'custom', label: 'فترة مخصصة' }]} />
            {periodKey === 'custom' && (
              <>
                <input type="date" className="input w-40" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} aria-label="من تاريخ" />
                <input type="date" className="input w-40" value={customTo} onChange={(e) => setCustomTo(e.target.value)} aria-label="إلى تاريخ" />
              </>
            )}
          </>
        }
      />

      <div className="mb-4 inline-flex rounded-xl bg-navy-50 p-1">
        {([
          ['normal', 'الترتيب العادي'],
          ['honor', 'لوحة الشرف'],
        ] as const).map(([k, label]) => (
          <button key={k} onClick={() => setMode(k)} className={cx('rounded-lg px-4 py-2 text-[13px] font-bold transition', mode === k ? 'bg-white text-navy-900 shadow-soft' : 'text-navy-500')}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'normal' ? (
        <section className="card overflow-hidden">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[820px] text-[13px]">
              <thead className="bg-navy-50/60 text-right text-[12px] text-navy-500">
                <tr>
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-3 py-3 font-medium">الطالب</th>
                  <th className="w-44 px-3 py-3 font-medium">معدل الفترة</th>
                  <th className="px-3 py-3 font-medium">المعدل التراكمي</th>
                  <th className="px-3 py-3 font-medium">الحضور</th>
                  <th className="px-3 py-3 font-medium">العبادات</th>
                  <th className="px-3 py-3 font-medium">الالتزام</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ s, all, range }, i) => (
                  <tr key={s.id} className="border-t border-navy-50">
                    <td className="px-5 py-2.5 font-bold text-navy-400">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} src={s.photo} size={32} />
                        <span className="font-bold text-navy-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={range.average} thin tone="burgundy" />
                        <b className="w-12">{pct(range.average)}</b>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-navy-700">{pct(all.cumulative)}</td>
                    <td className="px-3 py-2.5 text-navy-700">{pct(range.attendance)}</td>
                    <td className="px-3 py-2.5 text-navy-700">{pct(range.worship)}</td>
                    <td className="px-3 py-2.5">
                      <CommitmentBadge level={all.commitment} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {publishedBoard && (
            <section className="card flex flex-wrap items-center justify-between gap-3 border-emerald-200 bg-emerald-50/60 p-4">
              <div>
                <p className="text-[13px] font-bold text-emerald-800">لوحة الشرف "{publishedBoard.title}" منشورة حاليًا لكل أولياء الأمور</p>
                <p className="text-[12px] text-emerald-700">الفترة: {formatDate(publishedBoard.periodFrom)} – {formatDate(publishedBoard.periodTo)}</p>
              </div>
              <button className="btn-ghost border-burgundy-200 text-burgundy-600 hover:bg-burgundy-50" onClick={unpublish}>
                إلغاء النشر
              </button>
            </section>
          )}

          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="section-title">معاينة لوحة الشرف — {period.label}</h3>
              <input className="input w-64" placeholder={`لوحة الشرف – ${period.label}`} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {ranked.length === 0 ? (
              <p className="text-navy-400">لا توجد بيانات كافية لهذه الفترة.</p>
            ) : (
              <>
                {/* المراكز الثلاثة الأولى */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {ranked.slice(0, 3).map((r, i) => {
                    const tone = [
                      { bg: 'from-gold-400/25 to-white', ring: 'ring-gold-400', icon: 'text-gold-600', Icon: Trophy },
                      { bg: 'from-navy-100 to-white', ring: 'ring-navy-300', icon: 'text-navy-500', Icon: Medal },
                      { bg: 'from-burgundy-100 to-white', ring: 'ring-burgundy-300', icon: 'text-burgundy-500', Icon: Award },
                    ][i];
                    return (
                      <div key={r.s.id} className={cx('flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-b p-5 text-center ring-2', tone.bg, tone.ring)}>
                        <tone.Icon className={cx('h-6 w-6', tone.icon)} />
                        <Avatar name={r.s.name} src={r.s.photo} size={64} />
                        <p className="font-extrabold text-navy-900">{r.s.name}</p>
                        <p className="text-[12px] text-navy-500">المركز {i + 1}</p>
                        <p className="text-[20px] font-extrabold text-navy-900">{pct(r.range.average)}</p>
                      </div>
                    );
                  })}
                </div>
                {/* باقي الترتيب */}
                {ranked.length > 3 && (
                  <ul className="divide-y divide-navy-50 rounded-xl border border-navy-50">
                    {ranked.slice(3).map((r, i) => (
                      <li key={r.s.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-6 text-center text-[13px] font-bold text-navy-400">{i + 4}</span>
                        <Avatar name={r.s.name} src={r.s.photo} size={30} />
                        <span className="flex-1 text-[13px] font-medium text-navy-800">{r.s.name}</span>
                        <b className="text-[13px] text-navy-700">{pct(r.range.average)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="flex justify-end">
              <button className="btn-accent px-6" onClick={publish} disabled={publishing || ranked.length === 0}>
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                نشر للأهالي
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
