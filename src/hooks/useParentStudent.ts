import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { studentSessions, studentStats } from '@/utils/stats';

/** يعيد الطالب المرتبط بحساب ولي الأمر الحالي مع سجلاته وإحصائياته */
export function useParentStudent() {
  const { user } = useAuth();
  const { students, sessions, dailyWorship, getRequirement, activities } = useData();
  const id = user?.studentId ?? students[0]?.id;
  return useMemo(() => {
    const student = students.find((s) => s.id === id);
    return {
      student,
      sessions: id ? studentSessions(sessions, id) : [],
      worship: id ? dailyWorship.filter((d) => d.studentId === id).sort((a, b) => b.date.localeCompare(a.date)) : [],
      stats: id ? studentStats(sessions, dailyWorship, id) : undefined,
      requirement: id ? getRequirement(id) : undefined,
      activities,
    };
  }, [id, students, sessions, dailyWorship, getRequirement, activities]);
}
