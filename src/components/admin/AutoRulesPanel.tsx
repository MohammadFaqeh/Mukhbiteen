import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, Play, Save } from 'lucide-react';
import type { NotificationRule, NotificationRuleType } from '@/types';
import Badge from '@/components/ui/Badge';
import { Field } from './fields';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { notificationRuleFromRow, notificationRuleToRow } from '@/lib/mappers';
import { WEEKDAYS, cx } from '@/utils/format';

/** المتغيرات المتاحة بنص كل نوع — تُستبدل عند الإرسال */
const placeholders: Record<NotificationRuleType, string[]> = {
  session_reminder: ['{الطالب}', '{التاريخ}', '{الوقت}'],
  assignment_new: ['{الطالب}', '{المطلوب}', '{الاستحقاق}'],
  assignment_due: ['{الطالب}', '{المطلوب}', '{الاستحقاق}'],
  assignment_overdue: ['{الطالب}', '{المطلوب}', '{الاستحقاق}'],
  recitation_shortfall: ['{الطالب}', '{التاريخ}', '{المنجز}'],
};

const triggerText: Record<NotificationRuleType, string> = {
  session_reminder: 'يُرسل في اليوم السابق لكل يوم دوام محدد، عند ساعة الإرسال.',
  assignment_new: 'يُرسل فور إضافة مطلوب ظاهر للأهل (أو إضافة طالب إليه).',
  assignment_due: 'يُرسل قبل تاريخ الاستحقاق بعدد الساعات المحدد، إذا لم يكتمل المطلوب.',
  assignment_overdue: 'يُرسل بعد تجاوز تاريخ الاستحقاق إذا لم يكتمل المطلوب (مرة واحدة).',
  recitation_shortfall: 'يُرسل يوم الدوام عند ساعة الإرسال إذا كان التسميع أقل من المطلوب أو غير معتمد.',
};

