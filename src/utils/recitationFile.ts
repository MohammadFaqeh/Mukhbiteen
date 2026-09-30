/**
 * ملفات سجل التسميع اللي ينزّلها الموقع (نفس أعمدة الاستيراد، فأي ملف منها يُرفع كما هو):
 *  - ملف دوام: صف لكل طالب بتاريخ واحد، معبّأ مسبقًا (المحفوظ لهذا اليوم إن وُجد، وإلا حاضر + المطلوب اليوم).
 *  - السجل التراكمي: كل أيام الدوام المحفوظة بالموقع.
 * فيها قوائم منسدلة للحضور والالتزام، وعمود تنبيه يفحص كل صف وقت التعبئة.
 */
import type { NextRequirement, Student, SessionRecord } from '@/types';
import type ExcelJS from 'exceljs';
import { attendanceLabels, commitmentLabels } from './format';
import { parsePageRanges } from './quran';

const loadExcel = () => import('exceljs');

const NAVY = 'FF1F2A44';

const MEM = 'FFE4F2EA';
const REV = 'FFE6EEF9';

/** أعمدة الملف بالترتيب: (المفتاح، العنوان، العرض، اللون). العناوين هي اللي يتعرّف عليها الاستيراد */
const COLS = [
  ['date', 'تاريخ الدوام', 13, 'FFE8ECF3'],
  ['name', 'اسم الطالب', 24, 'FFE8ECF3'],
  ['att', 'الحضور', 11, 'FFE8ECF3'],
  ['memToday', 'المطلوب اليوم: حفظ', 18, MEM],
  ['memReq', 'الحفظ المطلوب (صفحات)', 11, MEM],
  ['memDone', 'الحفظ المسمّع (صفحات)', 11, MEM],
  ['memText', 'الصفحات المسمّعة حفظًا (أرقام: 415-416)', 20, MEM],
  ['memGrade', 'جودة الحفظ %', 10, MEM],
  ['revToday', 'المطلوب اليوم: مراجعة', 18, REV],
  ['revReq', 'المراجعة المطلوبة (صفحات)', 11, REV],
  ['revDone', 'المراجعة المسمّعة (صفحات)', 11, REV],
  ['revText', 'الصفحات المسمّعة مراجعةً (أرقام: 415-416)', 20, REV],
  ['revGrade', 'جودة المراجعة %', 10, REV],
  ['commit', 'الالتزام والسلوك بالدوام', 14, 'FFF7EFE0'],
  ['notes', 'ملاحظات (تظهر لولي الأمر)', 28, 'FFF7EFE0'],
  ['nextMem', 'المطلوب القادم: حفظ', 18, 'FFF6E6EA'],
  ['nextMemPages', 'المطلوب القادم: حفظ (صفحات) — للمشرف', 12, 'FFF6E6EA'],
  ['nextRev', 'المطلوب القادم: مراجعة', 18, 'FFF6E6EA'],
  ['nextRevPages', 'المطلوب القادم: مراجعة (صفحات) — للمشرف', 12, 'FFF6E6EA'],
  ['nextExtra', 'المطلوب القادم: مهمة إضافية', 18, 'FFF6E6EA'],
  ['check', 'تنبيه (تلقائي)', 28, 'FFEEEEEE'],
] as const;
type Key = (typeof COLS)[number][0];
const idx = (k: Key) => COLS.findIndex(([key]) => key === k) + 1;
/** حرف العمود بالمعادلات (الأعمدة أقل من 26) */
const L = Object.fromEntries(COLS.map(([k], i) => [k, String.fromCharCode(65 + i)])) as Record<Key, string>;

const GROUPS: [string, Key, Key][] = [
  ['الدوام', 'date', 'att'],
  ['الحفظ', 'memToday', 'memGrade'],
  ['المراجعة', 'revToday', 'revGrade'],
  ['السلوك والملاحظات', 'commit', 'notes'],
  ['المطلوب للدوام القادم', 'nextMem', 'nextExtra'],
  ['فحص', 'check', 'check'],
];

type Cell = string | number | Date | null;
type Row = Partial<Record<Key, Cell>>;

