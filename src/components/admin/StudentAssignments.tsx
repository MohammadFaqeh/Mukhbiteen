import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeOff, ListPlus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import AssignmentForm from './AssignmentForm';
import { AssignmentStudentRow } from './AssignmentTracker';
import { useData } from '@/context/DataContext';
import { categoryLabels, studentAssignments } from '@/utils/assignments';

/** تبويب "المطلوبات" بصفحة الطالب: مطلوباته مع إنجازه وتسجيل التسميع عليها، وإضافة مطلوب له مباشرة */
export default function StudentAssignments({ studentId }: { studentId: string }) {
  const { assignments, assignmentsReady, getStudent } = useData();
  const [adding, setAdding] = useState(false);
  const st = getStudent(studentId);
  const list = studentAssignments(assignments, studentId);

  if (!assignmentsReady)
    return <p className="card-quiet p-6 text-[14px] text-amber-800">ميزة المطلوبات تحتاج إلى تحديث قاعدة البيانات: شغّل supabase/schema.sql كاملًا من SQL Editor في Supabase.</p>;

  return (
    <div className="space-y-3">
      <button onClick={() => setAdding(true)} className="card flex w-full items-center justify-center gap-2 border-dashed p-4 text-[14px] font-bold text-burgundy-600 hover:bg-white">
        <ListPlus className="h-5 w-5" /> مطلوب جديد لهذا الطالب
      </button>
      {list.length === 0 && <p className="card-quiet p-8 text-center text-navy-400">لا توجد مطلوبات لهذا الطالب.</p>}
      {list.map((a) => (
        <section key={a.id} className="card p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <Link to={`/admin/assignments?id=${a.id}`} className="text-[15px] font-extrabold text-navy-900 hover:underline">
                {a.title}
              </Link>
              <span className="mr-2 text-[12px] text-navy-400">{categoryLabels[a.category]}</span>
              {!a.visibleToParents && (
                <span className="mr-2 inline-flex items-center gap-1 text-[11px] text-navy-400">
                  <EyeOff className="h-3 w-3" /> للإدارة فقط
                </span>
              )}
            </div>
          </div>
          {a.description && <p className="mb-2 text-[13px] text-navy-600">{a.description}</p>}
          <AssignmentStudentRow a={a} studentId={studentId} studentName={st?.name ?? ''} showName={false} />
        </section>
      ))}
      <Modal open={adding} onClose={() => setAdding(false)} size="lg" title="مطلوب جديد" subtitle={st?.name}>
        <AssignmentForm presetStudents={[studentId]} onSaved={() => setAdding(false)} onCancel={() => setAdding(false)} />
      </Modal>
    </div>
  );
}
