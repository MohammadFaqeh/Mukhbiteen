/**
 * شهادة إتمام حفظ جزء — PDF أفقي (A4) يُبنى داخل المتصفح بنفس طريقة التقرير:
 * صفحة HTML (حتى يظهر الخط العربي صحيحًا) تتحوّل لصورة عالية الدقة داخل ملف PDF.
 * التصميم الحالي مؤقت — لما يصل تصميم المشرف يُستبدل buildPage فقط (مثلًا صورة خلفية + اسم الطالب والجزء والتاريخ فوقها).
 */
import type { Student } from '@/types';
import { PROJECT, supervisor } from '@/data/project';
import { formatDate } from './format';

/** "الجزء الثلاثين" — صفة العدد الترتيبي بعد "حفظ الجزء" (مجرورة) */
const ORDINALS = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرين',
  'الحادي والعشرين', 'الثاني والعشرين', 'الثالث والعشرين', 'الرابع والعشرين', 'الخامس والعشرين', 'السادس والعشرين', 'السابع والعشرين', 'الثامن والعشرين', 'التاسع والعشرين', 'الثلاثين',
];
/** الأسماء المشهورة لبعض الأجزاء */
const JUZ_NAMES: Record<number, string> = { 1: 'جزء الم', 28: 'جزء قد سمع', 29: 'جزء تبارك', 30: 'جزء عمّ' };

export const juzTitle = (n: number) => `الجزء ${ORDINALS[n - 1] ?? n}`;

const W = 1123; // A4 أفقي بدقة 96dpi
const H = 794;
const C = { navy: '#1E2B45', ink: '#24324D', muted: '#6B7A96', gold: '#B8975A', goldSoft: '#E9DCC0', sand: '#FBF8F3' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function buildPage(student: Student, juz: number, date?: string) {
  const base = import.meta.env.BASE_URL;
  const name = JUZ_NAMES[juz];
  const page = document.createElement('div');
  page.style.cssText = `width:${W}px;height:${H}px;box-sizing:border-box;padding:26px;background:${C.sand};direction:rtl;font-family:Tajawal,system-ui,sans-serif;color:${C.ink}`;
  page.innerHTML = `
    <div style="height:100%;box-sizing:border-box;border:2px solid ${C.gold};border-radius:18px;padding:8px">
      <div style="height:100%;box-sizing:border-box;border:1px solid ${C.goldSoft};border-radius:12px;background:#fff;display:flex;flex-direction:column;align-items:center;padding:30px 70px 26px;text-align:center">
        <div style="width:100%;display:flex;justify-content:space-between;align-items:center">
          <img src="${base}images/brand/mukhbiteen-logo.png" crossorigin="anonymous" style="height:92px"/>
          <div style="font-family:Amiri,serif;font-size:26px;color:${C.gold}">بسم الله الرحمن الرحيم</div>
          <img src="${base}images/brand/center-logo.png" crossorigin="anonymous" style="height:88px"/>
        </div>
        <div style="margin-top:14px;font-size:46px;font-weight:800;color:${C.navy}">شهادة إتمام حفظ</div>
        <div style="width:120px;height:3px;border-radius:3px;background:${C.gold};margin:20px 0 22px"></div>
        <div style="font-size:21px;line-height:1.9;color:${C.ink}">يشهد ${esc(PROJECT.name)} في ${esc(PROJECT.center)} بأن الطالب</div>
        <div style="margin:8px 0 6px;font-size:44px;font-weight:800;color:${C.navy}">${esc(student.name)}</div>
        <div style="font-size:21px;line-height:1.9;color:${C.ink}">قد أتمّ حفظ <b style="color:${C.navy}">${juzTitle(juz)}</b>${name ? ` (${name})` : ''} من القرآن الكريم، وسرده كاملًا عن ظهر قلب</div>
        ${date ? `<div style="margin-top:4px;font-size:17px;color:${C.muted}">بتاريخ ${formatDate(date)}</div>` : ''}
        <div style="margin-top:16px;font-family:Amiri,serif;font-size:21px;color:${C.gold}">نسأل الله أن يجعله من أهل القرآن الذين هم أهل الله وخاصته</div>
        <div style="margin-top:auto;width:100%;display:flex;justify-content:space-between;align-items:flex-end">
          <div style="text-align:center;min-width:240px">
            <div style="font-size:14px;color:${C.muted}">${esc(supervisor.title)}</div>
            <div style="margin-top:4px;font-size:19px;font-weight:800;color:${C.navy}">${esc(supervisor.name)}</div>
          </div>
          <div style="font-family:Amiri,serif;font-size:28px;color:${C.navy}">﴿ ${esc(PROJECT.verse)} ﴾</div>
          <div style="min-width:240px"></div>
        </div>
      </div>
    </div>`;
  return page;
}

const waitImages = (root: HTMLElement) =>
  Promise.all(
    [...root.querySelectorAll('img')].map(
      (img) =>
        new Promise<void>((res) => {
          if (img.complete && img.naturalWidth) return res();
          img.onload = () => res();
          img.onerror = () => {
            img.remove();
            res();
          };
        }),
    ),
  );

/** يبني شهادة الجزء ويحمّلها PDF */
export async function downloadJuzCertificate(student: Student, juz: number) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  await document.fonts?.ready;
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;top:0;left:-10000px;z-index:-1;pointer-events:none';
  document.body.appendChild(holder);
  try {
    const page = buildPage(student, juz, student.memorizedJuzDates?.[String(juz)]);
    holder.appendChild(page);
    await waitImages(page);
    const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: W, height: H, windowWidth: W });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
    pdf.save(`شهادة-${juzTitle(juz).replace(/\s+/g, '-')}-${student.name.replace(/\s+/g, '-')}.pdf`);
  } finally {
    holder.remove();
  }
}
