/**
 * توليد تقرير الطالب PDF داخل المتصفح — مصمَّم ليفهمه ولي الأمر بنظرة واحدة:
 * مؤشر عام بالألوان، أشرطة لكل محور مع جملة واضحة، مسار العلامات، نقاط القوة وما يحتاج متابعة، ونصائح للبيت.
 * نبني صفحات A4 بـ HTML (حتى يظهر الخط العربي ووصل الحروف صح) ثم نحوّل كل صفحة لصورة عالية الدقة داخل ملف PDF.
 * المحتوى يُوزَّع على الصفحات كتلة كتلة (وجداول سطرًا سطرًا) فلا ينقص سطر بين صفحتين.
 */
import type { DailyWorship, SessionRecord, Student, TajweedMaterial } from '@/types';
import { PROJECT, supervisor } from '@/data/project';
import { TAJWEED_COURSES, tajweedLabel } from '@/data/tajweed';
import { attendanceRate, monthKey } from './stats';
import { dailyWorshipScore, worshipItems } from './worship';
import { attendanceLabels, commitmentLabels, formatDate, formatDayMonth, formatMonthKey, round1, weekday } from './format';
import { TODAY } from './today';

export interface ReportInput {
  student: Student;
  sessions: SessionRecord[]; // كل سجلات الطالب
  worship: DailyWorship[]; // كل عبادات الطالب
  tajweedMaterials: TajweedMaterial[]; // لفصول دورة التجويد اللي انأخذت خلال الفترة
  from: string;
  to: string;
}

const PAGE_W = 794; // A4 بدقة 96dpi
const PAGE_H = 1123;
const PAD = 40;
const FOOTER_SPACE = 70; // مساحة تذييل الصفحة (اسم المشرف ورقم الصفحة)

const C = {
  navy: '#1E2B45',
  navy2: '#2C3E63',
  ink: '#24324D',
  muted: '#6B7A96',
  line: '#E6EAF1',
  soft: '#F5F7FB',
  burgundy: '#7A2336',
  gold: '#B8975A',
  goldSoft: '#F6EFDF',
  sand: '#FBF8F3',
};

/** مستويات الأداء بالألوان — نفس الألوان بكل التقرير حتى يتعلّمها ولي الأمر من أول نظرة */
const LEVELS = [
  { min: 90, t: 'ممتاز', c: '#23895A', bg: '#E5F4EC', icon: '★' },
  { min: 80, t: 'جيد جدًا', c: '#2F6FB5', bg: '#E6EFFA', icon: '▲' },
  { min: 65, t: 'جيد', c: '#C07A12', bg: '#FBF0DC', icon: '●' },
  { min: 0, t: 'يحتاج متابعة', c: '#B83B3B', bg: '#FBE7E7', icon: '!' },
];
const level = (v: number) => LEVELS.find((l) => v >= l.min)!;

const attended = (s: SessionRecord) => s.attendance === 'present' || s.attendance === 'late';
const avg = (n: number[]) => (n.length ? round1(n.reduce((a, b) => a + b, 0) / n.length) : 0);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const pctOf = (a: number, b: number) => (b > 0 ? Math.min(100, round1((a / b) * 100)) : 0);
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const REPORT_TITLE = 'تقرير متابعة الطالب';

