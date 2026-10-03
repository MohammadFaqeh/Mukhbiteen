import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '@/types';
import { supabase } from '@/lib/supabase';
import { supervisor } from '@/data/project';

interface Session {
  role: Role;
  displayName: string;
  studentId?: string;
  email: string;
}

interface AuthValue {
  user: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true; role: Role } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * الحسابات تُنشأ من لوحة Supabase مباشرة بلا اسم عرض، فيرجع display_name = البريد افتراضيًا.
 * هنا نستبدله باسم مناسب: اسم المشرف الثابت، أو اسم ولي أمر الطالب المرتبط بالحساب.
 */
function sameIdentity(a: Session | null, b: Session | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.role === b.role && a.studentId === b.studentId && a.email === b.email && a.displayName === b.displayName;
}

async function loadProfile(userId: string, email: string): Promise<Session | null> {
  const { data, error } = await supabase.from('profiles').select('role, student_id, display_name, students(guardian_name)').eq('id', userId).single();
  if (error || !data) return null;
  const hasRealName = data.display_name && data.display_name !== email;
  const student = data.students as { guardian_name?: string } | null;
  const displayName = hasRealName ? data.display_name! : data.role === 'admin' ? supervisor.name : student?.guardian_name || email;
  return { role: data.role, studentId: data.student_id ?? undefined, displayName, email };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const session = data.session;
        const profile = session?.user ? await loadProfile(session.user.id, session.user.email ?? '') : null;
        if (active) setUser(profile);
      })
      .catch((e) => console.error('تعذّر قراءة جلسة الدخول', e))
      .finally(() => {
        if (active) setLoading(false);
      });

    // مهم: هذا الاستدعاء لازم يكون متزامنًا وما ينتظر أي طلب Supabase بداخله.
    // Supabase يستدعيه وهو ماسك قفل الجلسة (المشترك بين كل تبويبات الموقع)، فلو انتظرنا هون طلب ثاني لـ Supabase
    // يعلق القفل للأبد — وكل صفحة تنفتح بعدها تضل على "جارٍ التحميل" لحد ما المستخدم يعمل تحديث.
    // لذلك نؤجّل قراءة الملف الشخصي لبعد ما يحرر Supabase القفل (setTimeout).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase يعيد التحقق من الجلسة تلقائيًا كل ما رجع تبويب/نافذة الموقع يصير مرئي (حتى لو ما تغيّر شي فعليًا)،
      // ويصدر حدث مثل TOKEN_REFRESHED بنفس الهوية. تجاهله هون يمنع إعادة تحميل كل بيانات الموقع ومسح أي تعديل غير محفوظ.
      if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return;
      const u = session?.user;
      setTimeout(async () => {
        const profile = u ? await loadProfile(u.id, u.email ?? '') : null;
        if (!active) return;
        // جلسة موجودة بس تعذّرت قراءة الملف (انقطاع لحظي بالنت): نخلي المستخدم داخل بدل ما نطلّعه
        if (u && !profile) return;
        setUser((prev) => (sameIdentity(prev, profile) ? prev : profile));
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback<AuthValue['login']>(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
    const profile = await loadProfile(data.user.id, data.user.email ?? '');
    if (!profile) {
      await supabase.auth.signOut();
      return { ok: false, error: 'لا يوجد حساب مفعّل بهذا البريد. تواصل مع المشرف.' };
    }
    setUser(profile);
    return { ok: true, role: profile.role };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
