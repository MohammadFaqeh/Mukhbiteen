import { Outlet, useNavigate } from 'react-router-dom';
import { BookOpenText, CalendarCheck2, CalendarClock, FileText, HandHeart, House } from 'lucide-react';
import Sidebar, { type NavItem } from './Sidebar';
import BrandBackground from '@/components/brand/BrandBackground';
import Footer from '@/components/brand/Footer';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { useParentStudent } from '@/hooks/useParentStudent';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
import { cx } from '@/utils/format';

const items: NavItem[] = [
  { to: '/parent', label: 'الرئيسية', icon: House, end: true },
  { to: '/parent/next', label: 'المطلوب القادم', icon: CalendarClock },
  { to: '/parent/quran', label: 'الحفظ والمراجعة', icon: BookOpenText },
  { to: '/parent/worship', label: 'العبادات', icon: HandHeart },
  { to: '/parent/sessions', label: 'سجل الدوام', icon: CalendarCheck2 },
  { to: '/parent/reports', label: 'التقارير', icon: FileText },
];

export default function ParentLayout() {
  const { logout } = useAuth();
  const { loading, error } = useData();
  const navigate = useNavigate();
  const { student } = useParentStudent();
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  return (
    <div className="min-h-screen">
      <BrandBackground variant="parent" />
      <Sidebar
        tone="parent"
        subtitle="صفحة الطالب"
        items={items}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        onLogout={async () => {
          await logout();
          navigate('/login');
        }}
        footer={
          student && (
            <div className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white/70 p-3">
              <Avatar name={student.name} src={student.photo} size={40} />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-bold text-navy-800">{student.name}</p>
                <p className="text-[11px] text-navy-400">{student.group}</p>
              </div>
            </div>
          )
        }
      />
      <main className={cx('px-4 pb-8 pt-5 transition-[margin] duration-200 sm:px-6 lg:px-10 lg:pt-8', collapsed ? 'lg:mr-[92px]' : 'lg:mr-[260px]')}>
        <div className="mx-auto max-w-[1280px]">
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
