import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Activity, DailyWorship, HonorBoard, NextRequirement, SessionRecord, Student, TajweedChapter, TajweedCourse, TajweedMaterial } from '@/types';
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
  tajweedMaterialFromRow,
  tajweedMaterialToRow,
} from '@/lib/mappers';

interface AppData {
  students: Student[];
  sessions: SessionRecord[];
  dailyWorship: DailyWorship[];
  nextRequirements: NextRequirement[];
  activities: Activity[];
  honorBoards: HonorBoard[];
  tajweedMaterials: TajweedMaterial[];
}

interface DataValue extends AppData {
  loading: boolean;
  error: string | null;
  getStudent: (id: string) => Student | undefined;
  getRequirement: (studentId: string) => NextRequirement | undefined;
  addStudent: (s: Omit<Student, 'id'>) => Promise<Student>;
  updateStudent: (id: string, patch: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  upsertSessions: (records: SessionRecord[]) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  deleteSessions: (ids: string[]) => Promise<void>;
  upsertDailyWorship: (records: DailyWorship[]) => Promise<void>;
  deleteDailyWorship: (ids: string[]) => Promise<void>;
  saveRequirement: (r: NextRequirement) => Promise<void>;
  deleteRequirement: (studentId: string) => Promise<void>;
  addActivity: (a: Omit<Activity, 'id'>) => Promise<void>;
  updateActivity: (id: string, patch: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  publishHonorBoard: (b: Omit<HonorBoard, 'id' | 'createdAt' | 'published'>) => Promise<HonorBoard>;
  unpublishHonorBoard: (id: string) => Promise<void>;
  deleteHonorBoard: (id: string) => Promise<void>;
  saveTajweedMaterial: (m: TajweedMaterial) => Promise<void>;
  saveTajweedChapters: (course: TajweedCourse, chapters: TajweedChapter[]) => Promise<void>;
}

const DataContext = createContext<DataValue | null>(null);

/** حذف جماعي على دفعات (حتى لا يطول رابط الطلب مع مئات المعرّفات) */
async function deleteIn(table: string, column: string, values: string[]) {
  for (let i = 0; i < values.length; i += 150) {
    const { error } = await supabase.from(table).delete().in(column, values.slice(i, i + 150));
    if (error) throw new Error(error.message);
  }
}

/** مسار الملف داخل حاوية التخزين من رابطه العام، أو null إن لم يكن من هذه الحاوية */
function storagePath(url: string | undefined, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

const empty: AppData = { students: [], sessions: [], dailyWorship: [], nextRequirements: [], activities: [], honorBoards: [], tajweedMaterials: [] };

/** رسالة واضحة لما تكون قاعدة البيانات أقدم من الكود (أعمدة/جداول جديدة بـ schema.sql لم تُنفَّذ بعد) */
const SCHEMA_HINT = 'قاعدة البيانات تحتاج إلى تحديث: افتح supabase/schema.sql وشغّله كاملًا من SQL Editor في Supabase، ثم أعد المحاولة.';
const schemaError = (msg: string, cols: RegExp) => new Error(cols.test(msg) ? SCHEMA_HINT : msg);

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
    const [students, sessions, dailyWorship, nextRequirements, activities, honorBoards, tajweedMaterials] = await Promise.all([
      supabase.from('students').select('*').order('name'),
      supabase.from('sessions').select('*'),
      supabase.from('daily_worship').select('*'),
      supabase.from('next_requirements').select('*'),
      supabase.from('activities').select('*'),
      supabase.from('honor_boards').select('*'),
      supabase.from('tajweed_materials').select('*'),
    ]);
    const firstError = [students, sessions, dailyWorship, nextRequirements, activities, honorBoards].find((r) => r.error)?.error;
    if (tajweedMaterials.error) console.warn('جدول tajweed_materials غير موجود — شغّل supabase/schema.sql', tajweedMaterials.error.message);
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
      // جدول المواد جديد: لو قاعدة البيانات ما تحدّثت بعد، الموقع يشتغل عادي بدون مواد التجويد
      tajweedMaterials: tajweedMaterials.error ? [] : (tajweedMaterials.data ?? []).map(tajweedMaterialFromRow),
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
    const created: Student = { ...s, id: `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` }; // لاحقة عشوائية: الاستيراد الجماعي يضيف عدة طلاب بنفس الجزء من الثانية
    const { error: err } = await supabase.from('students').insert(studentToRow(created));
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, students: [...d.students, created].sort((a, b) => a.name.localeCompare(b.name, 'ar')) }));
    return created;
  }, []);

  const updateStudent = useCallback(async (id: string, patch: Partial<Student>) => {
    const { error: err } = await supabase.from('students').update(studentToRow(patch)).eq('id', id);
    if (err) throw schemaError(err.message, /tajweed_/);
    setData((d) => ({ ...d, students: d.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  }, []);

  // حذف الطالب يحذف تلقائيًا (ON DELETE CASCADE) كل دوامه وعباداته ومطلوبه القادم من قاعدة البيانات
  const deleteStudent = useCallback(async (id: string) => {
    const photo = data.students.find((s) => s.id === id)?.photo;
    const { error: err } = await supabase.from('students').delete().eq('id', id);
    if (err) throw new Error(err.message);
    const path = storagePath(photo, 'student-photos');
    if (path) await supabase.storage.from('student-photos').remove([path]); // أفضل محاولة — فشلها لا يمنع الحذف
    setData((d) => ({
      ...d,
      students: d.students.filter((s) => s.id !== id),
      sessions: d.sessions.filter((s) => s.studentId !== id),
      dailyWorship: d.dailyWorship.filter((w) => w.studentId !== id),
      nextRequirements: d.nextRequirements.filter((r) => r.studentId !== id),
    }));
  }, [data.students]);

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

  const deleteSessions = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await deleteIn('sessions', 'id', ids);
    const set = new Set(ids);
    setData((d) => ({ ...d, sessions: d.sessions.filter((s) => !set.has(s.id)) }));
  }, []);

  const upsertDailyWorship = useCallback(async (records: DailyWorship[]) => {
    let { error: err } = await supabase.from('daily_worship').upsert(records.map(dailyWorshipToRow), { onConflict: 'id' });
    // قاعدة بيانات قديمة بدون عمود سورة الكهف — نحفظ اليوم بدونه بدل ما يفشل حفظ أهالي الطلاب
    if (err && /kahf/.test(err.message)) {
      console.warn('عمود kahf غير موجود بجدول daily_worship — شغّل تعديل schema.sql');
      ({ error: err } = await supabase.from('daily_worship').upsert(
        records.map((r) => {
          const { kahf: _k, ...row } = dailyWorshipToRow(r);
          return row;
        }),
        { onConflict: 'id' },
      ));
    }
    if (err) throw new Error(err.message);
    setData((d) => {
      const map = new Map(d.dailyWorship.map((s) => [s.id, s]));
      records.forEach((r) => map.set(r.id, r));
      return { ...d, dailyWorship: [...map.values()].sort((a, b) => b.date.localeCompare(a.date)) };
    });
  }, []);

  const deleteDailyWorship = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await deleteIn('daily_worship', 'id', ids);
    const set = new Set(ids);
    setData((d) => ({ ...d, dailyWorship: d.dailyWorship.filter((w) => !set.has(w.id)) }));
  }, []);

  const saveRequirement = useCallback(async (r: NextRequirement) => {
    const row: Record<string, unknown> = requirementToRow(r);
    let { error: err } = await supabase.from('next_requirements').upsert(row, { onConflict: 'student_id' });
    // قاعدة بيانات قديمة بدون أعمدة عدد الصفحات (supabase/schema.sql) — نحفظ المطلوب بدونها بدل ما يفشل الحفظ
    if (err && /(memorization|revision)_pages/.test(err.message)) {
      console.warn('أعمدة memorization_pages/revision_pages غير موجودة بجدول next_requirements — شغّل تعديل schema.sql');
      delete row.memorization_pages;
      delete row.revision_pages;
      ({ error: err } = await supabase.from('next_requirements').upsert(row, { onConflict: 'student_id' }));
    }
    if (err) throw new Error(err.message);
    setData((d) => ({
      ...d,
      nextRequirements: d.nextRequirements.some((x) => x.studentId === r.studentId)
        ? d.nextRequirements.map((x) => (x.studentId === r.studentId ? r : x))
        : [...d.nextRequirements, r],
    }));
  }, []);

  const deleteRequirement = useCallback(async (studentId: string) => {
    const { error: err } = await supabase.from('next_requirements').delete().eq('student_id', studentId);
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, nextRequirements: d.nextRequirements.filter((r) => r.studentId !== studentId) }));
  }, []);

  const addActivity = useCallback(async (a: Omit<Activity, 'id'>) => {
    const created: Activity = { ...a, id: `a${Date.now().toString(36)}` };
    const { error: err } = await supabase.from('activities').insert(activityToRow(created));
    if (err) throw schemaError(err.message, /images|title/);
    setData((d) => ({ ...d, activities: [created, ...d.activities] }));
  }, []);

  const updateActivity = useCallback(async (id: string, patch: Partial<Activity>) => {
    const { error: err } = await supabase.from('activities').update(activityToRow(patch)).eq('id', id);
    if (err) throw schemaError(err.message, /images|title/);
    setData((d) => ({ ...d, activities: d.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  }, []);

  const deleteActivity = useCallback(async (id: string) => {
    const images = data.activities.find((a) => a.id === id)?.images ?? [];
    const { error: err } = await supabase.from('activities').delete().eq('id', id);
    if (err) throw new Error(err.message);
    const paths = images.map((im) => storagePath(im.url, 'activity-images')).filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from('activity-images').remove(paths);
    setData((d) => ({ ...d, activities: d.activities.filter((a) => a.id !== id) }));
  }, [data.activities]);

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

  const deleteHonorBoard = useCallback(async (id: string) => {
    const { error: err } = await supabase.from('honor_boards').delete().eq('id', id);
    if (err) throw new Error(err.message);
    setData((d) => ({ ...d, honorBoards: d.honorBoards.filter((h) => h.id !== id) }));
  }, []);

  const saveTajweedMaterial = useCallback(async (m: TajweedMaterial) => {
    const row = tajweedMaterialToRow({ ...m, updatedAt: new Date().toISOString() });
    const { error: err } = await supabase.from('tajweed_materials').upsert(row, { onConflict: 'course' });
    if (err) throw schemaError(err.message, /tajweed_materials|relation|schema cache/);
    const saved = tajweedMaterialFromRow(row);
    // رفع الملف ما بيلمس عمود الفصول بقاعدة البيانات، فنحافظ عليها محليًا كمان
    setData((d) => {
      const old = d.tajweedMaterials.find((x) => x.course === m.course);
      return { ...d, tajweedMaterials: [...d.tajweedMaterials.filter((x) => x.course !== m.course), { ...saved, chapters: old?.chapters ?? [] }] };
    });
  }, []);

  /** فصول الدورة فقط (بدون لمس ملف المادة) */
  const saveTajweedChapters = useCallback(async (course: TajweedCourse, chapters: TajweedChapter[]) => {
    const { error: err } = await supabase.from('tajweed_materials').upsert({ course, chapters }, { onConflict: 'course' });
    if (err) throw schemaError(err.message, /chapters|tajweed_materials|relation|schema cache/);
    setData((d) => {
      const old = d.tajweedMaterials.find((x) => x.course === course);
      return { ...d, tajweedMaterials: [...d.tajweedMaterials.filter((x) => x.course !== course), { ...(old ?? { course }), chapters }] };
    });
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
      deleteStudent,
      upsertSessions,
      deleteSession,
      deleteSessions,
      upsertDailyWorship,
      deleteDailyWorship,
      saveRequirement,
      deleteRequirement,
      addActivity,
      updateActivity,
      deleteActivity,
      publishHonorBoard,
      unpublishHonorBoard,
      deleteHonorBoard,
      saveTajweedMaterial,
      saveTajweedChapters,
    }),
    [
      data,
      loading,
      error,
      getStudent,
      getRequirement,
      addStudent,
      updateStudent,
      deleteStudent,
      upsertSessions,
      deleteSession,
      deleteSessions,
      upsertDailyWorship,
      deleteDailyWorship,
      saveRequirement,
      deleteRequirement,
      addActivity,
      updateActivity,
      deleteActivity,
      publishHonorBoard,
      unpublishHonorBoard,
      deleteHonorBoard,
      saveTajweedMaterial,
      saveTajweedChapters,
    ],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
