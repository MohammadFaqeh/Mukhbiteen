import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Activity, DailyWorship, HonorBoard, NextRequirement, SessionRecord, Student } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  activityFromRow,
  activityToRow,
  dailyWorshipFromRow,
  dailyWorshipToRow,
  honorBoardFromRow,
  honorBoardToRow,
  requirementFromRow,
  requirementToRow,
  sessionFromRow,
  sessionToRow,
  studentFromRow,
  studentToRow,
} from '@/lib/mappers';

interface AppData {
  students: Student[];
  sessions: SessionRecord[];
  dailyWorship: DailyWorship[];
  nextRequirements: NextRequirement[];
  activities: Activity[];
  honorBoards: HonorBoard[];
}

interface DataValue extends AppData {
  loading: boolean;
  error: string | null;
  getStudent: (id: string) => Student | undefined;
  getRequirement: (studentId: string) => NextRequirement | undefined;
  addStudent: (s: Omit<Student, 'id'>) => Promise<Student>;
  updateStudent: (id: string, patch: Partial<Student>) => Promise<void>;
  upsertSessions: (records: SessionRecord[]) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  upsertDailyWorship: (records: DailyWorship[]) => Promise<void>;
  saveRequirement: (r: NextRequirement) => Promise<void>;
  addActivity: (a: Omit<Activity, 'id'>) => Promise<void>;
  updateActivity: (id: string, patch: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  publishHonorBoard: (b: Omit<HonorBoard, 'id' | 'createdAt' | 'published'>) => Promise<HonorBoard>;
  unpublishHonorBoard: (id: string) => Promise<void>;
}

const DataContext = createContext<DataValue | null>(null);

const empty: AppData = { students: [], sessions: [], dailyWorship: [], nextRequirements: [], activities: [], honorBoards: [] };

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const loadAll = useCallback(async () => {
    // نظهر شاشة "جارٍ التحميل" فقط أول مرة — أي إعادة تحميل لاحقة بالخلفية ما لازم تمسح الصفحة الحالية وتعيد بنائها
    if (!loadedOnce.current) setLoading(true);
    setError(null);
    const [students, sessions, dailyWorship, nextRequirements, activities, honorBoards] = await Promise.all([
      supabase.from('students').select('*').order('name'),
      supabase.from('sessions').select('*'),
      supabase.from('daily_worship').select('*'),
      supabase.from('next_requirements').select('*'),
      supabase.from('activities').select('*'),
      supabase.from('honor_boards').select('*'),
    ]);
    const firstError = [students, sessions, dailyWorship, nextRequirements, activities, honorBoards].find((r) => r.error)?.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }
    setData({
      students: (students.data ?? []).map(studentFromRow),
      sessions: (sessions.data ?? []).map(sessionFromRow).sort((a, b) => b.date.localeCompare(a.date)),
      dailyWorship: (dailyWorship.data ?? []).map(dailyWorshipFromRow).sort((a, b) => b.date.localeCompare(a.date)),
      nextRequirements: (nextRequirements.data ?? []).map(requirementFromRow),
      activities: (activities.data ?? []).map(activityFromRow),
      honorBoards: (honorBoards.data ?? []).map(honorBoardFromRow).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
    loadedOnce.current = true;
    setLoading(false);
  }, []);

  // مفتاح ثابت يعتمد على هوية المستخدم فعليًا (دور + طالب + بريد)، بدل الاعتماد على مرجع الكائن user
  // الذي يتغيّر أحيانًا بدون أي تغيير حقيقي (مثلًا عند عودة التركيز لتبويب الموقع)
  const authKey = user ? `${user.role}|${user.studentId ?? ''}|${user.email}` : null;

  useEffect(() => {
    if (authKey) {
      loadAll();
    } else {
      loadedOnce.current = false;
      setData(empty);
      setError(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authKey, loadAll]);

  const getStudent = useCallback((id: string) => data.students.find((s) => s.id === id), [data.students]);
  const getRequirement = useCallback((sid: string) => data.nextRequirements.find((r) => r.studentId === sid), [data.nextRequirements]);

  const addStudent = useCallback(async (s: Omit<Student, 'id'>) => {
    const created: Student = { ...s, id: `s${Date.now().toString(36)}` };
    const { error: err } = await supabase.from('students').insert(studentToRow(created));
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, students: [...d.students, created].sort((a, b) => a.name.localeCompare(b.name, 'ar')) }));
    return created;
  }, []);

