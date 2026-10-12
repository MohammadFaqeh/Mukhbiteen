import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Clock, Loader2, Trash2, UserRound } from 'lucide-react';
import type { SentNotification } from '@/types';
import PageHeader from '@/components/shared/PageHeader';
import Badge from '@/components/ui/Badge';
import NotificationComposer from '@/components/admin/NotificationComposer';
import AutoRulesPanel from '@/components/admin/AutoRulesPanel';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { supabase } from '@/lib/supabase';
import { cx, timeAgo } from '@/utils/format';

const TABS = [
  { key: 'compose', label: 'إشعار جديد' },
  { key: 'auto', label: 'الإشعارات التلقائية' },
  { key: 'sent', label: 'السجل' },
] as const;
type Tab = (typeof TABS)[number]['key'];

const fmt = (iso: string) => new Date(iso).toLocaleString('ar-JO-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' });

/** سجل الإشعارات المرسلة والمجدولة (آخر 30 يومًا) مع عدد المستلمين ومن قرأ — والمجدول يمكن إلغاؤه */
function SentList() {
  const confirmDelete = useConfirmDelete();
  const [list, setList] = useState<SentNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, link, kind, rule_id, send_at, notification_recipients(read_at)')
      .gte('send_at', since)
      .order('send_at', { ascending: false })
      .limit(200);
    if (error) return setFailed(true);
    setList(
      (data ?? []).map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body ?? '',
        link: n.link ?? undefined,
        kind: n.kind,
        ruleId: n.rule_id ?? undefined,
        sendAt: n.send_at,
        recipients: n.notification_recipients?.length ?? 0,
        read: (n.notification_recipients ?? []).filter((r: any) => r.read_at).length,
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (failed) return <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-800">الإشعارات تحتاج إلى تحديث قاعدة البيانات: شغّل supabase/schema.sql كاملًا من SQL Editor.</p>;
  if (!list) return <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-navy-300" />;
  if (!list.length) return <p className="p-8 text-center text-navy-400">لا توجد إشعارات خلال آخر 30 يومًا.</p>;
  const now = Date.now();
  return (
    <ul className="space-y-2">
      {list.map((n) => {
        const future = new Date(n.sendAt).getTime() > now;
        return (
          <li key={n.id} className="flex items-start gap-3 rounded-2xl border border-navy-100/70 bg-white p-3">
            <span className={cx('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', n.kind === 'auto' ? 'bg-sand-100 text-gold-600' : 'bg-navy-50 text-navy-600')}>
              {n.kind === 'auto' ? <Bot className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-navy-900">{n.title}</p>
              {n.body && <p className="text-[13px] text-navy-600">{n.body}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-navy-400">
                {future ? (
                  <Badge tone="amber">
                    <Clock className="h-3 w-3" /> مجدول: {fmt(n.sendAt)}
                  </Badge>
                ) : (
                  <span title={fmt(n.sendAt)}>{timeAgo(n.sendAt)}</span>
                )}
                <span>
                  {n.recipients} مستلم · قرأه {n.read}
                </span>
                <span>{n.kind === 'auto' ? 'تلقائي' : 'يدوي'}</span>
              </div>
            </div>
            <button
              className="rounded-lg p-2 text-navy-300 hover:bg-burgundy-50 hover:text-burgundy-600"
              aria-label={future ? 'إلغاء الإشعار المجدول' : 'حذف الإشعار'}
              title={future ? 'إلغاء الإشعار المجدول' : 'حذف الإشعار من عند المستلمين'}
              onClick={async () => {
                const ok = await confirmDelete(
                  future ? 'إلغاء هذا الإشعار المجدول؟' : 'حذف هذا الإشعار من قوائم المستلمين؟',
                  async () => {
                    const { error } = await supabase.from('notifications').delete().eq('id', n.id);
                    if (error) throw new Error(error.message);
                  },
                  future ? 'تم إلغاء الإشعار' : 'تم حذف الإشعار',
                );
                if (ok) setList((xs) => xs!.filter((x) => x.id !== n.id));
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** إدارة الإشعارات: إرسال يدوي/مجدول، إعدادات الإشعارات التلقائية، وسجل المرسل */
export default function AdminNotifications() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'compose') as Tab;
  return (
    <div className="space-y-4">
      <PageHeader title="الإشعارات" subtitle="إشعارات أولياء الأمور: يدوية أو مجدولة أو تلقائية حسب القواعد" />
      <nav className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl border border-navy-100/70 bg-white/80 p-1.5 shadow-soft">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ tab: t.key }, { replace: true })}
            className={cx('whitespace-nowrap rounded-xl px-4 py-2 text-[13px] font-bold transition', tab === t.key ? 'bg-navy-800 text-white' : 'text-navy-500 hover:bg-navy-50')}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <section className="card p-5">
        {tab === 'compose' && <NotificationComposer onSent={() => setParams({ tab: 'sent' }, { replace: true })} onOpenSettings={() => setParams({ tab: 'auto' }, { replace: true })} />}
        {tab === 'auto' && <AutoRulesPanel />}
        {tab === 'sent' && <SentList />}
      </section>
    </div>
  );
}
