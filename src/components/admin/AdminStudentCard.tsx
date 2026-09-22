import { Link } from 'react-router-dom';
import { Eye, PencilLine } from 'lucide-react';
import type { Student } from '@/types';
import type { StudentStats } from '@/utils/stats';
import Avatar from '@/components/ui/Avatar';
import { AttendanceBadge, CommitmentBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import { pct } from '@/utils/format';

export default function AdminStudentCard({ student, stats, onEdit, rank }: { student: Student; stats: StudentStats; onEdit: () => void; rank?: number }) {
  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar name={student.name} src={student.photo} size={56} rounded="2xl" />
          {rank && rank <= 3 && <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-white ring-2 ring-white">{rank}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold text-navy-900">{student.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <CommitmentBadge level={stats.commitment} />
            {stats.lastSession && <AttendanceBadge status={stats.lastSession.attendance} />}
          </div>
        </div>
        <div className="text-left">
          <p className="text-[22px] font-extrabold leading-none text-navy-900">{stats.cumulative.toFixed(1)}</p>
          <p className="text-[11px] text-navy-400">المعدل</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          ['معدل الشهر', pct(stats.monthAverage)],
          ['الحضور', pct(stats.attendance)],
          ['آخر علامة', stats.lastScore ?? '—'],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-xl bg-navy-50/60 py-2">
            <dt className="text-[11px] text-navy-400">{k}</dt>
            <dd className="text-[14px] font-bold text-navy-800">{v}</dd>
          </div>
        ))}
      </dl>
      <ProgressBar value={stats.cumulative} thin className="mt-3" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to={`/admin/students/${student.id}`} className="btn-primary py-2 text-[13px]">
          <Eye className="h-4 w-4" />
          عرض الطالب
        </Link>
        <button onClick={onEdit} className="btn-ghost py-2 text-[13px]">
          <PencilLine className="h-4 w-4" />
          تعديل البيانات
        </button>
      </div>
    </article>
  );
}
