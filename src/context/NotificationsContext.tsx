import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppNotification } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

/** الإشعارات تبقى بقائمة "الحديثة" 72 ساعة من وقت إرسالها ثم تختفي تلقائيًا */
export const NOTIFICATION_WINDOW_HOURS = 72;
const POLL_MS = 60_000;

interface NotificationsValue {
  items: AppNotification[];
  unread: number;
  /** false = جداول الإشعارات غير موجودة بقاعدة البيانات بعد (لم يُشغَّل تحديث schema.sql) */
  ready: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

const sinceIso = () => new Date(Date.now() - NOTIFICATION_WINDOW_HOURS * 3_600_000).toISOString();

/** إشعارات المستخدم الحالي (المستلمة فعلًا: وقت إرسالها حلّ، وخلال آخر 72 ساعة) */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [ready, setReady] = useState(true);
  const uid = user?.id;

  const refresh = useCallback(async () => {
    if (!uid) return;
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('notification_recipients')
      .select('read_at, notifications!inner(id, title, body, link, kind, send_at)')
      .eq('user_id', uid)
      .gte('notifications.send_at', sinceIso())
      .lte('notifications.send_at', now);
    if (error) {
      setReady(false);
      return;
    }
    setReady(true);
    const list = (data ?? []).map((r: any): AppNotification => {
      const n = Array.isArray(r.notifications) ? r.notifications[0] : r.notifications;
      return { id: n.id, title: n.title, body: n.body ?? '', link: n.link ?? undefined, kind: n.kind, sendAt: n.send_at, readAt: r.read_at };
    });
    setItems(list.sort((a, b) => b.sendAt.localeCompare(a.sendAt)));
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      return;
    }
    refresh();
    const t = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [uid, refresh]);

  const markRead = useCallback(
    async (id: string) => {
      if (!uid) return;
      const at = new Date().toISOString();
      setItems((xs) => xs.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: at } : n)));
      const { error } = await supabase.from('notification_recipients').update({ read_at: at }).eq('user_id', uid).eq('notification_id', id).is('read_at', null);
      if (error) console.warn('تعذّر تحديد الإشعار كمقروء', error.message);
    },
    [uid],
  );

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const at = new Date().toISOString();
    const ids = items.filter((n) => !n.readAt).map((n) => n.id);
    if (!ids.length) return;
    setItems((xs) => xs.map((n) => (n.readAt ? n : { ...n, readAt: at })));
    const { error } = await supabase.from('notification_recipients').update({ read_at: at }).eq('user_id', uid).in('notification_id', ids);
    if (error) console.warn('تعذّر تحديد الإشعارات كمقروءة', error.message);
  }, [uid, items]);

  const value = useMemo(
    () => ({ items, unread: items.filter((n) => !n.readAt).length, ready, refresh, markRead, markAllRead }),
    [items, ready, refresh, markRead, markAllRead],
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}
