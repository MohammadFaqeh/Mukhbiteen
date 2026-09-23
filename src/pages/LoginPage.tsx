import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Loader2, Mail } from 'lucide-react';
import BrandBackground from '@/components/brand/BrandBackground';
import { CenterLogo, ProjectLogo } from '@/components/brand/Logos';
import StarMark from '@/components/brand/StarMark';
import { useAuth } from '@/context/AuthContext';
import { PROJECT } from '@/data/project';
import { resolveLoginAlias } from '@/data/loginAliases';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/parent'} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await login(resolveLoginAlias(email), password);
    setSubmitting(false);
    if (!res.ok) setError(res.error);
    else navigate(res.role === 'admin' ? '/admin' : '/parent', { replace: true });
  };

  return (
    <div className="relative min-h-screen">
      <BrandBackground variant="login" />
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8">
        {/* لوحة الهوية */}
        <section className="paper-grain relative hidden h-full max-h-[720px] flex-col items-center justify-between overflow-hidden rounded-[2rem] border border-sand-200 bg-sand-100/80 p-10 text-center lg:flex">
          <div className="absolute inset-3 rounded-[1.6rem] border border-navy-800/10" />
          <div className="relative flex items-center gap-2 text-[13px] text-navy-500">
            <StarMark className="h-3 w-3 text-burgundy-600" />
            {PROJECT.center}
            <StarMark className="h-3 w-3 text-burgundy-600" />
          </div>
          <ProjectLogo className="relative w-[78%] max-w-[420px] animate-rise" />
          <div className="relative w-full">
            <div className="mx-auto flex w-fit items-center gap-3 rounded-2xl bg-white/80 px-4 py-2.5 shadow-soft">
              <CenterLogo className="h-11 w-auto" />
              <span className="text-right text-[13px] leading-5 text-navy-600">
                جمعية المحافظة على القرآن الكريم
                <br />
                <b className="text-navy-800">{PROJECT.center}</b>
              </span>
            </div>
          </div>
        </section>

        {/* نموذج الدخول */}
        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-4 lg:hidden">
            <ProjectLogo className="h-24 w-auto" />
            <CenterLogo className="h-16 w-auto" />
          </div>
          <h1 className="text-[28px] font-extrabold leading-tight text-navy-900">{PROJECT.name}</h1>
          <p className="mt-1 text-[15px] text-navy-500">{PROJECT.center}</p>

          <form onSubmit={submit} className="card mt-7 space-y-4 p-6">
            <div>
              <label className="field-label" htmlFor="u">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
                <input id="u" type="text" className="input pr-10" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" autoComplete="username" />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="p">
                كلمة المرور
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
                <input id="p" type={show ? 'text' : 'password'} className="input px-10" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-600" aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="rounded-xl bg-burgundy-50 px-3.5 py-2.5 text-[13px] text-burgundy-700">{error}</p>}
            <button className="btn-primary w-full py-3 text-[15px]" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              تسجيل الدخول
            </button>
          </form>
          <p className="mt-4 text-center text-[12px] text-navy-300">لإنشاء حساب جديد أو استعادة كلمة المرور، تواصل مع مشرف المشروع.</p>
        </section>
      </div>
    </div>
  );
}