function RuleEditor({ rule, groups, onSaved }: { rule: NotificationRule; groups: string[]; onSaved: (r: NotificationRule) => void }) {
  const toast = useToast();
  const [r, setR] = useState(rule);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(r) !== JSON.stringify(rule);
  const set = (p: Partial<NotificationRule>) => setR((x) => ({ ...x, ...p }));

  const save = async (next = r) => {
    if (next.type === 'session_reminder' && next.enabled && !next.weekdays.length) return toast('حدد أيام الدوام أولًا.');
    setSaving(true);
    try {
      const { error } = await supabase.from('notification_rules').upsert(notificationRuleToRow(next), { onConflict: 'id' });
      if (error) throw new Error(error.message);
      onSaved(next);
      toast(next.enabled ? 'تم حفظ القاعدة وهي مفعّلة' : 'تم حفظ القاعدة (موقوفة)');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'تعذّر الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-navy-100 bg-white">
      <div className="flex items-center gap-3 p-3">
        <button className="flex min-w-0 flex-1 items-center gap-2 text-right" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <ChevronDown className={cx('h-4 w-4 shrink-0 text-navy-400 transition', open && 'rotate-180')} />
          <span className="min-w-0">
            <span className="block text-[14px] font-bold text-navy-800">{r.name}</span>
            <span className="block truncate text-[12px] text-navy-400">{triggerText[r.type]}</span>
          </span>
        </button>
        <Badge tone={rule.enabled ? 'green' : 'gray'}>{rule.enabled ? 'مفعّلة' : 'موقوفة'}</Badge>
        <button
          role="switch"
          aria-checked={r.enabled}
          aria-label="تفعيل القاعدة"
          disabled={saving}
          onClick={() => {
            const next = { ...r, enabled: !r.enabled };
            if (next.type === 'session_reminder' && next.enabled && !next.weekdays.length) {
              setOpen(true);
              return toast('حدد أيام الدوام أولًا ثم فعّل القاعدة.');
            }
            setR(next);
            save(next);
          }}
          className={cx('relative h-6 w-11 shrink-0 rounded-full transition', r.enabled ? 'bg-burgundy-600' : 'bg-navy-100')}
        >
          <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', r.enabled ? 'right-[22px]' : 'right-0.5')} />
        </button>
      </div>
      {open && (
        <div className="grid animate-fade-in gap-3 border-t border-navy-50 p-4 sm:grid-cols-2">
          <Field label="اسم القاعدة" className="sm:col-span-2">
            <input className="input" value={r.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          {r.type === 'session_reminder' && (
            <div className="sm:col-span-2">
              <span className="field-label">أيام الدوام</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((d, i) => {
                  const on = r.weekdays.includes(i);
                  return (
                    <button key={d} type="button" onClick={() => set({ weekdays: on ? r.weekdays.filter((x) => x !== i) : [...r.weekdays, i].sort() })} className={cx('rounded-full px-3 py-1 text-[12px] font-bold ring-1 ring-inset', on ? 'bg-navy-800 text-white ring-navy-800' : 'text-navy-600 ring-navy-100')}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {r.type === 'session_reminder' && (
            <Field label="ساعة الدوام (تظهر بالرسالة)">
              <input type="time" className="input" value={r.sessionTime ?? ''} onChange={(e) => set({ sessionTime: e.target.value || undefined })} />
            </Field>
          )}
          {r.type === 'assignment_due' && (
            <Field label="قبل الاستحقاق بـ (ساعة)">
              <input type="number" min={1} max={336} className="input text-center" value={r.hoursBefore ?? 24} onChange={(e) => set({ hoursBefore: Math.max(1, Number(e.target.value) || 24) })} />
            </Field>
          )}
          {r.type !== 'assignment_new' && (
            <Field label="ساعة الإرسال (توقيت الأردن)">
              <input type="time" className="input" value={r.sendTime ?? ''} onChange={(e) => set({ sendTime: e.target.value || undefined })} />
            </Field>
          )}
          <div className="sm:col-span-2">
            <span className="field-label">الفئات المستهدفة</span>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => set({ audience: [] })} className={cx('rounded-full px-3 py-1 text-[12px] font-bold ring-1 ring-inset', !r.audience.length ? 'bg-navy-800 text-white ring-navy-800' : 'text-navy-600 ring-navy-100')}>
                جميع أولياء الأمور
              </button>
              {groups.map((g) => {
                const on = r.audience.includes(g);
                return (
                  <button key={g} type="button" onClick={() => set({ audience: on ? r.audience.filter((x) => x !== g) : [...r.audience, g] })} className={cx('rounded-full px-3 py-1 text-[12px] font-bold ring-1 ring-inset', on ? 'bg-burgundy-600 text-white ring-burgundy-600' : 'text-navy-600 ring-navy-100')}>
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="عنوان الرسالة" className="sm:col-span-2">
            <input className="input" value={r.titleTemplate} onChange={(e) => set({ titleTemplate: e.target.value })} />
          </Field>
          <Field label="نص الرسالة (القالب)" className="sm:col-span-2">
            <textarea className="input min-h-[70px]" value={r.bodyTemplate} onChange={(e) => set({ bodyTemplate: e.target.value })} />
          </Field>
          <p className="text-[12px] text-navy-400 sm:col-span-2">المتغيرات المتاحة: {placeholders[r.type].join('  ')}</p>
          <div className="flex justify-end sm:col-span-2">
            <button className="btn-primary" onClick={() => save()} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ القاعدة
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** إعدادات الإشعارات التلقائية: تفعيل/إيقاف كل قاعدة، المواعيد، الفئات، ونص الرسالة */
export default function AutoRulesPanel() {
  const { students } = useData();
  const toast = useToast();
  const [rules, setRules] = useState<NotificationRule[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [running, setRunning] = useState(false);
  const groups = useMemo(() => [...new Set(students.map((s) => s.group))].sort((a, b) => a.localeCompare(b, 'ar')), [students]);

  useEffect(() => {
    supabase
      .from('notification_rules')
      .select('*')
      .order('id')
      .then(({ data, error }) => {
        if (error) setFailed(true);
        else setRules((data ?? []).map(notificationRuleFromRow));
      });
  }, []);

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.rpc('run_notification_rules');
    setRunning(false);
    toast(error ? error.message : data ? `تم إنشاء ${data} إشعارًا` : 'لا توجد إشعارات مستحقة الآن');
  };

  if (failed) return <p className="rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-800">الإشعارات التلقائية تحتاج إلى تحديث قاعدة البيانات: شغّل supabase/schema.sql كاملًا من SQL Editor في Supabase.</p>;
  if (!rules) return <p className="p-6 text-center text-navy-400">جارٍ التحميل…</p>;
  return (
    <div className="space-y-2.5">
      {rules.map((r) => (
        <RuleEditor key={r.id} rule={r} groups={groups} onSaved={(n) => setRules((xs) => xs!.map((x) => (x.id === n.id ? n : x)))} />
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[12px] text-navy-400">
        <span>تعمل القواعد المفعّلة تلقائيًا على الخادم كل 10 دقائق بتوقيت الأردن.</span>
        <button className="btn-ghost px-3 py-1.5 text-[12px]" onClick={runNow} disabled={running}>
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} تشغيل الآن
        </button>
      </div>
    </div>
  );
}