/** عدد أيام الفترة (شاملة البداية والنهاية) لحد اليوم — لبيان كم يوم عبّأ ولي الأمر من أيامها */
function daysInPeriod(from: string, to: string) {
  const end = to > TODAY ? TODAY : to;
  const ms = new Date(`${end}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

/** حساب كل أرقام التقرير للفترة */
export function computeReport({ sessions, worship, from, to }: Pick<ReportInput, 'sessions' | 'worship' | 'from' | 'to'>) {
  const list = sessions.filter((s) => s.date >= from && s.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  const scored = list.filter((s) => attended(s) && typeof s.score === 'number');
  const wDays = worship.filter((d) => d.date >= from && d.date <= to);
  const sum = (f: (s: SessionRecord) => number) => list.reduce((a, s) => a + f(s), 0);
  const months = [...new Set(list.map((s) => monthKey(s.date)))].sort().map((m) => {
    const ms = list.filter((s) => monthKey(s.date) === m);
    const mw = wDays.filter((d) => monthKey(d.date) === m);
    const msScored = ms.filter((s) => attended(s) && typeof s.score === 'number');
    return {
      m,
      count: ms.length,
      scoredCount: msScored.length,
      average: avg(msScored.map((s) => s.score!)),
      attendance: attendanceRate(ms),
      worship: avg(mw.map(dailyWorshipScore)),
    };
  });
  return {
    list,
    scored,
    average: avg(scored.map((s) => s.score!)),
    attendance: attendanceRate(list),
    counts: {
      present: list.filter((s) => s.attendance === 'present').length,
      late: list.filter((s) => s.attendance === 'late').length,
      absent: list.filter((s) => s.attendance === 'absent').length,
      excused: list.filter((s) => s.attendance === 'excused').length,
    },
    worship: avg(wDays.map(dailyWorshipScore)),
    worshipDays: wDays.length,
    memDone: round1(sum((s) => s.memorization?.completedPages ?? 0)),
    memReq: round1(sum((s) => s.memorization?.requiredPages ?? 0)),
    revDone: round1(sum((s) => s.revision?.completedPages ?? 0)),
    revReq: round1(sum((s) => s.revision?.requiredPages ?? 0)),
    memGrade: avg(scored.filter((s) => s.memorization).map((s) => s.memorization!.grade)),
    revGrade: avg(scored.filter((s) => s.revision).map((s) => s.revision!.grade)),
    worshipItems: worshipItems(wDays),
    months,
    // كل ملاحظات المشرف المكتوبة بأيام الدوام خلال الفترة: ملاحظة اليوم + ملاحظة الحفظ + ملاحظة المراجعة
    notes: list
      .map((s) => ({
        date: s.date,
        text: [s.notes?.trim(), s.memorization?.notes?.trim() && `الحفظ: ${s.memorization.notes.trim()}`, s.revision?.notes?.trim() && `المراجعة: ${s.revision.notes.trim()}`]
          .filter(Boolean)
          .join(' · '),
      }))
      .filter((n) => n.text),
  };
}

type Report = ReturnType<typeof computeReport>;

/** محاور التقرير: لكل محور قيمة من 100 وجملة يفهمها ولي الأمر */
function indicators(r: Report, first: string) {
  const out: { key: string; label: string; value: number; line: string; tip: string }[] = [];
  const attendedDays = r.counts.present + r.counts.late;
  const counted = r.list.length - r.counts.excused;
  if (r.list.length)
    out.push({
      key: 'att',
      label: 'الحضور',
      value: r.attendance,
      line: `حضر ${attendedDays} ${attendedDays === 1 ? 'يومًا' : 'أيام'} من أصل ${counted}${r.counts.late ? ` (منها ${r.counts.late} تأخير)` : ''}`,
      tip: 'الحرص على حضور كل أيام الدوام وفي الوقت المحدد، فالحضور أساس الإنجاز.',
    });
  if (r.memReq)
    out.push({
      key: 'mem',
      label: 'إنجاز الحفظ',
      value: pctOf(r.memDone, r.memReq),
      line: `سمّع ${fmt(r.memDone)} صفحة من ${fmt(r.memReq)} صفحة مطلوبة`,
      tip: 'تقسيم الحفظ الجديد على أيام الأسبوع والاستماع لـ' + first + ' وهو يقرأه يوميًا قبل الدوام.',
    });
  if (r.revReq)
    out.push({
      key: 'rev',
      label: 'إنجاز المراجعة',
      value: pctOf(r.revDone, r.revReq),
      line: `راجع ${fmt(r.revDone)} صفحة من ${fmt(r.revReq)} صفحة مطلوبة`,
      tip: 'تخصيص وقت ثابت يوميًا للمراجعة ولو صفحات قليلة، فالمراجعة المستمرة تثبّت الحفظ.',
    });
  const quality = avg([r.memGrade, r.revGrade].filter((x) => x > 0));
  if (quality)
    out.push({
      key: 'q',
      label: 'جودة التسميع',
      value: quality,
      line: 'مدى إتقان التسميع وصحة التلاوة عند المشرف',
      tip: 'التسميع لأحد أفراد الأسرة قبل الدوام والانتباه لأحكام التجويد يرفع جودة التسميع.',
    });
  if (r.worshipDays)
    out.push({
      key: 'wor',
      label: 'العبادات',
      value: r.worship,
      line: `${r.worshipDays} ${r.worshipDays === 1 ? 'يوم' : 'أيام'} مسجّل في جدول العبادات`,
      tip: 'تعبئة جدول العبادات يوميًا وتشجيعه على الصلاة في المسجد والأذكار.',
    });
  return out;
}

/* ---------------- عناصر الرسم ---------------- */

function el(html: string) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

const sectionTitle = (t: string, hint?: string) =>
  `<div style="margin:20px 0 10px;display:flex;align-items:center;gap:10px">
    <div style="width:30px;height:30px;border-radius:9px;background:${C.navy};color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px">◆</div>
    <h2 style="margin:0;font-size:19px;font-weight:800;color:${C.navy}">${t}</h2>
    ${hint ? `<span style="font-size:12.5px;color:${C.muted}">${hint}</span>` : ''}
  </div>`;

/**
 * مؤشر نصف دائري للمعدل العام — يُرسم على canvas كصورة لأن html2canvas لا يرسم أقواس SVG بدقة.
 */
function gauge(value: number) {
  const lv = level(value);
  const W = 220;
  const H = 128;
  const k = 3; // دقة عالية
  const cv = document.createElement('canvas');
  cv.width = W * k;
  cv.height = H * k;
  const g = cv.getContext('2d')!;
  g.scale(k, k);
  g.lineCap = 'round';
  g.lineWidth = 20;
  const cx = W / 2;
  const cy = H - 14;
  const r = 90;
  g.strokeStyle = '#E8ECF3';
  g.beginPath();
  g.arc(cx, cy, r, Math.PI, 2 * Math.PI);
  g.stroke();
  const v = Math.max(0, Math.min(100, value)) / 100;
  if (v > 0) {
    g.strokeStyle = lv.c;
    g.beginPath();
    g.arc(cx, cy, r, Math.PI, Math.PI + v * Math.PI);
    g.stroke();
  }
  return `<div style="position:relative;width:${W}px;height:${H}px;flex-shrink:0">
    <img src="${cv.toDataURL('image/png')}" style="width:${W}px;height:${H}px;display:block"/>
    <div style="position:absolute;left:0;right:0;bottom:6px;text-align:center">
      <div style="font-size:36px;font-weight:800;color:${C.navy};line-height:1">${fmt(value)}<span style="font-size:18px">%</span></div>
      <div style="font-size:12px;color:${C.muted};margin-top:3px">المعدل العام</div>
    </div>
  </div>`;
}

const pill = (text: string, c: string, bg: string) => `<span style="display:inline-block;padding:3px 12px;border-radius:999px;background:${bg};color:${c};font-size:12.5px;font-weight:800">${text}</span>`;

/** سطر مؤشر: الاسم + الشريط الملوّن + النسبة + المستوى + الجملة التوضيحية */
function indicatorRow(label: string, value: number, line: string) {
  const lv = level(value);
  return `<div style="padding:12px 14px;border:1px solid ${C.line};border-radius:14px;background:#fff;margin-bottom:9px">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:118px;font-size:15px;font-weight:800;color:${C.navy}">${label}</div>
      <div style="flex:1;height:14px;border-radius:999px;background:#EEF1F6;overflow:hidden">
        <div style="height:100%;width:${Math.max(2, Math.min(100, value))}%;border-radius:999px;background:${lv.c}"></div>
      </div>
      <div style="width:62px;text-align:left;font-size:17px;font-weight:800;color:${lv.c}">${fmt(value)}%</div>
      <div style="width:104px;text-align:left">${pill(lv.t, lv.c, lv.bg)}</div>
    </div>
    <div style="margin-top:5px;margin-right:128px;font-size:12.5px;color:${C.muted}">${line}</div>
  </div>`;
}

/** رسم أعمدة لعلامات أيام الدوام (مسار التقدّم) */
function scoreChart(scored: SessionRecord[]) {
  const items = scored.slice(-18);
  const H = 120;
  const bars = items
    .map((s) => {
      const v = s.score!;
      const lv = level(v);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:${H + 40}px;min-width:0">
        <div style="font-size:11px;font-weight:800;color:${lv.c};margin-bottom:3px">${v}</div>
        <div style="width:70%;max-width:26px;height:${Math.max(4, (v / 100) * H)}px;border-radius:7px 7px 3px 3px;background:${lv.c}"></div>
        <div style="font-size:10px;color:${C.muted};margin-top:5px;white-space:nowrap">${Number(s.date.slice(8))}/${Number(s.date.slice(5, 7))}</div>
      </div>`;
    })
    .join('');
  return `<div style="border:1px solid ${C.line};border-radius:16px;padding:14px 12px 10px;background:#fff">
    <div style="display:flex;gap:4px;align-items:flex-end;position:relative">${bars}</div>
  </div>`;
}

