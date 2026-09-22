/**
 * تسجيل دخول تجريبي (Demo) فقط.
 * لاحقًا: استبدل login/logout باستدعاء supabase.auth.signInWithPassword / signOut
 * واقرأ الدور (role) وstudentId من جدول profiles.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DemoAccount, Role } from '@/types';
import { demoAccounts } from '@/data/mockData';

interface Session {
  role: Role;
  username: string;
  displayName: string;
  studentId?: string;
}

interface AuthValue {
  user: Session | null;
  login: (username: string, password: string) => { ok: true; role: Role } | { ok: false; error: string };
  loginAs: (account: DemoAccount, studentId?: string) => Role;
  logout: () => void;
}

const KEY = 'mukhbiteen.demo.session';
const AuthContext = createContext<AuthValue | null>(null);

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session | null>(readSession);

  const persist = (s: Session | null) => {
    setUser(s);
    try {
      if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* التخزين غير متاح – نكتفي بالحالة في الذاكرة */
    }
  };

  const loginAs = useCallback((a: DemoAccount, studentId?: string) => {
    persist({ role: a.role, username: a.username, displayName: a.displayName, studentId: studentId ?? a.studentId });
    return a.role;
  }, []);

  const login = useCallback<AuthValue['login']>(
    (username, password) => {
      const u = username.trim().toLowerCase();
      const acc = demoAccounts.find((a) => a.username.toLowerCase() === u && a.password === password);
      if (!acc) return { ok: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة. جرّب أحد الحسابين التجريبيين.' };
      return { ok: true, role: loginAs(acc) };
    },
    [loginAs],
  );

  const logout = useCallback(() => persist(null), []);

  const value = useMemo(() => ({ user, login, loginAs, logout }), [user, login, loginAs, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