  const updateStudent = useCallback(async (id: string, patch: Partial<Student>) => {
    const { error: err } = await supabase.from('students').update(studentToRow(patch)).eq('id', id);
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, students: d.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }, []);

  const upsertSessions = useCallback(async (records: SessionRecord[]) => {
    const { error: err } = await supabase.from('sessions').upsert(records.map(sessionToRow), { onConflict: 'id' });
    if (err) throw new Error(err.message);
    setData((d) => {
      const map = new Map(d.sessions.map((s) => [s.id, s]));
      records.forEach((r) => map.set(r.id, r));
      return { ...d, sessions: [...map.values()].sort((a, b) => b.date.localeCompare(a.date)) };
    });
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('sessions').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) }));
  }, []);

  const upsertDailyWorship = useCallback(async (records: DailyWorship[]) => {
    const { error: err } = await supabase.from('daily_worship').upsert(records.map(dailyWorshipToRow), { onConflict: 'id' });
    if (err) throw new Error(err.message);
    setData((d) => {
      const map = new Map(d.dailyWorship.map((s) => [s.id, s]));
      records.forEach((r) => map.set(r.id, r));
      return { ...d, dailyWorship: [...map.values()].sort((a, b) => b.date.localeCompare(a.date)) };
    });
  }, []);

  const saveRequirement = useCallback(async (r: NextRequirement) => {
    const { error: err } = await supabase.from('next_requirements').upsert(requirementToRow(r), { onConflict: 'student_id' });
    if (err) throw new Error(err.message);
    setData((d) => ({
      ...d,
      nextRequirements: d.nextRequirements.some((x) => x.studentId === r.studentId)
        ? d.nextRequirements.map((x) => (x.studentId === r.studentId ? r : x))
        : [...d.nextRequirements, r],
    }));
  }, []);

  const addActivity = useCallback(async (a: Omit<Activity, 'id'>) => {
    const created: Activity = { ...a, id: `a${Date.now().toString(36)}` };
    const { error: err } = await supabase.from('activities').insert(activityToRow(created));
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, activities: [created, ...d.activities] }));
  }, []);

  const updateActivity = useCallback(async (id: string, patch: Partial<Activity>) => {
    const { error: err } = await supabase.from('activities').update(activityToRow(patch)).eq('id', id);
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, activities: d.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  }, []);

  const deleteActivity = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('activities').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));
  }, []);

  const publishHonorBoard = useCallback(async (board: Omit<HonorBoard, 'id' | 'createdAt' | 'published'>) => {
    const created: HonorBoard = { ...board, id: `hb${Date.now().toString(36)}`, published: true, createdAt: new Date().toISOString() };
    const { error: unpubErr } = await supabase.from('honor_boards').update({ published: false }).eq('published', true);
    if (unpubErr) throw new Error(unpubErr.message);
    const { error: err } = await supabase.from('honor_boards').insert(honorBoardToRow(created));
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, honorBoards: [created, ...d.honorBoards.map((h) => ({ ...h, published: false }))] }));
    return created;
  }, []);

  const unpublishHonorBoard = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('honor_boards').update({ published: false }).eq('id', id);
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, honorBoards: d.honorBoards.map((h) => (h.id === id ? { ...h, published: false } : h)) }));
  }, []);

  const value = useMemo<DataValue>(
    () => ({
      ...data,
      loading,
      error,
      getStudent,
      getRequirement,
      addStudent,
      updateStudent,
      upsertSessions,
      deleteSession,
      upsertDailyWorship,
      saveRequirement,
      addActivity,
      updateActivity,
      deleteActivity,
      publishHonorBoard,
      unpublishHonorBoard,
    }),
    [
      data,
      loading,
      error,
      getStudent,
      getRequirement,
      addStudent,
      updateStudent,
      upsertSessions,
      deleteSession,
      upsertDailyWorship,
      saveRequirement,
      addActivity,
      updateActivity,
      deleteActivity,
      publishHonorBoard,
      unpublishHonorBoard,
    ],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