const th = (t: string, w?: number) => `<th style="padding:10px 8px;font-size:13px;font-weight:800;color:#fff;text-align:right;${w ? `width:${w}px;` : ''}">${t}</th>`;
const td = (t: string, extra = '') => `<td style="padding:8px;font-size:13.5px;color:${C.ink};border-top:1px solid ${C.line};${extra}">${t}</td>`;

function newPage(root: HTMLElement) {
  const page = el(
    `<div style="width:${PAGE_W}px;height:${PAGE_H}px;box-sizing:border-box;padding:${PAD}px ${PAD}px ${FOOTER_SPACE}px;background:#fff;direction:rtl;font-family:Tajawal,system-ui,sans-serif;color:${C.ink};position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg,${C.gold},${C.burgundy} 50%,${C.navy})"></div>
    </div>`,
  );
  root.appendChild(page);
  return page;
}

/** يضيف الكتل للصفحات: لو الكتلة ما بتوسع بالصفحة الحالية تنتقل لصفحة جديدة */
class Paginator {
  pages: HTMLElement[] = [];
  constructor(private root: HTMLElement) {
    this.pages.push(newPage(root));
  }
  get page() {
    return this.pages[this.pages.length - 1];
  }
  /** آخر عنصر لازم ينتهي فوق تذييل الصفحة (scrollHeight ما بيحسب الهامش السفلي بثبات بين المتصفحات) */
  private fits() {
    const last = this.page.lastElementChild as HTMLElement | null;
    return !last || last.offsetTop + last.offsetHeight <= PAGE_H - FOOTER_SPACE;
  }
  add(html: string) {
    const node = el(html);
    this.page.appendChild(node);
    if (!this.fits() && this.page.childElementCount > 2) {
      node.remove();
      this.pages.push(newPage(this.root));
      this.page.appendChild(node);
    }
  }
  /** جدول يتوزّع على أكثر من صفحة مع تكرار رأس الجدول — العنوان ما ينفصل عن أول سطر */
  table(title: string, head: string, rows: string[]) {
    const make = () =>
      el(`<table style="width:100%;border-collapse:separate;border-spacing:0;border:1px solid ${C.line};border-radius:14px;overflow:hidden"><thead style="background:${C.navy2}"><tr>${head}</tr></thead><tbody></tbody></table>`);
    const titleNode = el(`<div>${title}</div>`);
    this.page.appendChild(titleNode);
    let table = make();
    this.page.appendChild(table);
    rows.forEach((r, i) => {
      const tr = el(`<table><tbody>${r}</tbody></table>`).querySelector('tr')!;
      if (i % 2) tr.style.background = C.soft;
      table.querySelector('tbody')!.appendChild(tr);
      if (!this.fits()) {
        tr.remove();
        if (i === 0) {
          titleNode.remove();
          table.remove();
          this.pages.push(newPage(this.root));
          this.page.appendChild(titleNode);
        } else {
          this.pages.push(newPage(this.root));
        }
        table = make();
        this.page.appendChild(table);
        table.querySelector('tbody')!.appendChild(tr);
      }
    });
  }
}

