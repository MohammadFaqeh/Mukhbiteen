/**
 * توليد تقرير الطالب PDF داخل المتصفح.
 * نبني صفحات A4 بـ HTML (حتى يظهر الخط العربي ووصل الحروف صح) ثم نحوّل كل صفحة لصورة عالية الدقة داخل ملف PDF.
 * المحتوى يُوزَّع على الصفحات كتلة كتلة (وجداول سطرًا سطرًا) فلا ينقص سطر بين صفحتين.
 */
import type { DailyWorship, SessionRecord, Student } from '@/types';
import { PROJECT, supervisor } from '@/data/project';
import { tajweedLabel } from '@/data/tajweed';
import { attendanceRate, monthKey } from './stats';
import { dailyWorshipScore, weekStartOf, weekWorshipScore } from './worship';
import { attendanceLabels, commitmentLabels, formatDate, formatDayMonth, formatMonthKey, round1, weekday } from './format';
import { TODAY } from './today';

export type ReportKind = 'month' | 'term' | 'custom';

export interface ReportInput {
  kind: ReportKind;
  student: Student;
  sessions: SessionRecord[]; // كل سجلات الطالب
  worship: DailyWorship[]; // كل عبادات الطالب
  from: string;
  to: string;
}

const PAGE_W = 794; // A4 بدقة 96dpi
const PAGE_H = 1123;
const PAD = 44;
const FOOTER_SPACE = 76; // مساحة تذييل الصفحة (اسم المشرف ورقم الصفحة)

const C = { navy: '#1E2B45', ink: '#24324D', muted: '#6B7A96', line: '#E3E8F0', soft: '#F4F6FA', burgundy: '#7A2336', green: '#2F7D5B', gold: '#B8975A', sand: '#FBF8F3' };

const attended = (s: SessionRecord) => s.attendance === 'present' || s.attendance === 'late';
const avg = (n: number[]) => (n.length ? round1(n.reduce((a, b) => a + b, 0) / n.length) : 0);
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** وصف بالكلمات للعلامة — أوضح لولي الأمر من الرقم وحده */
function verdict(score: number) {
  if (score >= 90) return { t: 'ممتاز', c: C.green };
  if (score >= 80) return { t: 'جيد جدًا', c: '#3D6FB0' };
  if (score >= 65) return { t: 'جيد', c: C.gold };
  return { t: 'يحتاج متابعة', c: C.burgundy };
}

export function reportTitle(kind: ReportKind, from: string, to: string) {
  if (kind === 'month') return `التقرير الشهري — ${formatMonthKey(monthKey(from))}`;
  if (kind === 'term') return 'التقرير الفصلي';
  return `تقرير الفترة ${formatDate(from)} – ${formatDate(to)}`;
}

