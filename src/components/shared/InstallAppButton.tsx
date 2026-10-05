import { Share, Smartphone, SquarePlus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useInstallApp } from '@/hooks/useInstallApp';
import { cx } from '@/utils/format';

/**
 * زر "تثبيت التطبيق على الهاتف" — لا يظهر إلا إذا كان التثبيت ممكنًا على هذا الجهاز ولم يُثبَّت بعد.
 * أندرويد: نافذة التثبيت مباشرة. آيفون: خطوتا "إضافة إلى الشاشة الرئيسية".
 * compact: أيقونة فقط (للقائمة الجانبية المطوية).
 */
export default function InstallAppButton({ className, compact }: { className?: string; compact?: boolean }) {
  const app = useInstallApp();
  if (!app.canInstall && !app.iosHelp) return null;
  return (
    <>
      {app.canInstall && (
        <button
          onClick={app.install}
          title={compact ? 'تثبيت التطبيق' : undefined}
          className={cx(
            'flex items-center gap-3 rounded-xl border border-gold-300/60 bg-sand-50 px-3.5 py-2.5 text-[14px] font-bold text-navy-800 transition hover:bg-sand-100',
            compact && 'justify-center px-0',
            className,
          )}
        >
          <Smartphone className="h-[18px] w-[18px] shrink-0 text-gold-600" strokeWidth={1.8} />
          {!compact && 'تثبيت التطبيق على الهاتف'}
        </button>
      )}
      <Modal open={app.iosHelp} onClose={app.closeIosHelp} title="تثبيت التطبيق على الآيفون" subtitle="خطوتان فقط من متصفح Safari">
        <ol className="space-y-3 text-[14px] text-navy-700">
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
              <Share className="h-5 w-5" />
            </span>
            اضغط زر المشاركة أسفل الشاشة
          </li>
          <li className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
              <SquarePlus className="h-5 w-5" />
            </span>
            اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة»
          </li>
        </ol>
        <p className="mt-4 text-[12px] text-navy-400">سيظهر شعار المشروع على شاشة هاتفك، ويفتح الموقع كتطبيق مستقل.</p>
      </Modal>
    </>
  );
}
