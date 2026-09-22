import { Outlet, useNavigate } from 'react-router-dom';
import { BookOpenText, CalendarCheck2, CalendarClock, FileText, HandHeart, House } from 'lucide-react';
import Sidebar, { type NavItem } from './Sidebar';
import BrandBackground from '@/components/brand/BrandBackground';
import Footer from '@/components/brand/Footer';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useParentStudent } from '@/hooks/useParentStudent';

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
  const navigate = useNavigate();
  const { student } = useParentStudent();

  return (
    <div className="min-h-screen">
      <BrandBackground variant="parent" />
      <Sidebar
        tone="parent"
        subtitle="صفحة الطالب"
        items={items}
        onLogout={() => {
          logout();
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
      <main className="px-4 pb-8 pt-5 sm:px-6 lg:mr-[260px] lg:px-10 lg:pt-8">
        <div className="mx-auto max-w-[1280px]">
          <Outlet />
          <Footer />
        </div>
      </main>
    </div>
  );
}
