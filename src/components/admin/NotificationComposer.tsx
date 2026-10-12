import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Loader2, Send, Settings2 } from 'lucide-react';
import { Field } from './fields';
import StudentPicker from './StudentPicker';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { cx } from '@/utils/format';

type Audience = 'all' | 'groups' | 'students';

const pad = (n: number) => String(n).padStart(2, '0');
/** قيمة datetime-local بعد ساعة من الآن (بتوقيت الجهاز) */
function inAnHour() {
  const d = new Date(Date.now() + 3_600_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * إشعار لأولياء الأمور: يدوي (عنوان + نص + مستلمون + الآن أو مجدول) أو تلقائي حسب قواعد الإشعارات.
 * الإرسال عبر دالة send_notification بقاعدة البيانات (معاملة واحدة)، والمجدول لا يظهر لأحد قبل موعده.
 */
export default function NotificationComposer({ onSent, onOpenSettings }: { onSent?: () => void; onOpenSettings?: () => void }) {
  const { students } = useData();
  const toast = useToast();
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [groups, setGroups] = useState<string[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [scheduled, setScheduled] = useState(false);
  const [at, setAt] = useState(inAnHour);
  const [sending, setSending] = useState(false);
  const allGroups = useMemo(() => [...new Set(students.filter((s) => s.active).map((s) => s.group))].sort((a, b) => a.localeCompare(b, 'ar')), [students]);

  const send = async () => {
    if (!title.trim()) return toast('اكتب عنوان الإشعار.');
    if (audience === 'groups' && !groups.length) return toast('اختر مجموعة واحدة على الأقل.');
    if (audience === 'students' && !ids.length) return toast('اختر طالبًا واحدًا على الأقل.');
    const sendAt = scheduled ? new Date(at) : null;
    if (scheduled && (!sendAt || Number.isNaN(sendAt.getTime()) || sendAt.getTime() < Date.now() - 60_000)) return toast('اختر موعد إرسال قادمًا.');
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_notification', {
        p_title: title.trim(),
        p_body: body.trim(),
        p_link: '/parent',
        p_send_at: sendAt ? sendAt.toISOString() : null,
        p_student_ids: audience === 'students' ? ids : [],
        p_groups: audience === 'groups' ? groups : [],
        p_all: audience === 'all',
      });
      if (error) throw new Error(/send_notification|schema cache|function/.test(error.message) ? 'الإشعارات تحتاج إلى تحديث قاعدة البيانات: شغّل supabase/schema.sql من SQL Editor.' : error.message);
      toast(scheduled ? `تمت جدولة الإشعار لـ ${data} من أولياء الأمور` : `تم إرسال الإشعار إلى ${data} من أولياء الأمور`);
      setTitle('');
      setBody('');
      onSent?.();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'تعذّر إرسال الإشعار.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex w-full rounded-xl bg-navy-50 p-1 sm:w-auto">
        {(
          [
            ['manual', 'إشعار يدوي'],
            ['auto', 'إشعارات تلقائية'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setMode(k)} className={cx('flex-1 rounded-lg px-4 py-1.5 text-[13px] font-bold transition sm:flex-none', mode === k ? 'bg-white text-navy-900 shadow-soft' : 'text-navy-500')}>
            {l}
          </button>
        ))}
      </div>

      {mode === 'auto' ? (
        <div className="rounded-2xl border border-navy-100 bg-navy-50/40 p-4 text-[13px] leading-7 text-navy-600">
          <p className="mb-2 flex items-center gap-2 font-bold text-navy-800">
            <Bot className="h-4 w-4" /> يرسلها النظام وحده حسب القواعد والمواعيد التي تحددها
          </p>
          <ul className="mb-3 list-inside list-disc">
            <li>تذكير بالدوام قبل يوم (ومنه دوام الفجر) مع الساعة المحددة</li>
            <li>إضافة مطلوب جديد للطالب، وقرب موعد استحقاقه، وتجاوزه دون إكمال</li>
            <li>تقصير الطالب في التسميع المطلوب بيوم الدوام</li>
          </ul>
          <p className="mb-3 text-[12px] text-navy-400">تعمل على الخادم كل 10 دقائق حتى لو كان الموقع مغلقًا، ولا تُرسل نفس الإشعار مرتين لنفس الحدث.</p>
          {onOpenSettings ? (
            <button className="btn-primary" onClick={onOpenSettings}>
              <Settings2 className="h-4 w-4" /> إعدادات الإشعارات التلقائية
            </button>
          ) : (
            <Link to="/admin/notifications?tab=auto" className="btn-primary">
              <Settings2 className="h-4 w-4" /> إعدادات الإشعارات التلقائية
            </Link>
          )}
        </div>
      ) : (
        <>
          <Field label="العنوان">
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: لقاء أولياء الأمور" />
          </Field>
          <Field label="المحتوى">
            <textarea className="input min-h-[80px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder="نص الإشعار كما سيظهر لولي الأمر" />
          </Field>
          <div>
            <span className="field-label">المستلمون</span>
            <div className="mb-2 inline-flex w-full rounded-xl bg-navy-50 p-1 sm:w-auto">
              {(
                [
                  ['all', 'جميع أولياء الأمور'],
                  ['groups', 'مجموعات'],
                  ['students', 'أولياء أمور محددون'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setAudience(k)} className={cx('flex-1 rounded-lg px-3 py-1.5 text-[12px] font-bold transition sm:flex-none', audience === k ? 'bg-white text-navy-900 shadow-soft' : 'text-navy-500')}>
                  {l}
                </button>
              ))}
            </div>
            {audience === 'groups' && (
              <div className="flex flex-wrap gap-1.5">
                {allGroups.map((g) => {
                  const on = groups.includes(g);
                  return (
                    <button key={g} type="button" onClick={() => setGroups(on ? groups.filter((x) => x !== g) : [...groups, g])} className={cx('rounded-full px-3 py-1 text-[12px] font-bold ring-1 ring-inset', on ? 'bg-navy-800 text-white ring-navy-800' : 'text-navy-600 ring-navy-100')}>
                      {g}
                    </button>
                  );
                })}
              </div>
            )}
            {audience === 'students' && <StudentPicker value={ids} onChange={setIds} />}
            <p className="mt-1.5 text-[12px] text-navy-400">يصل الإشعار لأولياء الأمور الذين لديهم حسابات دخول مرتبطة بأبنائهم.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="inline-flex rounded-xl bg-navy-50 p-1">
              {(
                [
                  [false, 'إرسال الآن'],
                  [true, 'جدولة الإرسال'],
                ] as const
              ).map(([k, l]) => (
                <button key={l} type="button" onClick={() => setScheduled(k)} className={cx('rounded-lg px-3 py-1.5 text-[12px] font-bold transition', scheduled === k ? 'bg-white text-navy-900 shadow-soft' : 'text-navy-500')}>
                  {l}
                </button>
              ))}
            </div>
            {scheduled && <input type="datetime-local" className="input w-auto" value={at} onChange={(e) => setAt(e.target.value)} aria-label="موعد الإرسال" />}
            <button className="btn-accent mr-auto px-6" onClick={send} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {scheduled ? 'جدولة' : 'إرسال'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
