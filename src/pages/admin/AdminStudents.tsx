import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, LayoutGrid, List, PencilLine, Search, UserPlus } from 'lucide-react';
import { useData } from '@/context/DataContext';
import PageHeader from '@/components/shared/PageHeader';
import Select from '@/components/ui/Select';
import Avatar from '@/components/ui/Avatar';
import { CommitmentBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Progress';
import AdminStudentCard from '@/components/admin/AdminStudentCard';
import StudentFormModal from '@/components/admin/StudentFormModal';
import type { CommitmentLevel, Student } from '@/types';
import { studentStats } from '@/utils/stats';
import { cx, pct } from '@/utils/format';

type Sort = 'avg' | 'name' | 'attendance';

export default function AdminStudents() {
  const { students, sessions } = useData();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | CommitmentLevel>('all');
  const [sort, setSort] = useState<Sort>('avg');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [modal, setModal] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null });

  const rows = useMemo(() => {
    const r = students
      .map((s) => ({ s, st: studentStats(sessions, s.id) }))
      .filter(({ s, st }) => (s.name.includes(q.trim()) || s.username.includes(q.trim())) && (filter === 'all' || st.commitment === filter));
    return r.sort((a, b) => (sort === 'name' ? a.s.name.localeCompare(b.s.name, 'ar') : sort === 'attendance' ? b.st.attendance - a.st.attendance : b.st.cumulative - a.st.cumulative));
  }, [students, sessions, q, filter, sort]);

  return (
    <div>
      <PageHeader
        title="إدارة الطلاب"
        subtitle={`${students.length} طالبًا في المشروع`}
        actions={
          <button className="btn-accent" onClick={() => setModal({ open: true, student: null })}>
            <UserPlus className="h-4 w-4" />
            إضافة طالب
          </button>
        }
      />

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
          <input className="input pr-10" placeholder="ابحث باسم الطالب أو اسم المستخدم" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select
          className="w-40"
          ariaLabel="فلترة حسب الالتزام"
          value={filter}
          onChange={(v) => setFilter(v as typeof filter)}
          options={[
            { value: 'all', label: 'كل مستويات الالتزام' },
            { value: 'excellent', label: 'ممتاز' },
            { value: 'very_good', label: 'جيد جدًا' },
            { value: 'good', label: 'جيد' },
            { value: 'needs_work', label: 'يحتاج متابعة' },
          ]}
        />
        <Select
          className="w-40"
          ariaLabel="الترتيب"
          value={sort}
          onChange={(v) => setSort(v as Sort)}
          options={[
            { value: 'avg', label: 'الأعلى معدلًا' },
            { value: 'attendance', label: 'الأعلى حضورًا' },
            { value: 'name', label: 'حسب الاسم' },
          ]}
        />
        <div className="flex rounded-xl bg-navy-50 p-1">
          {(['list', 'grid'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cx('rounded-lg p-2 transition', view === v ? 'bg-white text-navy-900 shadow-soft' : 'text-navy-400')} aria-label={v === 'list' ? 'عرض قائمة' : 'عرض بطاقات'}>
              {v === 'list' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 && <p className="card-quiet p-10 text-center text-navy-400">لا يوجد طلاب مطابقون للبحث. غيّر كلمة البحث أو الفلتر.</p>}

      {view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map(({ s, st }) => (
            <AdminStudentCard key={s.id} student={s} stats={st} onEdit={() => setModal({ open: true, student: s })} />
          ))}
        </div>
      ) : (
        rows.length > 0 && (
          <section className="card overflow-hidden">
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[860px] text-[13px]">
                <thead className="bg-navy-50/60 text-right text-[12px] text-navy-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">الطالب</th>
                    <th className="px-3 py-3 font-medium">ولي الأمر</th>
                    <th className="w-44 px-3 py-3 font-medium">المعدل</th>
                    <th className="px-3 py-3 font-medium">معدل الشهر</th>
                    <th className="px-3 py-3 font-medium">الحضور</th>
                    <th className="px-3 py-3 font-medium">آخر علامة</th>
                    <th className="px-3 py-3 font-medium">الالتزام</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ s, st }) => (
                    <tr key={s.id} className="border-t border-navy-50 hover:bg-navy-50/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} src={s.photo} size={38} />
                          <div>
                            <p className="font-bold text-navy-900">{s.name}</p>
                            <p className="text-[11px] text-navy-400" dir="ltr">
                              {s.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-navy-600">{s.guardianName}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={st.cumulative} thin />
                          <b className="w-12 text-navy-900">{pct(st.cumulative)}</b>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-navy-700">{pct(st.monthAverage)}</td>
                      <td className="px-3 py-3 text-navy-700">{pct(st.attendance)}</td>
                      <td className="px-3 py-3 font-bold text-navy-900">{st.lastScore ?? '—'}</td>
                      <td className="px-3 py-3">
                        <CommitmentBadge level={st.commitment} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Link to={`/admin/students/${s.id}`} className="btn-soft px-3 py-1.5 text-[12px]">
                            <Eye className="h-3.5 w-3.5" /> عرض
                          </Link>
                          <button onClick={() => setModal({ open: true, student: s })} className="btn-ghost px-3 py-1.5 text-[12px]">
                            <PencilLine className="h-3.5 w-3.5" /> تعديل
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )
      )}

      <StudentFormModal open={modal.open} student={modal.student} onClose={() => setModal({ open: false, student: null })} />
    </div>
  );
}
