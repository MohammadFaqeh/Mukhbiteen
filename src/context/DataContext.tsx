import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  Activity,
  Assignment,
  AssignmentProgress,
  AssignmentStoredStatus,
  DailyWorship,
  HonorBoard,
  NextRequirement,
  SessionRecord,
  Student,
  TajweedChapter,
  TajweedCourse,
  TajweedMaterial,
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  activityFromRow,
  activityToRow,
  assignmentFromRow,
  assignmentToRow,
  dailyWorshipFromRow,
  dailyWorshipToRow,
  honorBoardFromRow,
  honorBoardToRow,
  progressToRow,
  requirementFromRow,
  requirementToRow,
  sessionFromRow,
  sessionToRow,
  studentFromRow,
  studentToRow,
  tajweedMaterialFromRow,
  tajweedMaterialToRow,
} from '@/lib/mappers';
import { entryCompletion } from '@/utils/quran';
import { syncAutoJuz } from '@/utils/juz';
import { assignmentProgress } from '@/utils/assignments';
import { TODAY } from '@/utils/today';

interface AppData {
  students: Student[];
  sessions: SessionRecord[];
  dailyWorship: DailyWorship[];
  nextRequirements: NextRequirement[];
  activities: Activity[];
  honorBoards: HonorBoard[];
  tajweedMaterials: TajweedMaterial[];
  assignments: Assignment[];
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
  /** هل جداول المطلوبات موجودة بقاعدة البيانات؟ (false = لم يُشغَّل تحديث schema.sql بعد) */
  assignmentsReady: boolean;
  saveAssignment: (a: Assignment, studentIds: string[]) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  setAssignmentStatus: (assignmentId: string, studentId: string, status: AssignmentStoredStatus) => Promise<void>;
  addAssignmentProgress: (p: AssignmentProgress) => Promise<void>;
  deleteAssignmentProgress: (p: AssignmentProgress) => Promise<void>;
  /** تشغيل قواعد الإشعارات التلقائية فورًا (بدل انتظار الجدولة) — لا يرمي خطأ */
  runNotificationRules: () => Promise<void>;
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

const empty: AppData = { students: [], sessions: [], dailyWorship: [], nextRequirements: [], activities: [], honorBoards: [], tajweedMaterials: [], assignments: [] };

/** نسبة الإنجاز تُحسب دائمًا من المصدر الموحّد قبل الحفظ (لا تُقبل نسبة مُدخلة) */
function normalizeSession(r: SessionRecord): SessionRecord {
  return {
    ...r,
    memorization: r.memorization ? { ...r.memorization, completion: entryCompletion(r.memorization) } : r.memorization,
    revision: r.revision ? { ...r.revision, completion: entryCompletion(r.revision) } : r.revision,
  };
}

const ASSIGNMENT_SELECT = '*, assignment_students(*)';

/** رسالة واضحة لما تكون قاعدة البيانات أقدم من الكود (أعمدة/جداول جديدة بـ schema.sql لم تُنفَّذ بعد) */
const SCHEMA_HINT = 'قاعدة البيانات تحتاج إلى تحديث: افتح supabase/schema.sql وشغّله كاملًا من SQL Editor في Supabase، ثم أعد المحاولة.';
const schemaError = (msg: string, cols: RegExp) => new Error(cols.test(msg) ? SCHEMA_HINT : msg);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);
  const [assignmentsReady, setAssignmentsReady] = useState(false);
  // أحدث نسخة من البيانات للدوال غير المتزامنة (إعادة حساب الأجزاء بعد الحفظ)
  const dataRef = useRef<AppData>(empty);
  dataRef.current = data;

  const loadAll = useCallback(async () => {
    // نظهر شاشة "جارٍ التحميل" فقط أول مرة — أي إعادة تحميل لاحقة بالخلفية ما لازم تمسح الصفحة الحالية وتعيد بنائها
    if (!loadedOnce.current) setLoading(true);
    setError(null);
    const [students, sessions, dailyWorship, nextRequirements, activities, honorBoards, tajweedMaterials, assignments, assignmentProgressRows] = await Promise.all([
      supabase.from('students').select('*').order('name'),
      supabase.from('sessions').select('*'),
      supabase.from('daily_worship').select('*'),
      supabase.from('next_requirements').select('*'),
      supabase.from('activities').select('*'),
      supabase.from('honor_boards').select('*'),
      supabase.from('tajweed_materials').select('*'),
      supabase.from('assignments').select(ASSIGNMENT_SELECT).order('created_at', { ascending: false }),
      supabase.from('assignment_progress').select('*'),
    ]);
    const firstError = [students, sessions, dailyWorship, nextRequirements, activities, honorBoards].find((r) => r.error)?.error;
    if (tajweedMaterials.error) console.warn('جدول tajweed_materials غير موجود — شغّل supabase/schema.sql', tajweedMaterials.error.message);
    // جداول المطلوبات جديدة: لو قاعدة البيانات ما تحدّثت بعد، الموقع يشتغل عادي بدونها
    const assignmentError = assignments.error ?? assignmentProgressRows.error;
    if (assignmentError) console.warn('تعذّر تحميل المطلوبات وسجلات إنجازها', assignmentError.message);
    setAssignmentsReady(!assignmentError);
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
      assignments: assignmentError
        ? []
        : (() => {
            const progressByAssignment = new Map<string, typeof assignmentProgressRows.data>();
            for (const progress of assignmentProgressRows.data ?? []) {
              const rows = progressByAssignment.get(progress.assignment_id) ?? [];
              rows.push(progress);
              progressByAssignment.set(progress.assignment_id, rows);
            }
            return (assignments.data ?? []).map((assignment) =>
              assignmentFromRow({ ...assignment, assignment_progress: progressByAssignment.get(assignment.id) ?? [] }),
            );
          })(),
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
    if (err) throw schemaError(err.message, /tajweed_|memorized_juz/);
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
      assignments: d.assignments.map((a) => ({ ...a, targets: a.targets.filter((t) => t.studentId !== id), progress: a.progress.filter((p) => p.studentId !== id) })),
    }));
  }, [data.students]);

  /**
   * إعادة حساب الأجزاء المكتملة تلقائيًا لطلاب بعد أي تغيير بالتسميع (حفظ/تعديل/حذف).
   * فشلها لا يُفشل حفظ التسميع نفسه (مثلًا قاعدة بيانات لم تُحدَّث بعد)، وتُصحَّح عند الحفظ التالي.
   */
  const syncJuz = useCallback(async (studentIds: string[], sessions: SessionRecord[], assignments: Assignment[]) => {
    for (const id of new Set(studentIds)) {
      const st = dataRef.current.students.find((s) => s.id === id);
      if (!st) continue;
      const patch = syncAutoJuz(st, sessions, assignments);
      if (!patch) continue;
      const { error: err } = await supabase.from('students').update(studentToRow(patch)).eq('id', id);
      if (err) {
        console.warn('تعذّر تحديث الأجزاء المحفوظة تلقائيًا', err.message);
        continue;
      }
      setData((d) => ({ ...d, students: d.students.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
    }
  }, []);

  const runNotificationRules = useCallback(async () => {
    const { error: err } = await supabase.rpc('run_notification_rules');
    if (err) console.warn('تعذّر تشغيل قواعد الإشعارات', err.message);
  }, []);

  const upsertSessions = useCallback(
    async (input: SessionRecord[]) => {
      const records = input.map(normalizeSession);
      const { error: err } = await supabase.from('sessions').upsert(records.map(sessionToRow), { onConflict: 'id' });
      if (err) throw new Error(err.message);
      const map = new Map(dataRef.current.sessions.map((s) => [s.id, s]));
      records.forEach((r) => map.set(r.id, r));
      const next = [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
      setData((d) => ({ ...d, sessions: next }));
      await syncJuz(records.map((r) => r.studentId), next, dataRef.current.assignments);
      void runNotificationRules();
    },
    [syncJuz, runNotificationRules],
  );

  const deleteSessions = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      await deleteIn('sessions', 'id', ids);
      const set = new Set(ids);
      const affected = dataRef.current.sessions.filter((s) => set.has(s.id)).map((s) => s.studentId);
      const next = dataRef.current.sessions.filter((s) => !set.has(s.id));
      setData((d) => ({ ...d, sessions: d.sessions.filter((s) => !set.has(s.id)) }));
      await syncJuz(affected, next, dataRef.current.assignments);
    },
    [syncJuz],
  );

  const deleteSession = useCallback((id: string) => deleteSessions([id]), [deleteSessions]);

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

  /** إعادة تحميل مطلوب واحد من قاعدة البيانات (بعد الحفظ) */
  const reloadAssignment = useCallback(async (id: string) => {
    const { data: row, error: err } = await supabase.from('assignments').select(ASSIGNMENT_SELECT).eq('id', id).maybeSingle();
    if (err) throw new Error(err.message);
    const fresh = row ? assignmentFromRow(row) : null;
    const rest = dataRef.current.assignments.filter((a) => a.id !== id);
    const next = fresh ? [fresh, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : rest;
    setData((d) => ({ ...d, assignments: next }));
    return { fresh, all: next };
  }, []);

  /**
   * الحالة المخزّنة لكل طالب بالمطلوب ذي المقدار تُحسب من سجل الإنجاز (نفس دالة العرض) وتُكتب لقاعدة البيانات
   * حتى تعتمد عليها الإشعارات التلقائية (قرب الاستحقاق/التأخر). المطلوب بلا مقدار: الحالة يدوية ولا تُلمس.
   */
  const syncAssignmentStatuses = useCallback(async (a: Assignment) => {
    const changes = a.targets
      .map((t) => ({ t, p: assignmentProgress(a, t.studentId, TODAY) }))
      .filter(({ t, p }) => p.measure !== 'none' && p.stored !== t.status);
    for (const { t, p } of changes) {
      const { error: err } = await supabase.from('assignment_students').update({ status: p.stored }).eq('assignment_id', a.id).eq('student_id', t.studentId);
      if (err) throw new Error(err.message);
    }
    if (!changes.length) return;
    const map = new Map(changes.map(({ t, p }) => [t.studentId, p.stored]));
    setData((d) => ({
      ...d,
      assignments: d.assignments.map((x) => (x.id === a.id ? { ...x, targets: x.targets.map((t) => ({ ...t, status: map.get(t.studentId) ?? t.status })) } : x)),
    }));
  }, []);

  const saveAssignment = useCallback(
    async (a: Assignment, studentIds: string[]) => {
      const before = dataRef.current.assignments.find((x) => x.id === a.id);
      const { error: err } = await supabase.rpc('save_assignment', { p: assignmentToRow(a), p_student_ids: studentIds });
      if (err) throw schemaError(err.message, /save_assignment|assignments|schema cache|function/);
      const { fresh, all } = await reloadAssignment(a.id);
      if (fresh) await syncAssignmentStatuses(fresh);
      // مطلوب حفظ بالصفحات (قبل التعديل أو بعده) يؤثر على حساب الأجزاء
      if (fresh?.category === 'memorization' || before?.category === 'memorization') {
        const ids = [...(fresh?.targets ?? []), ...(before?.targets ?? [])].map((t) => t.studentId);
        await syncJuz(ids, dataRef.current.sessions, all);
      }
      void runNotificationRules();
    },
    [reloadAssignment, syncAssignmentStatuses, syncJuz, runNotificationRules],
  );

  const deleteAssignment = useCallback(
    async (id: string) => {
      const old = dataRef.current.assignments.find((a) => a.id === id);
      const { error: err } = await supabase.from('assignments').delete().eq('id', id);
      if (err) throw new Error(err.message);
      const rest = dataRef.current.assignments.filter((a) => a.id !== id);
      setData((d) => ({ ...d, assignments: d.assignments.filter((a) => a.id !== id) }));
      if (old?.category === 'memorization') await syncJuz(old.targets.map((t) => t.studentId), dataRef.current.sessions, rest);
    },
    [syncJuz],
  );

  const setAssignmentStatus = useCallback(async (assignmentId: string, studentId: string, status: AssignmentStoredStatus) => {
    const { error: err } = await supabase.from('assignment_students').update({ status }).eq('assignment_id', assignmentId).eq('student_id', studentId);
    if (err) throw new Error(err.message);
    setData((d) => ({
      ...d,
      assignments: d.assignments.map((a) => (a.id === assignmentId ? { ...a, targets: a.targets.map((t) => (t.studentId === studentId ? { ...t, status } : t)) } : a)),
    }));
  }, []);

  /** بعد أي تغيير بسجل الإنجاز: تحديث الحالة المخزّنة + الأجزاء (لمطلوبات الحفظ بالصفحات) */
  const afterProgressChange = useCallback(
    async (assignmentId: string, studentId: string, progress: AssignmentProgress[]) => {
      const old = dataRef.current.assignments.find((a) => a.id === assignmentId);
      if (!old) return;
      const updated: Assignment = { ...old, progress };
      const next = dataRef.current.assignments.map((a) => (a.id === assignmentId ? updated : a));
      setData((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === assignmentId ? { ...a, progress } : a)) }));
      await syncAssignmentStatuses(updated);
      if (updated.category === 'memorization') await syncJuz([studentId], dataRef.current.sessions, next);
    },
    [syncAssignmentStatuses, syncJuz],
  );

  const addAssignmentProgress = useCallback(
    async (p: AssignmentProgress) => {
      const { error: err } = await supabase.from('assignment_progress').insert(progressToRow(p));
      if (err) throw new Error(err.message);
      const a = dataRef.current.assignments.find((x) => x.id === p.assignmentId);
      await afterProgressChange(p.assignmentId, p.studentId, [p, ...(a?.progress ?? [])].sort((x, y) => y.date.localeCompare(x.date)));
    },
    [afterProgressChange],
  );

  const deleteAssignmentProgress = useCallback(
    async (p: AssignmentProgress) => {
      const { error: err } = await supabase.from('assignment_progress').delete().eq('id', p.id);
      if (err) throw new Error(err.message);
      const a = dataRef.current.assignments.find((x) => x.id === p.assignmentId);
      await afterProgressChange(p.assignmentId, p.studentId, (a?.progress ?? []).filter((x) => x.id !== p.id));
    },
    [afterProgressChange],
  );

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
      assignmentsReady,
      saveAssignment,
      deleteAssignment,
      setAssignmentStatus,
      addAssignmentProgress,
      deleteAssignmentProgress,
      runNotificationRules,
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
      assignmentsReady,
      saveAssignment,
      deleteAssignment,
      setAssignmentStatus,
      addAssignmentProgress,
      deleteAssignmentProgress,
      runNotificationRules,
    ],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
