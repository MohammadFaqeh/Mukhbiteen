import { Outlet, useNavigate } from 'react-router-dom';
import { CalendarPlus, FileText, GalleryHorizontalEnd, LayoutDashboard, RotateCcw, Users } from 'lucide-react';
import Sidebar, { type NavItem } from './Sidebar';
import BrandBackground from '@/components/brand/BrandBackground';
import Footer from '@/components/brand/Footer';
import { LogoPair } from '@/components/brand/Logos';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { PROJECT, TODAY, supervisor } from '@/data/mockData';
import { formatLongDate } from '@/utils/format';

const items: NavItem[] = [
  { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'إدارة الطلاب', icon: Users },
  { to: '/admin/attendance', label: 'تسجيل دوام اليوم', icon: CalendarPlus },
  { to: '/admin/activities', label: 'الصور والأنشطة', icon: GalleryHorizontalEnd },
  { to: '/admin/reports', label: 'التقارير', icon: FileText },
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const { resetDemo } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
      <BrandBackground variant="admin" />
      <Sidebar
        tone="admin"
        subtitle="لوحة الإدارة"
        items={items}
        onLogout={() => {
          logout();
          navigate('/login');
        }}
        footer={
          <button
            onClick={() => {
              resetDemo();
              toast('تمت إعادة البيانات التجريبية الأصلية');
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-navy-200 px-3.5 py-2 text-[12px] text-navy-500 transition hover:bg-white"
          >
            <RotateCcw className="h-4 w-4" />
            إعادة ضبط البيانات التجريبية
          </button>
        }
      />
      <main className="px-4 pb-8 pt-4 sm:px-6 lg:mr-[260px] lg:px-8 lg:pt-6">
        <div className="mx-auto max-w-[1400px]">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-navy-100/70 bg-white/80 px-5 py-3 shadow-soft backdrop-blur">
            <div className="flex items-center gap-4">
              <LogoPair size="sm" className="hidden sm:flex" />
              <div>
                <p className="text-[16px] font-extrabold text-navy-900">لوحة إدارة {PROJECT.name}</p>
                <p className="text-[12px] text-navy-400">
                  {PROJECT.center} – {formatLongDate(TODAY)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-left leading-tight">
                <p className="text-[13px] font-bold text-navy-800">{user?.displayName}</p>
                <p className="text-[11px] text-navy-400">مشرف المشروع</p>
              </div>
              <img src={supervisor.photo} alt="" className="h-10 w-10 rounded-full bg-navy-900 object-cover object-[50%_20%] ring-2 ring-white" />
            </div>
          </header>
          <Outlet />
          <Footer />
        </div>
      </main>
    </div>
  );
}
