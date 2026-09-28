import { useCallback } from 'react';
import { useToast } from '@/context/ToastContext';

/** تأكيد → تنفيذ الحذف → رسالة نجاح أو خطأ. يرجع true إذا تم الحذف فعلًا. */
export function useConfirmDelete() {
  const toast = useToast();
  return useCallback(
    async (question: string, action: () => Promise<void>, done: string) => {
      if (!confirm(`${question}\nلا يمكن التراجع عن الحذف.`)) return false;
      try {
        await action();
        toast(done);
        return true;
      } catch (e) {
        toast(e instanceof Error ? e.message : 'حدث خطأ أثناء الحذف.');
        return false;
      }
    },
    [toast],
  );
}
