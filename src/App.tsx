import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from './context/AuthContext';
import type { Role } from './types';
import LoginPage from './pages/LoginPage';
import ParentLayout from './layouts/ParentLayout';
import AdminLayout from './layouts/AdminLayout';
import ParentHome from './pages/parent/ParentHome';
import ParentNext from './pages/parent/ParentNext';
import ParentQuran from './pages/parent/ParentQuran';
import ParentWorship from './pages/parent/ParentWorship';
import ParentSessions from './pages/parent/ParentSessions';
import ParentReports from './pages/parent/ParentReports';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudents from './pages/admin/AdminStudents';
import AdminStudentDetail from './pages/admin/AdminStudentDetail';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminActivities from './pages/admin/AdminActivities';
import AdminReports from './pages/admin/AdminReports';

function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/parent'} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-navy-400">جارٍ التحميل...</div>;
  }
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/parent" element={<RequireRole role="parent"><ParentLayout /></RequireRole>}>
        <Route index element={<ParentHome />} />
        <Route path="next" element={<ParentNext />} />
        <Route path="quran" element={<ParentQuran />} />
        <Route path="worship" element={<ParentWorship />} />
        <Route path="sessions" element={<ParentSessions />} />
        <Route path="reports" element={<ParentReports />} />
      </Route>

      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="students/:id" element={<AdminStudentDetail />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="activities" element={<AdminActivities />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/parent') : '/login'} replace />} />
    </Routes>
  );
}
