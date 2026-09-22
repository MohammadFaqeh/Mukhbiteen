/**
 * مخزن البيانات للواجهة التجريبية.
 * كل التعديلات تتم في الذاكرة وتُحفظ في localStorage للتجربة فقط.
 *
 * عند الربط مع Supabase: أبقِ نفس أسماء الدوال (addStudent, upsertSessions, ...)
 * واجعلها تستدعي supabase.from('...') ثم تحدّث الحالة، فلا تحتاج الصفحات لأي تغيير.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Activity, NextRequirement, SessionRecord, Student } from '@/types';
import { initialData, type AppData } from '@/data/mockData';

const KEY = 'mukhbiteen.demo.data.v1';

interface DataValue extends AppData {
  getStudent: (id: string) => Student | undefined;
  getRequirement: (studentId: string) => NextRequirement | undefined;
  addStudent: (s: Omit<Student, 'id'>) => Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  upsertSessions: (records: SessionRecord[]) => void;
  deleteSession: (id: string) => void;
  saveRequirement: (r: NextRequirement) => void;
  addActivity: (a: Omit<Activity, 'id'>) => void;
  updateActivity: (id: string, patch: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  resetDemo: () => void;
}

const DataContext = createContext<DataValue | null>(null);

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initialData, ...(JSON.parse(raw) as AppData) };
  } catch {
    /* تجاهل */
  }
  return initialData;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* التخزين غير متاح */
    }
  }, [data]);

  const getStudent = useCallback((id: string) => data.students.find((s) => s.id === id), [data.students]);
  const getRequirement = useCallback((sid: string) => data.nextRequirements.find((r) => r.studentId === sid), [data.nextRequirements]);

  const addStudent = useCallback((s: Omit<Student, 'id'>) => {
    const created: Student = { ...s, id: `s${Date.now().toString(36)}` };
    setData((d) => ({ ...d, students: [...d.students, created] }));
    return created;
  }, []);

  const updateStudent = useCallback((id: string, patch: Partial<Student>) => {
    setData((d) => ({ ...d, students: d.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }, []);

  const upsertSessions = useCallback((records: SessionRecord[]) => {
    setData((d) => {
      const map = new Map(d.sessions.map((s) => [s.id, s]));
      records.forEach((r) => map.set(r.id, r));
      return { ...d, sessions: [...map.values()].sort((a, b) => b.date.localeCompare(a.date)) };
    });
  }, []);

  const deleteSession = useCallback((id: string) => {
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
  }, []);

  const saveRequirement = useCallback((r: NextRequirement) => {
    setData((d) => ({
      ...d,
      nextRequirements: d.nextRequirements.some((x) => x.studentId === r.studentId)
        ? d.nextRequirements.map((x) => (x.studentId === r.studentId ? r : x))
        : [...d.nextRequirements, r],
    }));
  }, []);

  const addActivity = useCallback((a: Omit<Activity, 'id'>) => {
    setData((d) => ({ ...d, activities: [{ ...a, id: `a${Date.now().toString(36)}` }, ...d.activities] }));
  }, []);
  const updateActivity = useCallback((id: string, patch: Partial<Activity>) => {
    setData((d) => ({ ...d, activities: d.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  }, []);
  const deleteActivity = useCallback((id: string) => {
    setData((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));
  }, []);

  const resetDemo = useCallback(() => setData(initialData), []);

  const value = useMemo<DataValue>(
    () => ({ ...data, getStudent, getRequirement, addStudent, updateStudent, upsertSessions, deleteSession, saveRequirement, addActivity, updateActivity, deleteActivity, resetDemo }),
    [data, getStudent, getRequirement, addStudent, updateStudent, upsertSessions, deleteSession, saveRequirement, addActivity, updateActivity, deleteActivity, resetDemo],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