/** صف طالب بيوم: من سجله المحفوظ، أو (ليوم جديد) من المطلوب اليوم */
function sessionRow(s: SessionRecord | undefined, date: string, name: string, today?: { mem?: string; rev?: string; memReq?: number; revReq?: number }): Row {
  const m = s?.memorization;
  const r = s?.revision;
  const n = (v: number | undefined) => (v ? v : null);
  return {
    date: new Date(`${date}T00:00:00Z`),
    name,
    att: attendanceLabels[s?.attendance ?? 'present'],
    memToday: m?.required || today?.mem || null,
    memReq: m ? n(m.requiredPages) : n(today?.memReq),
    memDone: m ? n(m.completedPages) : null,
    memText: m?.recited || null,
    memGrade: m ? m.grade : null,
    revToday: r?.required || today?.rev || null,
    revReq: r ? n(r.requiredPages) : n(today?.revReq),
    revDone: r ? n(r.completedPages) : null,
    revText: r?.revised || null,
    revGrade: r ? r.grade : null,
    commit: s?.commitment ? commitmentLabels[s.commitment] : null,
    notes: s?.notes || null,
  };
}

async function buildAndDownload(rows: Row[], fileName: string) {
  const { default: ExcelJS } = await loadExcel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('سجل التسميع', { views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 2 }] });
  const last = rows.length + 2 + 30; // 30 صف فاضي جاهز لطالب جديد أو إضافة

  GROUPS.forEach(([title, from, to]) => {
    if (from !== to) ws.mergeCells(1, idx(from), 1, idx(to));
    const c = ws.getCell(1, idx(from));
    c.value = title;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  COLS.forEach(([, title, width, color], i) => {
    const c = ws.getCell(2, i + 1);
    c.value = title;
    c.font = { bold: true, color: { argb: NAVY } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = { bottom: { style: 'thin', color: { argb: 'FFD5DAE3' } } };
    ws.getColumn(i + 1).width = width;
  });
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 44;
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: COLS.length } };

  for (let r = 3; r <= last; r++) {
    const row = ws.getRow(r);
    Object.entries(rows[r - 3] ?? {}).forEach(([k, v]) => v !== null && v !== undefined && (row.getCell(idx(k as Key)).value = v));
    row.getCell(idx('date')).numFmt = 'yyyy-mm-dd';
    // نص: عشان Excel ما يحوّل 3-5 لتاريخ
    (['memToday', 'memText', 'revToday', 'revText', 'notes', 'nextMem', 'nextRev', 'nextExtra'] as Key[]).forEach((k) => (row.getCell(idx(k)).numFmt = '@'));
    const c = (k: Key) => `${L[k]}${r}`;
    const absent = `OR(${c('att')}="غائب",${c('att')}="غائب بعذر")`;
    const q = row.getCell(idx('check'));
    q.value = {
      formula:
        `IF(${c('name')}="","",IF(${c('date')}="","⚠ التاريخ ناقص",IF(${c('att')}="","⚠ الحضور ناقص",` +
        `IF(AND(${absent},N(${c('memDone')})+N(${c('revDone')})>0),"⚠ غائب وفيه تسميع",` +
        `IF(${absent},"غائب — باقي الصف ما بينحسب",` +
        `IF(AND(OR(N(${c('memDone')})>0,${c('memText')}<>""),${c('memGrade')}=""),"⚠ جودة الحفظ ناقصة",` +
        `IF(AND(OR(N(${c('revDone')})>0,${c('revText')}<>""),${c('revGrade')}=""),"⚠ جودة المراجعة ناقصة",` +
        `IF(COUNTIFS(${L.date}$3:${L.date}$${last},${c('date')},${L.name}$3:${L.name}$${last},${c('name')})>1,"⚠ الطالب مكرر بنفس التاريخ",` +
        `IF(AND(N(${c('memDone')})+N(${c('revDone')})=0,${c('memText')}="",${c('revText')}=""),"⚠ حاضر وما سمّع شي؟","✓")))))))))`,
    };
    q.font = { color: { argb: 'FF8A6D1F' } };
  }

  // dataValidations.add (تحقق على مدى كامل) موجودة بـ exceljs 4.4 لكن ناقصة من ملف الأنواع
  const dv = (ws as unknown as { dataValidations: { add: (range: string, v: ExcelJS.DataValidation) => void } }).dataValidations;
  const range = (col: string) => `${col}3:${col}${last}`;
  dv.add(range(L.att), { type: 'list', allowBlank: true, formulae: ['"حاضر,متأخر,غائب,غائب بعذر"'], showErrorMessage: true, errorTitle: 'قيمة غير معروفة', error: 'اختر: حاضر، متأخر، غائب، غائب بعذر' });
  dv.add(range(L.commit), { type: 'list', allowBlank: true, formulae: ['"ممتاز,جيد جدًا,جيد,يحتاج متابعة"'], showErrorMessage: true, errorTitle: 'قيمة غير معروفة', error: 'اختر: ممتاز، جيد جدًا، جيد، يحتاج متابعة' });
  for (const c of [L.memReq, L.memDone, L.revReq, L.revDone, L.nextMemPages, L.nextRevPages])
    dv.add(range(c), { type: 'decimal', operator: 'between', allowBlank: true, formulae: [0, 60], showErrorMessage: true, errorTitle: 'رقم غير صحيح', error: 'عدد الصفحات رقم بين 0 و 60. اتركه فاضي إذا ما عليه.' });
  for (const c of [L.memGrade, L.revGrade])
    dv.add(range(c), { type: 'decimal', operator: 'between', allowBlank: true, formulae: [0, 100], showErrorMessage: true, errorTitle: 'رقم غير صحيح', error: 'الجودة رقم من 0 إلى 100' });

  ws.addConditionalFormatting({
    ref: `A3:${L.check}${last}`,
    rules: [
      // الغائب: الصف رمادي — باقي الصف ما بيتحسب، ما في داعي تمسح أرقامه
      { type: 'expression', priority: 0, formulae: [`OR($${L.att}3="غائب",$${L.att}3="غائب بعذر")`], style: { font: { color: { argb: 'FFA0A7B4' } }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF1F2F5' } } } },
      { type: 'expression', priority: 1, formulae: [`LEFT($${L.check}3,1)="⚠"`], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF4D6' } } } },
      { type: 'expression', priority: 2, formulae: ['AND($A3<>"",$A3<>$A2)'], style: { border: { top: { style: 'medium', color: { argb: NAVY } } } } },
    ],
  });

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * ملف دوام يوم واحد: المحفوظ لهذا اليوم إن وُجد، وإلا حاضر + "المطلوب اليوم" = المطلوب القادم المحفوظ للطالب
 * (إذا تاريخه هذا اليوم أو قبله). عدد الصفحات المطلوبة: عدده المحفوظ، وإلا من أرقام الصفحات (417-418)، وإلا من آخر دوام.
 */
export function downloadSessionFile(date: string, students: Student[], sessions: SessionRecord[], requirements: NextRequirement[]) {
  const list = students.filter((s) => s.active || sessions.some((x) => x.id === `${s.id}-${date}`)).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const rows = list.map((st) => {
    const saved = sessions.find((x) => x.id === `${st.id}-${date}`);
    const prev = sessions.filter((x) => x.studentId === st.id && x.date < date).sort((a, b) => b.date.localeCompare(a.date));
    const lastMem = prev.find((x) => x.memorization)?.memorization?.requiredPages;
    const lastRev = prev.find((x) => x.revision)?.revision?.requiredPages;
    const req = requirements.find((x) => x.studentId === st.id && (!x.date || x.date <= date));
    return sessionRow(saved, date, st.name, {
      mem: req?.memorization,
      rev: req?.revision,
      // العدد: المكتوب بخانة "المطلوب القادم (صفحات)"، وإلا من أرقام الصفحات بالنص، وإلا من آخر دوام
      memReq: req?.memorizationPages || (req?.memorization && parsePageRanges(req.memorization)?.pages) || lastMem,
      revReq: req?.revisionPages || (req?.revision && parsePageRanges(req.revision)?.pages) || lastRev,
    });
  });
  return buildAndDownload(rows, `دوام-${date}.xlsx`);
}

/** السجل التراكمي: كل أيام الدوام المحفوظة بالموقع (من الأقدم للأحدث) */
export function downloadCumulativeFile(students: Student[], sessions: SessionRecord[]) {
  const name = new Map(students.map((s) => [s.id, s.name]));
  const rows = sessions
    .filter((s) => name.has(s.studentId))
    .sort((a, b) => a.date.localeCompare(b.date) || name.get(a.studentId)!.localeCompare(name.get(b.studentId)!, 'ar'))
    .map((s) => sessionRow(s, s.date, name.get(s.studentId)!));
  return buildAndDownload(rows, `السجل-التراكمي-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
