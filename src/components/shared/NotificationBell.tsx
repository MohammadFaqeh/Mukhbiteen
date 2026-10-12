import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationsContext';
import { cx, timeAgo } from '@/utils/format';

// نافذة الإدارة لا تُحمَّل إلا عند فتحها (وأولياء الأمور لا يحمّلونها أبدًا)
const ControlCenterModal = lazy(() => import('@/components/admin/ControlCenterModal'));

/**
 * جرس الإشعارات أعلى الصفحة: عدد غير المقروء فقط (لا رقم إذا لا يوجد)، وقائمة منسدلة عند الضغط فقط
 * بالإشعارات الحديثة (آخر 72 ساعة). للإدارة: زر "إدارة الإشعارات والمطلوبات".
 */
export default function NotificationBell({ className }: { className?: string }) {
  const { user } = useAuth();
  const { items, unread, ready, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [center, setCenter] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const admin = user?.role === 'admin';

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={box} className={cx('relative', className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-navy-100 bg-white text-navy-600 transition hover:bg-navy-50 hover:text-navy-900"
        aria-label={unread ? `الإشعارات (${unread} غير مقروء)` : 'الإشعارات'}
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
        {unread > 0 && (
          <span className="absolute -left-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-burgundy-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-32px))] animate-pop-in overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-lift">
          <header className="flex items-center justify-between gap-2 border-b border-navy-50 px-4 py-3">
            <p className="text-[14px] font-extrabold text-navy-900">الإشعارات</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[12px] font-bold text-burgundy-600 hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> تحديد الكل كمقروء
              </button>
            )}
          </header>
          <ul className="scrollbar-thin max-h-[min(420px,60vh)] overflow-y-auto">
            {!items.length && <li className="px-4 py-8 text-center text-[13px] text-navy-400">{ready || !admin ? 'لا توجد إشعارات حاليًا' : 'الإشعارات تحتاج إلى تحديث قاعدة البيانات (schema.sql)'}</li>}
            {items.map((n) => (
              <li key={n.id} className="border-b border-navy-50 last:border-0">
                <button
                  onClick={() => {
                    markRead(n.id);
                    if (n.link && !admin) {
                      setOpen(false);
                      navigate(n.link);
                    }
                  }}
                  className={cx('flex w-full gap-3 px-4 py-3 text-right transition hover:bg-navy-50/60', !n.readAt && 'bg-sand-50/70')}
                >
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-burgundy-600')} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={cx('block text-[13px] text-navy-900', n.readAt ? 'font-medium' : 'font-extrabold')}>{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-[12px] leading-5 text-navy-600">{n.body}</span>}
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-navy-400">
                      {timeAgo(n.sendAt)}
                      <span>{n.readAt ? 'مقروء' : 'غير مقروء'}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {admin && (
            <footer className="border-t border-navy-50 p-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setCenter(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 px-3 py-2 text-[13px] font-bold text-white hover:bg-navy-900"
              >
                <SlidersHorizontal className="h-4 w-4" /> إدارة الإشعارات والمطلوبات
              </button>
            </footer>
          )}
        </div>
      )}
      {admin && center && (
        <Suspense fallback={null}>
          <ControlCenterModal open={center} onClose={() => setCenter(false)} />
        </Suspense>
      )}
    </div>
  );
}
