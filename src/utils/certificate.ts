/**
 * شهادة إتمام حفظ جزء — PDF أفقي (A4) يُرسم داخل المتصفح.
 * الخلفية تصميم المركز (public/certificates/juz-template.png)، ونكتب فوقها بأماكنها الفاضية:
 * اسم الطالب، ورقم الجزء (بالأرقام الإنجليزية)، والتاريخ — مع شعار المشروع أعلى الشهادة.
 * الرسم مباشرة على canvas (وليس لقطة لصفحة HTML) حتى تكون المواضع دقيقة وثابتة في كل مرة.
 * المواضع نسب من أبعاد التصميم (3508×2480) مقاسة من الملف نفسه، فلو تغيّر التصميم تُعدَّل قيم POS فقط.
 */
import type { Student } from '@/types';
import { savePdf } from './savePdf';

/** "الجزء الثلاثين" — صفة العدد الترتيبي بعد "حفظ الجزء" (مجرورة) */
const ORDINALS = [
  'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
  'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرين',
  'الحادي والعشرين', 'الثاني والعشرين', 'الثالث والعشرين', 'الرابع والعشرين', 'الخامس والعشرين', 'السادس والعشرين', 'السابع والعشرين', 'الثامن والعشرين', 'التاسع والعشرين', 'الثلاثين',
];

export const juzTitle = (n: number) => `الجزء ${ORDINALS[n - 1] ?? n}`;

const GREEN = '#0F4D3A';
const GOLD = '#A8832F';
const PAPER = '#FFFEFA';
/** عرض الصورة النهائية بالبكسل (ارتفاعها بنفس نسبة التصميم) — دقة طباعة جيدة بحجم ملف معقول */
const OUT_W = 2480;

/** المواضع كنسب من العرض/الارتفاع. line = ارتفاع الخط المنقّط؛ النص يُرسم فوقه بمسافة gap */
const POS = {
  name: { x: 0.5, line: 0.5617, size: 0.0375, maxW: 0.42 }, // size نسبة من العرض
  juz: { x: 0.33, line: 0.6431, size: 0.027 },
  date: { x: 0.5, line: 0.8681, size: 0.0155 },
  gap: 0.006,
  logo: { x: 0.835, y: 0.165, w: 0.15 }, // شعار المشروع أعلى يمين الشهادة
  hint: { x: 0.478, y: 0.564, w: 0.044, h: 0.02 }, // كلمة "اسم الطالب" المطبوعة تحت الخط — تُغطّى بلون الخلفية
};

/** 2026-10-05 ← 2026/10/05 */
const slashDate = (iso: string) => iso.replace(/-/g, '/');

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((res) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });

/** يرسم نصًا متمركزًا أفقيًا حول x، وأسفله (مع الحروف النازلة) فوق الخط بمسافة ثابتة */
function textAbove(g: CanvasRenderingContext2D, text: string, x: number, lineY: number, gap: number, font: string, color: string, maxW?: number) {
  g.font = font;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  const m = g.measureText(text);
  if (maxW && m.width > maxW) {
    // اسم طويل جدًا: نصغّر الخط حتى يتسع ضمن الخط المنقّط
    const size = parseFloat(font.match(/(\d+(?:\.\d+)?)px/)![1]);
    g.font = font.replace(/\d+(?:\.\d+)?px/, `${Math.floor((size * maxW) / m.width)}px`);
  }
  const descent = g.measureText(text).actualBoundingBoxDescent || 0;
  g.fillText(text, x, lineY - gap - descent);
}

/** يبني صورة الشهادة (canvas) */
async function drawCertificate(student: Student, juz: number) {
  const base = import.meta.env.BASE_URL;
  const [tpl, logo] = await Promise.all([loadImage(`${base}certificates/juz-template.png`), loadImage(`${base}images/brand/mukhbiteen-logo.png`)]);
  // الخط العربي محمّل كأجزاء حسب الحروف (unicode-range): لازم نطلبه مع النص نفسه وإلا يُرسم الاسم بخط بديل
  await Promise.all(
    [['700 80px Amiri', `${student.name} 0123456789`], ['500 40px Tajawal', '0123456789/']].map(([f, t]) => document.fonts?.load(f, t).catch(() => undefined)),
  );
  await document.fonts?.ready;

  const W = OUT_W;
  const H = Math.round(tpl ? (W * tpl.height) / tpl.width : W / Math.SQRT2);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  if (tpl) g.drawImage(tpl, 0, 0, W, H);
  g.direction = 'rtl';

  const { hint } = POS;
  g.fillStyle = PAPER;
  g.fillRect(hint.x * W, hint.y * H, hint.w * W, hint.h * H);

  if (logo) {
    const lw = POS.logo.w * W;
    const lh = (lw * logo.height) / logo.width;
    g.drawImage(logo, POS.logo.x * W - lw / 2, POS.logo.y * H - lh / 2, lw, lh);
  }

  const gap = POS.gap * H;
  textAbove(g, student.name, POS.name.x * W, POS.name.line * H, gap, `700 ${POS.name.size * W}px Amiri, serif`, GREEN, POS.name.maxW * W);
  g.direction = 'ltr';
  textAbove(g, String(juz), POS.juz.x * W, POS.juz.line * H, gap, `700 ${POS.juz.size * W}px Amiri, serif`, GOLD);
  const date = student.memorizedJuzDates?.[String(juz)];
  if (date) textAbove(g, slashDate(date), POS.date.x * W, POS.date.line * H, gap, `500 ${POS.date.size * W}px Tajawal, system-ui, sans-serif`, '#1F2A37');
  return cv;
}

/** يبني شهادة الجزء ويحمّلها PDF */
export async function downloadJuzCertificate(student: Student, juz: number) {
  const { jsPDF } = await import('jspdf');
  const cv = await drawCertificate(student, juz);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
  pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
  await savePdf(pdf, `شهادة-${juzTitle(juz).replace(/\s+/g, '-')}-${student.name.replace(/\s+/g, '-')}.pdf`);
}