/* ---------------- بناء التقرير ---------------- */

function buildPages(root: HTMLElement, input: ReportInput) {
  const { student, from, to, tajweedMaterials } = input;
  const r = computeReport(input);
  const p = new Paginator(root);
  const base = import.meta.env.BASE_URL;
  const first = student.shortName?.trim() || student.name.split(' ')[0];
  const lv = level(r.average);
  const inds = indicators(r, first);

  // الترويسة: شريط كحلي فيه الشعاران والعنوان
  p.add(`<div style="margin-top:6px;border-radius:20px;background:linear-gradient(135deg,${C.navy} 0%,${C.navy2} 100%);color:#fff;padding:16px 20px;display:flex;align-items:center;gap:16px">
    <div style="width:82px;height:82px;border-radius:18px;background:#fff;display:flex;align-items:center;justify-content:center"><img src="${base}images/brand/mukhbiteen-logo.png" style="height:70px" crossorigin="anonymous"/></div>
    <div style="flex:1;text-align:center">
      <div style="font-size:13.5px;opacity:.8">${esc(PROJECT.name)} · ${esc(PROJECT.center)}</div>
      <div style="font-size:28px;font-weight:800;margin-top:4px">${REPORT_TITLE}</div>
      <div style="display:inline-block;margin-top:8px;padding:4px 14px;border-radius:999px;background:rgba(255,255,255,.14);font-size:13px">من ${formatDate(from)} إلى ${formatDate(to)}</div>
    </div>
    <div style="width:82px;height:82px;border-radius:18px;background:#fff;display:flex;align-items:center;justify-content:center"><img src="${base}images/brand/center-logo.png" style="height:68px" crossorigin="anonymous"/></div>
  </div>`);

  // الطالب + المؤشر العام
  const headline = r.scored.length
    ? `أداء ${esc(first)} خلال هذه الفترة <b style="color:${lv.c}">${lv.t}</b>`
    : r.list.length
      ? `لم يحضر ${esc(first)} أي يوم دوام بعلامة في هذه الفترة`
      : `لا توجد أيام دوام مسجّلة لـ${esc(first)} في هذه الفترة`;
  p.add(`<div style="margin-top:14px;display:flex;align-items:center;gap:18px;border-radius:20px;background:${C.sand};border:1px solid #EFE6D6;padding:16px 20px">
    ${student.photo ? `<img src="${esc(student.photo)}" crossorigin="anonymous" style="width:84px;height:84px;border-radius:50%;object-fit:cover;border:4px solid #fff"/>` : ''}
    <div style="flex:1;min-width:0">
      <div style="font-size:24px;font-weight:800;color:${C.navy}">${esc(student.name)}</div>
      <div style="font-size:13px;color:${C.muted};margin-top:2px">${esc(student.group)}</div>
      <div style="font-size:16px;color:${C.ink};margin-top:10px;line-height:1.7">${headline}</div>
      ${r.scored.length ? `<div style="margin-top:6px">${pill(`${lv.icon} ${lv.t}`, lv.c, lv.bg)}</div>` : ''}
    </div>
    ${r.scored.length ? gauge(r.average) : ''}
  </div>`);

  if (!r.list.length && !r.worshipDays) {
    p.add(`<p style="margin-top:40px;text-align:center;font-size:17px;color:${C.muted}">لا توجد أيام دوام أو عبادات مسجّلة في هذه الفترة.</p>`);
    return p.pages;
  }

  // دليل الألوان
  p.add(`<div style="margin-top:12px;display:flex;justify-content:center;gap:8px;flex-wrap:wrap;font-size:12px;color:${C.muted}">
    <span style="align-self:center">دليل الألوان:</span>
    ${LEVELS.map((l) => pill(`${l.t} ${l.min ? `(${l.min}+)` : `(أقل من 65)`}`, l.c, l.bg)).join('')}
  </div>`);

  // المحاور
  if (inds.length) p.add(`<div>${sectionTitle('مؤشرات الأداء', '(كل مؤشر من 100)')}${inds.map((i) => indicatorRow(i.label, i.value, i.line)).join('')}</div>`);

  // نقاط القوة وما يحتاج متابعة + نصائح
  if (inds.length) {
    const sorted = [...inds].sort((a, b) => b.value - a.value);
    const strong = sorted.filter((i) => i.value >= 80).slice(0, 3);
    const weak = sorted.filter((i) => i.value < 80).reverse().slice(0, 2);
    const box = (title: string, color: string, bg: string, icon: string, body: string) =>
      `<div style="flex:1;min-width:0;border-radius:16px;background:${bg};padding:14px 16px">
        <div style="font-size:15.5px;font-weight:800;color:${color};margin-bottom:8px">${icon} ${title}</div>${body}</div>`;
    const li = (t: string) => `<div style="font-size:13.5px;line-height:1.8;color:${C.ink}">• ${t}</div>`;
    p.add(`<div>${sectionTitle('الخلاصة لولي الأمر')}
      <div style="display:flex;gap:12px">
        ${box('نقاط القوة', '#23895A', '#EAF6EF', '✓', strong.length ? strong.map((i) => li(`${i.label}: ${fmt(i.value)}%`)).join('') : li('نحتاج تحسين المؤشرات لنصل لمستوى ممتاز بإذن الله.'))}
        ${box('يحتاج متابعة في البيت', '#B83B3B', '#FCEEEE', '!', weak.length ? weak.map((i) => li(i.tip)).join('') : li('لا شيء'))}
      </div></div>`);
  }

  // مسار العلامات
  if (r.scored.length > 1) {
    p.add(`<div>${sectionTitle('مسار علامات أيام الدوام', r.scored.length > 18 ? '(آخر 18 يومًا)' : '')}${scoreChart(r.scored)}</div>`);
  }

  // الأداء حسب الأشهر (لفترة أطول من شهر)
  if (r.months.length > 1 && daysInPeriod(from, to) > 31) {
    p.table(
      sectionTitle('الأداء حسب الأشهر'),
      th('الشهر') + th('أيام الدوام', 100) + th('المعدل', 120) + th('الحضور', 100) + th('العبادات', 100),
      r.months.map((m) => {
        const ml = level(m.average);
        return `<tr>${td(`<b>${formatMonthKey(m.m)}</b>`)}${td(String(m.count))}${td(m.scoredCount ? pill(`${fmt(m.average)}%`, ml.c, ml.bg) : `<span style="color:${C.muted}">لم يحضر</span>`)}${td(`${fmt(m.attendance)}%`)}${td(m.worship ? `${fmt(m.worship)}%` : '—')}</tr>`;
      }),
    );
  }

  // دورة التجويد
  if (student.tajweedCurrent || student.tajweedCompleted?.length) {
    const done = student.tajweedCompleted ?? [];
    const steps = TAJWEED_COURSES.map((c) => {
      const isDone = done.includes(c.key);
      const isCur = student.tajweedCurrent === c.key;
      const [col, bg] = isDone ? ['#23895A', '#EAF6EF'] : isCur ? [C.navy, C.goldSoft] : ['#A3AEC2', C.soft];
      return `<div style="flex:1;border-radius:12px;background:${bg};padding:9px 6px;text-align:center;border:${isCur ? `2px solid ${C.gold}` : '2px solid transparent'}">
        <div style="font-size:16px;font-weight:800;color:${col}">${isDone ? '✓' : isCur ? '◉' : '○'}</div>
        <div style="font-size:12.5px;font-weight:800;color:${col}">${c.label.replace('الدورة ', '').replace('دورة ', '')}</div>
        <div style="font-size:11px;color:${C.muted}">${isDone ? 'اجتازها' : isCur ? 'يدرسها حاليًا' : 'لاحقًا'}</div>
      </div>`;
    }).join('');
    p.add(`<div>${sectionTitle('دورات التجويد', student.tajweedCurrent ? `(حاليًا: ${tajweedLabel(student.tajweedCurrent)})` : '')}<div style="display:flex;gap:8px">${steps}</div></div>`);

    // فصول الدورة الحالية اللي انأخذت خلال الفترة (ثابتة للدورة، فكل طالب مسجّل فيها يتبعها)
    const chapters = tajweedMaterials.find((m) => m.course === student.tajweedCurrent)?.chapters ?? [];
    if (chapters.length) {
      const inPeriod = chapters.filter((c) => c.date && c.date >= from && c.date <= to).sort((a, b) => a.date!.localeCompare(b.date!));
      const givenAll = chapters.filter((c) => c.date && c.date <= to).length;
      const body = inPeriod.length
        ? inPeriod
            .map(
              (c) =>
                `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid ${C.line}"><span style="color:#23895A;font-weight:800">✓</span><span style="flex:1;font-size:13.5px;color:${C.ink}">${esc(c.title)}</span><span style="font-size:12px;color:${C.muted}">${formatDayMonth(c.date!)}</span></div>`,
            )
            .join('')
        : `<div style="padding:8px 0;font-size:13.5px;color:${C.muted};border-top:1px solid ${C.line}">لم تُعطَ فصول جديدة خلال هذه الفترة</div>`;
      p.add(`<div style="margin-top:10px;border:1px solid ${C.line};border-radius:14px;padding:10px 16px;background:#fff">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <b style="font-size:14.5px;color:${C.navy}">ما أخذه في ${esc(tajweedLabel(student.tajweedCurrent))} خلال الفترة</b>
          <span style="font-size:12.5px;color:${C.muted}">تقدّم الدورة: ${givenAll} من ${chapters.length} فصول</span>
        </div>${body}</div>`);
    }
  }

  // أيام الدوام بالتفصيل
  if (r.list.length) {
    p.table(
      sectionTitle('تفاصيل أيام الدوام', '(الصفحات: المسمّع من المطلوب)'),
      th('اليوم', 140) + th('الحضور', 92) + th('الحفظ') + th('المراجعة') + th('العلامة', 78),
      r.list.map((s) => {
        const part = (e?: { completedPages: number; requiredPages: number; grade: number } | null) =>
          e ? `<b>${fmt(e.completedPages)}</b> من ${fmt(e.requiredPages)} ص <span style="color:${C.muted};font-size:11.5px">· إتقان ${e.grade}</span>` : `<span style="color:${C.muted}">—</span>`;
        const ok = attended(s);
        const att = { present: ['#23895A', '#EAF6EF'], late: ['#C07A12', '#FBF0DC'], excused: ['#6B7A96', '#EEF1F6'], absent: ['#B83B3B', '#FBE7E7'] }[s.attendance];
        const sl = typeof s.score === 'number' ? level(s.score) : null;
        return `<tr>${td(`${weekday(s.date)} ${formatDayMonth(s.date)}`)}${td(pill(attendanceLabels[s.attendance], att[0], att[1]))}${td(ok ? part(s.memorization) : '—')}${td(ok ? part(s.revision) : '—')}${td(
          ok && sl ? pill(String(s.score), sl.c, sl.bg) : '—',
        )}</tr>`;
      }),
    );
  }

  // جدول العبادات: إجمالي الفترة كاملة — المعدل العام، أكثر 3 أشياء ملتزم فيها، وكل شي تقييمه جيد أو أقل
  if (r.worshipDays) {
    const wl = level(r.worship);
    const total = daysInPeriod(from, to);
    const sorted = [...r.worshipItems].sort((a, b) => b.value - a.value);
    const best = sorted.filter((i) => i.value >= 80).slice(0, 3);
    const weak = sorted.filter((i) => i.value < 80).reverse();
    const row = (i: { label: string; value: number }) => {
      const il = level(i.value);
      return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0"><span style="flex:1;font-size:13.5px;color:${C.ink}">${i.label}</span><b style="font-size:13px;color:${il.c}">${fmt(i.value)}%</b>${pill(il.t, il.c, il.bg)}</div>`;
    };
    const box = (title: string, color: string, bg: string, body: string) =>
      `<div style="flex:1;min-width:0;border-radius:16px;background:${bg};padding:12px 16px"><div style="font-size:15px;font-weight:800;color:${color};margin-bottom:4px">${title}</div>${body}</div>`;
    const none = `<div style="font-size:13.5px;color:${C.muted};padding:5px 0">لا شيء</div>`;
    p.add(`<div>${sectionTitle('جدول العبادات')}
      <div style="display:flex;align-items:center;gap:14px;border:1px solid ${C.line};border-radius:14px;padding:12px 16px;background:#fff;margin-bottom:10px">
        <div style="font-size:15px;font-weight:800;color:${C.navy}">المعدل العام للعبادات خلال الفترة</div>
        <div style="flex:1;font-size:12.5px;color:${C.muted}">عُبّئ ${r.worshipDays} من أصل ${total} ${total === 1 ? 'يوم' : 'أيام'}</div>
        <b style="font-size:20px;color:${wl.c}">${fmt(r.worship)}%</b>${pill(wl.t, wl.c, wl.bg)}
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start">
        ${box('✓ أكثر ما يلتزم به', '#23895A', '#EAF6EF', best.length ? best.map(row).join('') : none)}
        ${box('! يحتاج اهتمامًا أكثر', '#B83B3B', '#FCEEEE', weak.length ? weak.map(row).join('') : none)}
      </div></div>`);
  }

  // ملاحظات المشرف — العنوان يبقى مع أول ملاحظة بنفس الصفحة
  const lastCommitment = [...r.list].reverse().find((s) => s.commitment)?.commitment;
  if (r.notes.length || lastCommitment) {
    const note = (n: { date: string; text: string }) =>
      `<div style="margin-bottom:7px;padding:10px 14px;border-radius:12px;background:${C.soft};border-right:4px solid ${C.gold};font-size:13.5px;line-height:1.8"><b style="color:${C.muted};font-size:12.5px">${formatDayMonth(n.date)}:</b> ${esc(n.text)}</div>`;
    const notes = r.notes;
    p.add(`<div>${sectionTitle('ملاحظات المشرف')}
      ${lastCommitment ? `<p style="margin:0 0 8px;font-size:14px">الالتزام والسلوك في آخر دوام: <b style="color:${C.navy}">${commitmentLabels[lastCommitment]}</b></p>` : ''}
      ${notes[0] ? note(notes[0]) : ''}</div>`);
    notes.slice(1).forEach((n) => p.add(note(n)));
  }

  // الخاتمة
  p.add(`<div style="margin-top:18px;border-radius:16px;background:${C.goldSoft};padding:14px 18px;text-align:center;font-size:14px;line-height:1.9;color:${C.ink}">
    نشكر لكم متابعتكم وحرصكم، ونسأل الله أن يجعل ${esc(first)} من أهل القرآن الذين هم أهل الله وخاصته.
    <div style="font-size:12.5px;color:${C.muted};margin-top:2px">لأي استفسار يسعدنا تواصلكم مع مشرف المشروع</div>
  </div>`);

  return p.pages;
}

