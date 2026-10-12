import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import NotificationComposer from './NotificationComposer';
import AssignmentForm from './AssignmentForm';
import { cx } from '@/utils/format';

/**
 * "إدارة الإشعارات والمطلوبات" — نافذة مختصرة تُفتح من الجرس (للإدارة فقط):
 * تبويب إشعار لأولياء الأمور، وتبويب مطلوب جديد. الإعدادات المتقدمة بصفحة الإشعارات.
 */
export default function ControlCenterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'notify' | 'assignment'>('notify');
  const navigate = useNavigate();
  const go = (to: string) => {
    onClose();
    navigate(to);
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="إدارة الإشعارات والمطلوبات"
      footer={
        <>
          <button className="btn-ghost px-3 py-1.5 text-[12px]" onClick={() => go('/admin/notifications?tab=auto')}>
            <Settings2 className="h-3.5 w-3.5" /> الإعدادات المتقدمة والسجل
          </button>
          <button className="btn-ghost px-3 py-1.5 text-[12px]" onClick={() => go('/admin/assignments')}>
            كل المطلوبات
          </button>
        </>
      }
    >
      <div className="mb-4 inline-flex w-full rounded-xl bg-navy-50 p-1">
        {(
          [
            ['notify', 'إضافة إشعار لأولياء الأمور'],
            ['assignment', 'إضافة مطلوب جديد'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('flex-1 rounded-lg px-3 py-2 text-[13px] font-bold transition', tab === k ? 'bg-white text-navy-900 shadow-soft' : 'text-navy-500')}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'notify' ? <NotificationComposer onSent={onClose} onOpenSettings={() => go('/admin/notifications?tab=auto')} /> : <AssignmentForm onSaved={onClose} />}
    </Modal>
  );
}
