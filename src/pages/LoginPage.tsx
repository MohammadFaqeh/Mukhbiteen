import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, ShieldCheck, User, Users } from 'lucide-react';
import BrandBackground from '@/components/brand/BrandBackground';
import { CenterLogo, ProjectLogo } from '@/components/brand/Logos';
import StarMark from '@/components/brand/StarMark';
import Avatar from '@/components/ui/Avatar';
import Select from '@/components/ui/Select';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { PROJECT, demoAccounts } from '@/data/mockData';

export default function LoginPage() {
  const { user, login, loginAs } = useAuth();
  const { students } = useData();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [previewStudent, setPreviewStudent] = useState('s01');

  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/parent'} replace />;

  const go = (role: 'admin' | 'parent') => navigate(role === 'admin' ? '/admin' : '/parent', { replace: true });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const res = login(username, password);
    if (!res.ok) setError(res.error);
    else go(res.role);
  };

  const admin = demoAccounts.find((a) => a.role === 'admin')!;
  const parent = demoAccounts.find((a) => a.role === 'parent')!;
  const child = students.find((s) => s.id === previewStudent);

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
                اسم المستخدم أو البريد الإلكتروني
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300" />
                <input id="u" className="input pr-10" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="مثال: admin" autoComplete="username" />
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
            <button className="btn-primary w-full py-3 text-[15px]">تسجيل الدخول</button>
          </form>

          {/* الحسابات التجريبية */}
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-3 text-[13px] text-navy-400">
              <span className="h-px flex-1 bg-navy-100" />
              دخول سريع بحساب تجريبي
              <span className="h-px flex-1 bg-navy-100" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={() => go(loginAs(admin))} className="card group flex flex-col items-start gap-2 p-4 text-right transition hover:border-navy-300">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-800 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span className="font-bold text-navy-900">الإدارة</span>
                <span className="text-[12px] leading-5 text-navy-400">
                  admin / admin123
                  <br />
                  إدارة الطلاب والدوام
                </span>
              </button>
              <div className="card flex flex-col gap-2 p-4">
                <button onClick={() => go(loginAs(parent, previewStudent))} className="flex flex-col items-start gap-2 text-right">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-burgundy-600 text-white">
                    <Users className="h-5 w-5" />
                  </span>
                  <span className="font-bold text-navy-900">ولي الأمر</span>
                  <span className="text-[12px] leading-5 text-navy-400">parent / parent123</span>
                </button>
                <div className="flex items-center gap-2">
                  {child && <Avatar name={child.name} src={child.photo} size={28} />}
                  <Select small className="flex-1" ariaLabel="تجربة صفحة الطالب" value={previewStudent} onChange={setPreviewStudent} options={students.map((s) => ({ value: s.id, label: s.name }))} />
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-[12px] text-navy-300">نسخة تجريبية للواجهة – لا يوجد اتصال بقاعدة بيانات بعد.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
