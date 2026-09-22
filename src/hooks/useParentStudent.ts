import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { studentSessions, studentStats } from '@/utils/stats';

/** يعيد الطالب المرتبط بحساب ولي الأمر الحالي مع سجلاته وإحصائياته */
export function useParentStudent() {
  const { user } = useAuth();
  const { students, sessions, getRequirement, activities } = useData();
  const id = user?.studentId ?? students[0]?.id;
  return useMemo(() => {
    const student = students.find((s) => s.id === id);
    return {
      student,
      sessions: id ? studentSessions(sessions, id) : [],
      stats: id ? studentStats(sessions, id) : undefined,
      requirement: id ? getRequirement(id) : undefined,
      activities,
    };
  }, [id, students, sessions, getRequirement, activities]);
}