/** حساب كل أرقام التقرير للفترة */
export function computeReport({ sessions, worship, from, to }: Pick<ReportInput, 'sessions' | 'worship' | 'from' | 'to'>) {
  const list = sessions.filter((s) => s.date >= from && s.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  const scored = list.filter((s) => attended(s) && typeof s.score === 'number');
  const wDays = worship.filter((d) => d.date >= from && d.date <= to);
  const sum = (f: (s: SessionRecord) => number) => list.reduce((a, s) => a + f(s), 0);
  const weeks = [...new Set(wDays.map((d) => weekStartOf(d.date)))].sort().map((ws) => {
    const days = wDays.filter((d) => weekStartOf(d.date) === ws);
    return { ws, filled: days.length, score: weekWorshipScore(days), charity: days.some((d) => d.charity), kahf: days.some((d) => d.kahf) };
  });
  const months = [...new Set(list.map((s) => monthKey(s.date)))].sort().map((m) => {
    const ms = list.filter((s) => monthKey(s.date) === m);
    const mw = wDays.filter((d) => monthKey(d.date) === m);
    return {
      m,
      count: ms.length,
      average: avg(ms.filter((s) => attended(s) && typeof s.score === 'number').map((s) => s.score!)),
      attendance: attendanceRate(ms),
      worship: avg(mw.map(dailyWorshipScore)),
    };
  });
  return {
    list,
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
    weeks,
    months,
    notes: list.filter((s) => s.notes?.trim()).map((s) => ({ date: s.date, text: s.notes!.trim() })),
  };
}

/* ---------------- بناء الصفحات ---------------- */

function el(html: string) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

const sectionTitle = (t: string, hint?: string) =>
  `<div style="margin:22px 0 10px;display:flex;align-items:baseline;gap:10px"><div style="width:5px;height:20px;border-radius:3px;background:${C.burgundy}"></div><h2 style="margin:0;font-size:19px;font-weight:800;color:${C.navy}">${t}</h2>${hint ? `<span style="font-size:12.5px;color:${C.muted}">${hint}</span>` : ''}</div>`;

function tile(label: string, value: string, sub: string, color: string) {
  return `<div style="flex:1;min-width:0;border:1px solid ${C.line};border-radius:14px;padding:12px 10px;text-align:center;background:#fff">
    <div style="font-size:13px;color:${C.muted}">${label}</div>
    <div style="font-size:26px;font-weight:800;color:${color};margin:2px 0">${value}</div>
    <div style="font-size:12px;color:${C.muted}">${sub}</div></div>`;
}

const th = (t: string, w?: number) => `<th style="padding:9px 8px;font-size:13px;font-weight:700;color:${C.navy};text-align:right;${w ? `width:${w}px;` : ''}">${t}</th>`;
const td = (t: string, extra = '') => `<td style="padding:8px;font-size:13.5px;color:${C.ink};border-top:1px solid ${C.line};${extra}">${t}</td>`;

function newPage(root: HTMLElement) {
  const page = el(
    `<div style="width:${PAGE_W}px;height:${PAGE_H}px;box-sizing:border-box;padding:${PAD}px ${PAD}px 70px;background:#fff;direction:rtl;font-family:Tajawal,system-ui,sans-serif;color:${C.ink};position:relative;overflow:hidden"></div>`,
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
    if (!this.fits() && this.page.childElementCount > 1) {
      node.remove();
      this.pages.push(newPage(this.root));
      this.page.appendChild(node);
    }
  }
  /** جدول يتوزّع على أكثر من صفحة مع تكرار رأس الجدول — العنوان ما ينفصل عن أول سطر */
  table(title: string, head: string, rows: string[]) {
    const make = () => el(`<table style="width:100%;border-collapse:collapse;border:1px solid ${C.line};border-radius:12px;overflow:hidden"><thead style="background:${C.soft}"><tr>${head}</tr></thead><tbody></tbody></table>`);
    const titleNode = el(`<div>${title}</div>`);
    this.page.appendChild(titleNode);
    let table = make();
    this.page.appendChild(table);
    rows.forEach((r, i) => {
      const tr = el(`<table><tbody>${r}</tbody></table>`).querySelector('tr')!;
      table.querySelector('tbody')!.appendChild(tr);
      if (!this.fits()) {
        tr.remove();
        if (i === 0) {
          // ما في ولا سطر بالصفحة: ننقل العنوان مع الجدول للصفحة التالية
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

function buildPages(root: HTMLElement, input: ReportInput) {
  const { student, kind, from, to } = input;
  const r = computeReport(input);
  const p = new Paginator(root);
  const base = import.meta.env.BASE_URL;
  const title = reportTitle(kind, from, to);
  const v = verdict(r.average);

  // الترويسة
  p.add(`<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${C.navy};padding-bottom:14px">
    <img src="${base}images/brand/mukhbiteen-logo.png" style="height:74px" crossorigin="anonymous"/>
    <div style="text-align:center">
      <div style="font-size:15px;color:${C.muted}">${esc(PROJECT.name)} · ${esc(PROJECT.center)}</div>
      <div style="font-size:27px;font-weight:800;color:${C.navy};margin-top:4px">${esc(title)}</div>
      <div style="font-size:13.5px;color:${C.muted};margin-top:4px">الفترة: ${formatDate(from)} – ${formatDate(to)}</div>
    </div>
    <img src="${base}images/brand/center-logo.png" style="height:68px" crossorigin="anonymous"/>
  </div>`);

  // بطاقة الطالب
  p.add(`<div style="margin-top:16px;display:flex;align-items:center;gap:16px;background:${C.sand};border:1px solid #EFE6D6;border-radius:16px;padding:14px 18px">
    ${student.photo ? `<img src="${esc(student.photo)}" crossorigin="anonymous" style="width:66px;height:66px;border-radius:50%;object-fit:cover;border:3px solid #fff"/>` : ''}
    <div style="flex:1">
      <div style="font-size:22px;font-weight:800;color:${C.navy}">${esc(student.name)}</div>
      <div style="font-size:13.5px;color:${C.muted};margin-top:3px">${esc(student.group)}${student.tajweedCurrent ? ` · دورة التجويد الحالية: ${tajweedLabel(student.tajweedCurrent)}` : ''}</div>
    </div>
    <div style="text-align:center;padding:8px 16px;border-radius:12px;background:#fff;border:2px solid ${v.c}">
      <div style="font-size:12px;color:${C.muted}">التقدير العام</div>
      <div style="font-size:20px;font-weight:800;color:${v.c}">${r.list.length ? v.t : '—'}</div>
    </div>
  </div>`);

  if (!r.list.length && !r.worshipDays) {
    p.add(`<p style="margin-top:40px;text-align:center;font-size:17px;color:${C.muted}">لا توجد أيام دوام أو عبادات مسجّلة في هذه الفترة.</p>`);
    return p.pages;
  }

  // الأرقام الرئيسية
  p.add(`<div>${sectionTitle('الخلاصة', '(كل العلامات من 100)')}
    <div style="display:flex;gap:10px">
      ${tile('معدل العلامات', `${fmt(r.average)}%`, 'متوسط علامة أيام الدوام', C.navy)}
      ${tile('نسبة الحضور', `${fmt(r.attendance)}%`, `${r.counts.present + r.counts.late} حضور من ${r.list.length - r.counts.excused} يوم`, C.green)}
      ${tile('العبادات', `${fmt(r.worship)}%`, `${r.worshipDays} يوم معبّأ`, C.gold)}
    </div>
    <div style="display:flex;gap:10px;margin-top:10px">
      ${tile('صفحات الحفظ', `${fmt(r.memDone)}`, r.memReq ? `من ${fmt(r.memReq)} صفحة مطلوبة · جودة ${fmt(r.memGrade)}%` : 'لا حفظ مطلوب', C.navy)}
      ${tile('صفحات المراجعة', `${fmt(r.revDone)}`, r.revReq ? `من ${fmt(r.revReq)} صفحة مطلوبة · جودة ${fmt(r.revGrade)}%` : 'لا مراجعة مطلوبة', C.burgundy)}
    </div>
    <div style="margin-top:10px;font-size:13px;color:${C.muted};line-height:1.9">
      الحضور: ${r.counts.present} حاضر · ${r.counts.late} متأخر · ${r.counts.absent} غائب · ${r.counts.excused} غائب بعذر (الغياب بعذر لا يُحسب على الطالب).
    </div>
  </div>`);

  // تفصيل الأشهر (للتقرير الفصلي أو أي فترة أطول من شهر)
  if (r.months.length > 1) {
    p.table(
      sectionTitle('الأداء حسب الأشهر'),
      th('الشهر') + th('أيام الدوام', 110) + th('المعدل', 100) + th('الحضور', 100) + th('العبادات', 100),
      r.months.map((m) => `<tr>${td(`<b>${formatMonthKey(m.m)}</b>`)}${td(String(m.count))}${td(`<b>${fmt(m.average)}%</b>`)}${td(`${fmt(m.attendance)}%`)}${td(m.worship ? `${fmt(m.worship)}%` : '—')}</tr>`),
    );
  }

  // أيام الدوام
  if (r.list.length) {
    p.table(
      sectionTitle('أيام الدوام', '(الصفحات: المسمّع من المطلوب)'),
      th('التاريخ', 150) + th('الحضور', 90) + th('الحفظ') + th('المراجعة') + th('العلامة', 70),
      r.list.map((s) => {
        const part = (e?: { completedPages: number; requiredPages: number; grade: number } | null) =>
          e ? `${fmt(e.completedPages)} من ${fmt(e.requiredPages)} ص <span style="color:${C.muted};font-size:12px">· جودة ${e.grade}</span>` : `<span style="color:${C.muted}">—</span>`;
        const ok = attended(s);
        const attColor = s.attendance === 'absent' ? C.burgundy : s.attendance === 'late' ? C.gold : s.attendance === 'excused' ? C.muted : C.green;
        return `<tr>${td(`${weekday(s.date)} ${formatDayMonth(s.date)}`)}${td(attendanceLabels[s.attendance], `color:${attColor};font-weight:700`)}${td(ok ? part(s.memorization) : '—')}${td(ok ? part(s.revision) : '—')}${td(ok && typeof s.score === 'number' ? `<b>${s.score}</b>` : '—')}</tr>`;
      }),
    );
  }

  // العبادات الأسبوعية
  if (r.weeks.length) {
    p.table(
      sectionTitle('جدول العبادات الأسبوعي', '(من السبت إلى الجمعة)'),
      th('الأسبوع') + th('أيام معبّأة', 110) + th('صدقة', 70) + th('الكهف', 70) + th('علامة الأسبوع', 120),
      r.weeks.map(
        (w) =>
          `<tr>${td(`يبدأ ${formatDayMonth(w.ws)}`)}${td(`${w.filled} من 7`)}${td(w.charity ? '✓' : '—', `color:${w.charity ? C.green : C.muted}`)}${td(w.kahf ? '✓' : '—', `color:${w.kahf ? C.green : C.muted}`)}${td(`<b>${fmt(w.score)}%</b>`)}</tr>`,
      ),
    );
  }

  // آخر سلوك وملاحظات المشرف
  const lastCommitment = [...r.list].reverse().find((s) => s.commitment)?.commitment;
  if (r.notes.length || lastCommitment) {
    p.add(sectionTitle('ملاحظات المشرف'));
    if (lastCommitment) p.add(`<p style="margin:0 0 8px;font-size:14px">الالتزام والسلوك في آخر دوام: <b style="color:${C.navy}">${commitmentLabels[lastCommitment]}</b></p>`);
    r.notes.slice(-8).forEach((n) => p.add(`<div style="margin-bottom:6px;padding:9px 12px;border-radius:10px;background:${C.soft};font-size:13.5px;line-height:1.8"><b style="color:${C.muted};font-size:12.5px">${formatDayMonth(n.date)}:</b> ${esc(n.text)}</div>`));
  }

  return p.pages;
}

function stamp(pages: HTMLElement[]) {
  pages.forEach((page, i) => {
    page.appendChild(
      el(
        `<div style="position:absolute;bottom:22px;left:${PAD}px;right:${PAD}px;display:flex;justify-content:space-between;font-size:11.5px;color:${C.muted};border-top:1px solid ${C.line};padding-top:8px">
          <span>${esc(supervisor.title)}: ${esc(supervisor.name)}</span>
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
          if (img.complete) return res();
          img.onload = () => res();
          img.onerror = () => {
            img.remove(); // صورة ما تحمّلت (مثلًا صورة الطالب) — نكمل التقرير بدونها
            res();
          };
        }),
    ),
  );

export function reportFileName({ kind, student, from, to }: ReportInput) {
  const name = student.name.replace(/\s+/g, '-');
  return kind === 'month' ? `تقرير-${name}-${formatMonthKey(monthKey(from)).replace(' ', '-')}.pdf` : `تقرير-${name}-${from}_${to}.pdf`;
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
