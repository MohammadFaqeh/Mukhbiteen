import type { ReactNode } from 'react';
import { BookOpen, Medal, RotateCcw } from 'lucide-react';
import type { SessionRecord } from '@/types';
import type { StudentStats } from '@/utils/stats';
import { ProgressBar } from '@/components/ui/Progress';
import { CommitmentBadge } from '@/components/ui/Badge';
import { commitmentLabels, formatNumericDate } from '@/utils/format';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-navy-100 py-2 text-[13px] last:border-0">
      <span className="text-navy-400">{label}</span>
      <span className="text-left font-bold text-navy-800">{value}</span>
    </div>
  );
}

export function MemorizationCard({ last }: { last?: SessionRecord }) {
  const m = last?.memorization;
  return (
    <section className="card flex h-full flex-col p-5">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-800 text-white">
          <BookOpen className="h-[18px] w-[18px]" />
        </span>
        <h3 className="section-title">الحفظ</h3>
      </header>
      {m ? (
        <>
          <p className="text-[12px] text-navy-400">آخر حفظ مطلوب</p>
          <p className="text-[16px] font-bold text-navy-900">{m.required}</p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[12px]">
              <span className="text-navy-400">نسبة الإنجاز</span>
              <b className="text-navy-800">{m.completion}%</b>
            </div>
            <ProgressBar value={m.completion} />
          </div>
          <div className="mt-2">
            <Row label="تقييم التسميع" value={`${m.grade}/100`} />
            <Row label="تم التسميع" value={m.recited} />
            <Row label="آخر تحديث" value={formatNumericDate(last!.date)} />
          </div>
        </>
      ) : (
        <p className="text-[13px] text-navy-400">لا يوجد حفظ مسجل.</p>
      )}
    </section>
  );
}

export function RevisionCard({ sessions }: { sessions: SessionRecord[] }) {
  const s = sessions.find((x) => x.revision);
  const r = s?.revision;
  return (
    <section className="card flex h-full flex-col p-5">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-burgundy-600 text-white">
          <RotateCcw className="h-[18px] w-[18px]" />
        </span>
        <h3 className="section-title">المراجعة</h3>
      </header>
      {r ? (
        <>
          <p className="text-[12px] text-navy-400">المراجعة المطلوبة</p>
          <p className="text-[16px] font-bold text-navy-900">{r.required}</p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[12px]">
              <span className="text-navy-400">الإنجاز</span>
              <b className="text-navy-800">{r.completion}%</b>
            </div>
            <ProgressBar value={r.completion} tone="burgundy" />
          </div>
          <div className="mt-2">
            <Row label="التقييم" value={`${r.grade}/100`} />
            <Row label="ما تمت مراجعته" value={r.revised} />
            <Row label="آخر تحديث" value={formatNumericDate(s!.date)} />
          </div>
        </>
      ) : (
        <p className="text-[13px] text-navy-400">لا توجد مراجعة مسجلة.</p>
      )}
    </section>
  );
}

export function CommitmentCard({ stats }: { stats: StudentStats }) {
  const lvl = stats.commitment;
  const scale = ['needs_work', 'good', 'very_good', 'excellent'] as const;
  const idx = scale.indexOf(lvl);
  return (
    <section className="card relative flex h-full flex-col overflow-hidden p-5">
      <header className="mb-3 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand-100 text-gold-600">
          <Medal className="h-[18px] w-[18px]" />
        </span>
        <h3 className="section-title">الالتزام في الدوام</h3>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 text-gold-400" aria-hidden>
            <g fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="18" y="18" width="64" height="64" rx="4" />
              <rect x="18" y="18" width="64" height="64" rx="4" transform="rotate(45 50 50)" />
            </g>
          </svg>
          <span className="text-[20px] font-extrabold text-navy-900">{commitmentLabels[lvl]}</span>
        </div>
        <CommitmentBadge level={lvl} className="mt-3" />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {scale.map((s, k) => (
          <span key={s} className={k <= idx ? 'h-1.5 rounded-full bg-gold-500' : 'h-1.5 rounded-full bg-navy-50'} />
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-navy-400">بناءً على آخر 8 أيام دوام</p>
    </section>
  );
}
