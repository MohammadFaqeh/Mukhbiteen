import { useEffect, useState } from 'react';

/**
 * تثبيت الموقع كتطبيق على الهاتف:
 * أندرويد/كروم: المتصفح يرسل beforeinstallprompt فنحتفظ به ونعرضه عند الضغط على "تثبيت التطبيق".
 * آيفون (سفاري): لا يوجد تثبيت تلقائي، فنعرض خطوات "إضافة إلى الشاشة الرئيسية".
 * الحدث قد يصل قبل ظهور القائمة، لذلك نلتقطه على مستوى الملف (يُحمَّل مع بداية الموقع).
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function useInstallApp() {
  const [, force] = useState(0);
  const [iosHelp, setIosHelp] = useState(false);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const standalone = isStandalone();
  const ios = isIOS();
  const canInstall = !standalone && (!!deferred || ios);

  const install = async () => {
    // الآيفون أولًا: سفاري لا يدعم التثبيت التلقائي، فنعرض الخطوات دائمًا
    if (ios) {
      setIosHelp(true);
    } else if (deferred) {
      await deferred.prompt();
      await deferred.userChoice.catch(() => undefined);
      deferred = null;
      notify();
    }
  };

  return { canInstall, install, iosHelp, closeIosHelp: () => setIosHelp(false) };
}
