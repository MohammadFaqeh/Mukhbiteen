import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff, ListPlus, PencilLine, Search, Trash2 } from 'lucide-react';
import type { Assignment } from '@/types';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import AssignmentForm from '@/components/admin/AssignmentForm';
import { AssignmentStudentRow } from '@/components/admin/AssignmentTracker';
import { useData } from '@/context/DataContext';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { assignmentProgress, categoryLabels, requiredText } from '@/utils/assignments';
import { normalizeArabic } from '@/utils/recitationLog';
import { TODAY } from '@/utils/today';
import { cx, formatDate } from '@/utils/format';

type Filter = 'all' | 'open' | 'overdue' | 'completed';

/** بطاقة مطلوب: ملخص الإنجاز لكل الطلاب، وعند فتحها: صف لكل طالب لتسجيل الإنجاز أو تحديد الحالة */
function AssignmentCard({ a, onEdit, defaultOpen }: { a: Assignment; onEdit: () => void; defaultOpen?: boolean }) {
  const { students, deleteAssignment } = useData();
  const confirmDelete = useConfirmDelete();
  const [open, setOpen] = useState(!!defaultOpen);
  const rows = a.targets.map((t) => ({ t, st: students.find((s) => s.id === t.studentId), p: assignmentProgress(a, t.studentId, TODAY) }));
  const done = rows.filter((r) => r.p.stored === 'completed').length;
  const late = rows.filter((r) => r.p.overdue).length;
  const req = requiredText(a);
  return (
    <section id={`assignment-${a.id}`} className="card overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 p-4">
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-start gap-3 text-right" aria-expanded={open}>
          <ChevronDown className={cx('mt-1 h-4 w-4 shrink-0 text-navy-400 transition', open && 'rotate-180')} />
          <span className="min-w-0">
            <span className="block text-[15px] font-extrabold text-navy-900">{a.title}</span>
            <span className="mt-0.5 block text-[12px] text-navy-400">
              {categoryLabels[a.category]}
              {req && ` · ${req}`}
              {a.dueDate && ` · الاستحقاق ${formatDate(a.dueDate)}`}
            </span>
            {a.description && <span className="mt-1 block text-[13px] text-navy-600">{a.description}</span>}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="green">مكتمل {done}/{rows.length}</Badge>
          {late > 0 && <Badge tone="burgundy">متأخر {late}</Badge>}
          <Badge tone={a.visibleToParents ? 'navy' : 'gray'}>
            {a.visibleToParents ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {a.visibleToParents ? 'ظاهر للأهل' : 'للإدارة فقط'}
          </Badge>
          <button className="rounded-lg p-2 text-navy-400 hover:bg-navy-50 hover:text-navy-800" onClick={onEdit} aria-label="تعديل" title="تعديل">
            <PencilLine className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-2 text-navy-300 hover:bg-burgundy-50 hover:text-burgundy-600"
            aria-label="حذف"
            title="حذف"
            onClick={() => confirmDelete(`حذف المطلوب "${a.title}" وكل ما سُجّل عليه من إنجاز؟`, () => deleteAssignment(a.id), 'تم حذف المطلوب')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {open && (
        <div className="grid animate-fade-in gap-2 border-t border-navy-50 bg-paper/40 p-3 lg:grid-cols-2">
          {rows.map(({ t, st }) => (
            <AssignmentStudentRow key={t.studentId} a={a} studentId={t.studentId} studentName={st?.name ?? 'طالب محذوف'} photo={st?.photo} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdminAssignments() {
  const { assignments, assignmentsReady } = useData();
  const [params] = useSearchParams();
  const focus = params.get('id');
  const [modal, setModal] = useState<{ open: boolean; a: Assignment | null }>({ open: false, a: null });
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const list = useMemo(() => {
    const n = normalizeArabic(q);
    return assignments.filter((a) => {
      if (n && !normalizeArabic(`${a.title} ${a.description}`).includes(n)) return false;
      const ps = a.targets.map((t) => assignmentProgress(a, t.studentId, TODAY));
      if (filter === 'overdue') return ps.some((p) => p.overdue);
      if (filter === 'completed') return ps.length > 0 && ps.every((p) => p.stored === 'completed');
      if (filter === 'open') return ps.some((p) => p.stored !== 'completed');
      return true;
    });
  }, [assignments, q, filter]);

  return (
    <div>
      <PageHeader
        title="المطلوبات"
        subtitle="مطلوبات بأي عنوان (تجويد، حديث، درس، واجب، حفظ…) لطلاب محددين، مع متابعة إنجاز كل طالب"
        actions={
          assignmentsReady && (
            <button className="btn-accent" onClick={() => setModal({ open: true, a: null })}>
              <ListPlus className="h-4 w-4" /> مطلوب جديد
            </button>
          )
        }
      />
      {!assignmentsReady ? (
        <p className="card-quiet p-6 text-[14px] text-amber-800">ميزة المطلوبات تحتاج إلى تحديث قاعدة البيانات: افتح supabase/schema.sql وشغّله كاملًا من SQL Editor في Supabase، ثم حدّث الصفحة.</p>
      ) : (
        <>
          <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
              <input className="input pr-10" placeholder="ابحث بعنوان المطلوب أو وصفه" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select
              className="w-44"
              ariaLabel="فلترة المطلوبات"
              value={filter}
              onChange={(v) => setFilter(v as Filter)}
              options={[
                { value: 'all', label: 'كل المطلوبات' },
                { value: 'open', label: 'غير مكتملة' },
                { value: 'overdue', label: 'فيها متأخرون' },
                { value: 'completed', label: 'مكتملة للجميع' },
              ]}
            />
          </div>
          {list.length === 0 ? (
            <p className="card-quiet p-10 text-center text-navy-400">{assignments.length ? 'لا توجد مطلوبات مطابقة.' : 'لا توجد مطلوبات بعد. أضف أول مطلوب من زر "مطلوب جديد".'}</p>
          ) : (
            <div className="space-y-3">
              {list.map((a) => (
                <AssignmentCard key={a.id} a={a} defaultOpen={a.id === focus} onEdit={() => setModal({ open: true, a })} />
              ))}
            </div>
          )}
        </>
      )}
      <Modal open={modal.open} onClose={() => setModal({ open: false, a: null })} size="lg" title={modal.a ? 'تعديل المطلوب' : 'مطلوب جديد'}>
        <AssignmentForm key={modal.a?.id ?? 'new'} initial={modal.a} onSaved={() => setModal({ open: false, a: null })} onCancel={() => setModal({ open: false, a: null })} />
      </Modal>
    </div>
  );
}