function stamp(pages: HTMLElement[]) {
  pages.forEach((page, i) => {
    page.appendChild(
      el(
        `<div style="position:absolute;bottom:20px;left:${PAD}px;right:${PAD}px;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:${C.muted};border-top:1px solid ${C.line};padding-top:8px">
          <span>${esc(supervisor.title)}: <b style="color:${C.ink}">${esc(supervisor.name)}</b></span>
          <span>تاريخ الإصدار ${formatDate(TODAY)} · صفحة ${i + 1} من ${pages.length}</span>
        </div>`,
      ),
    );
  });
}

const waitImages = (root: HTMLElement) =>
  Promise.all(
    [...root.querySelectorAll('img')].map(
      (img) =>
        new Promise<void>((res) => {
          if (img.complete && img.naturalWidth) return res();
          img.onload = () => res();
          img.onerror = () => {
            img.remove(); // صورة ما تحمّلت (مثلًا صورة الطالب) — نكمل التقرير بدونها
            res();
          };
        }),
    ),
  );

export function reportFileName({ student, from, to }: ReportInput) {
  return `تقرير-${student.name.replace(/\s+/g, '-')}-${from}_${to}.pdf`;
}

/** يبني ملف التقرير (jsPDF) بدون تحميله */
export async function buildReportPdf(input: ReportInput) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  await document.fonts?.ready;
  const root = el(`<div style="position:fixed;top:0;left:-10000px;z-index:-1;pointer-events:none"></div>`);
  document.body.appendChild(root);
  try {
    const pages = buildPages(root, input);
    stamp(pages);
    await waitImages(root);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    for (const [i, page] of pages.entries()) {
      const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: PAGE_W, height: PAGE_H, windowWidth: PAGE_W });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h);
    }
    return pdf;
  } finally {
    root.remove();
  }
}

/** يبني التقرير ويحمّله كملف PDF */
export async function downloadReport(input: ReportInput) {
  const pdf = await buildReportPdf(input);
  pdf.save(reportFileName(input));
}
