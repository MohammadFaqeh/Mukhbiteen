import { Outlet, useNavigate } from 'react-router-dom';
import { CalendarPlus, FileText, GalleryHorizontalEnd, LayoutDashboard, Users } from 'lucide-react';
import Sidebar, { type NavItem } from './Sidebar';
import BrandBackground from '@/components/brand/BrandBackground';
import Footer from '@/components/brand/Footer';
import { LogoPair } from '@/components/brand/Logos';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { PROJECT, supervisor } from '@/data/project';
import { TODAY } from '@/utils/today';
import { cx, formatLongDate } from '@/utils/format';

const items: NavItem[] = [
  { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'إدارة الطلاب', icon: Users },
  { to: '/admin/attendance', label: 'تسجيل دوام اليوم', icon: CalendarPlus },
  { to: '/admin/activities', label: 'الصور والأنشطة', icon: GalleryHorizontalEnd },
  { to: '/admin/reports', label: 'التقارير', icon: FileText },
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const { loading, error } = useData();
  const navigate = useNavigate();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();
  return (
    <div className="min-h-screen">
      <BrandBackground variant="admin" />
      <Sidebar
        tone="admin"
        subtitle="لوحة الإدارة"
        items={items}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onLogout={async () => {
          await logout();
          navigate('/login');
        }}
      />
      <main className={cx('px-4 pb-8 pt-4 transition-[margin] duration-200 sm:px-6 lg:px-8 lg:pt-6', collapsed ? 'lg:mr-[92px]' : 'lg:mr-[260px]')}>
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
          {loading ? (
            <p className="card-quiet p-10 text-center text-navy-400">جارٍ تحميل البيانات...</p>
          ) : error ? (
            <p className="card-quiet p-10 text-center text-burgundy-600">تعذّر تحميل البيانات: {error}</p>
          ) : (
            <Outlet />
          )}
          <Footer />
        </div>
      </main>
    </div>
  );
}
