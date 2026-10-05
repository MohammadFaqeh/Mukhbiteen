import type { jsPDF } from 'jspdf';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * حفظ ملف PDF: التحميل العادي، إلا داخل التطبيق المثبّت على الآيفون —
 * هناك التحميل يفتح الملف بصفحة بلا زر رجوع، فنستخدم قائمة المشاركة (حفظ في الملفات، واتساب...).
 */
export async function savePdf(pdf: jsPDF, fileName: string) {
  if (isIOS() && isStandalone() && typeof navigator.share === 'function') {
    const file = new File([pdf.output('blob')], fileName, { type: 'application/pdf' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName.replace(/\.pdf$/, '') });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return; // أغلق المستخدم قائمة المشاركة
      }
    }
  }
  pdf.save(fileName);
}
