/**
 * ملفات سجل التسميع اللي ينزّلها الموقع (نفس أعمدة الاستيراد، فأي ملف منها يُرفع كما هو):
 *  - ملف دوام: صف لكل طالب بتاريخ واحد، معبّأ مسبقًا (المحفوظ لهذا اليوم إن وُجد، وإلا حاضر + مطلوب آخر دوام).
 *  - السجل التراكمي: كل أيام الدوام المحفوظة بالموقع.
 * فيها قوائم منسدلة للحضور والالتزام، وعمود تنبيه يفحص كل صف وقت التعبئة.
 */
import type { Student, SessionRecord } from '@/types';
import type ExcelJS from 'exceljs';
import { attendanceLabels, commitmentLabels } from './format';

const loadExcel = () => import('exceljs');

const NAVY = 'FF1F2A44';

/** (العنوان، العرض، لون المجموعة) — العناوين هي اللي يتعرّف عليها الاستيراد، لا تتغيّر */
const COLS: [string, number, string][] = [
  ['تاريخ الدوام', 13, 'FFE8ECF3'],
  ['اسم الطالب', 24, 'FFE8ECF3'],
  ['الحضور', 11, 'FFE8ECF3'],
  ['الحفظ المطلوب (صفحات)', 11, 'FFE4F2EA'],
  ['الحفظ المسمّع (صفحات)', 11, 'FFE4F2EA'],
  ['الصفحات المسمّعة حفظًا (أرقام: 415-416)', 20, 'FFE4F2EA'],
  ['جودة الحفظ %', 10, 'FFE4F2EA'],
  ['المراجعة المطلوبة (صفحات)', 11, 'FFE6EEF9'],
  ['المراجعة المسمّعة (صفحات)', 11, 'FFE6EEF9'],
  ['الصفحات المسمّعة مراجعةً (أرقام: 415-416)', 20, 'FFE6EEF9'],
  ['جودة المراجعة %', 10, 'FFE6EEF9'],
  ['الالتزام والسلوك بالدوام', 14, 'FFF7EFE0'],
  ['ملاحظات (تظهر لولي الأمر)', 28, 'FFF7EFE0'],
  ['المطلوب القادم: حفظ', 18, 'FFF6E6EA'],
  ['المطلوب القادم: مراجعة', 18, 'FFF6E6EA'],
  ['المطلوب القادم: مهمة إضافية', 18, 'FFF6E6EA'],
  ['تنبيه (تلقائي)', 28, 'FFEEEEEE'],
];
const GROUPS: [string, number, number][] = [
  ['الدوام', 1, 3],
  ['الحفظ', 4, 7],
  ['المراجعة', 8, 11],
  ['السلوك والملاحظات', 12, 13],
  ['المطلوب للدوام القادم', 14, 16],
  ['فحص', 17, 17],
];

type Cell = string | number | Date | null;

function sessionRow(s: SessionRecord | undefined, date: string, name: string, fallback?: { memReq?: number; revReq?: number }): Cell[] {
  const m = s?.memorization;
  const r = s?.revision;
  const n = (v: number | undefined) => (v ? v : null);
  return [
    new Date(`${date}T00:00:00Z`),
    name,
    attendanceLabels[s?.attendance ?? 'present'],
    m ? n(m.requiredPages) : n(fallback?.memReq),
    m ? n(m.completedPages) : null,
    m?.recited || null,
    m ? m.grade : null,
    r ? n(r.requiredPages) : n(fallback?.revReq),
    r ? n(r.completedPages) : null,
    r?.revised || null,
    r ? r.grade : null,
    s?.commitment ? commitmentLabels[s.commitment] : null,
    s?.notes || null,
    null,
    null,
    null,
  ];
}

async function buildAndDownload(rows: Cell[][], fileName: string) {
  const { default: ExcelJS } = await loadExcel();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('سجل التسميع', { views: [{ rightToLeft: true, state: 'frozen', xSplit: 2, ySplit: 2 }] });
  const last = rows.length + 2 + 30; // 30 صف فاضي جاهز لطالب جديد أو إضافة

  GROUPS.forEach(([title, a, b]) => {
    ws.mergeCells(1, a, 1, b);
    const c = ws.getCell(1, a);
    c.value = title;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  COLS.forEach(([title, width, color], i) => {
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
    (rows[r - 3] ?? []).forEach((v, i) => v !== null && (row.getCell(i + 1).value = v));
    row.getCell(1).numFmt = 'yyyy-mm-dd';
    [6, 10, 13, 14, 15, 16].forEach((c) => (row.getCell(c).numFmt = '@')); // نص: عشان Excel ما يحوّل 3-5 لتاريخ
    const q = row.getCell(17);
    q.value = {
      formula:
        `IF(B${r}="","",IF(A${r}="","⚠ التاريخ ناقص",IF(C${r}="","⚠ الحضور ناقص",` +
        `IF(AND(OR(C${r}="غائب",C${r}="غائب بعذر"),N(E${r})+N(I${r})>0),"⚠ غائب وفيه تسميع",` +
        `IF(AND(OR(N(E${r})>0,F${r}<>""),G${r}=""),"⚠ جودة الحفظ ناقصة",` +
        `IF(AND(OR(N(I${r})>0,J${r}<>""),K${r}=""),"⚠ جودة المراجعة ناقصة",` +
        `IF(OR(C${r}="غائب",C${r}="غائب بعذر"),"غائب — باقي الصف ما بينحسب",` +
        `IF(COUNTIFS(A$3:A$${last},A${r},B$3:B$${last},B${r})>1,"⚠ الطالب مكرر بنفس التاريخ",` +
        `IF(AND(OR(C${r}="حاضر",C${r}="متأخر"),N(E${r})+N(I${r})=0,F${r}="",J${r}=""),"⚠ حاضر وما سمّع شي؟","✓")))))))))`,
    };
    q.font = { color: { argb: 'FF8A6D1F' } };
  }

  // dataValidations.add (تحقق على مدى كامل) موجودة بـ exceljs 4.4 لكن ناقصة من ملف الأنواع
  const dv = (ws as unknown as { dataValidations: { add: (range: string, v: ExcelJS.DataValidation) => void } }).dataValidations;
  const range = (col: string) => `${col}3:${col}${last}`;
  dv.add(range('C'), { type: 'list', allowBlank: true, formulae: ['"حاضر,متأخر,غائب,غائب بعذر"'], showErrorMessage: true, errorTitle: 'قيمة غير معروفة', error: 'اختر: حاضر، متأخر، غائب، غائب بعذر' });
  dv.add(range('L'), { type: 'list', allowBlank: true, formulae: ['"ممتاز,جيد جدًا,جيد,يحتاج متابعة"'], showErrorMessage: true, errorTitle: 'قيمة غير معروفة', error: 'اختر: ممتاز، جيد جدًا، جيد، يحتاج متابعة' });
  for (const c of ['D', 'E', 'H', 'I'])
    dv.add(range(c), { type: 'decimal', operator: 'between', allowBlank: true, formulae: [0, 60], showErrorMessage: true, errorTitle: 'رقم غير صحيح', error: 'عدد الصفحات رقم بين 0 و 60. اتركه فاضي إذا ما عليه.' });
  for (const c of ['G', 'K'])
    dv.add(range(c), { type: 'decimal', operator: 'between', allowBlank: true, formulae: [0, 100], showErrorMessage: true, errorTitle: 'رقم غير صحيح', error: 'الجودة رقم من 0 إلى 100' });

  ws.addConditionalFormatting({
    ref: `A3:Q${last}`,
    rules: [
      // الغائب: الصف رمادي — باقي الصف ما بيتحسب، ما في داعي تمسح أرقامه
      { type: 'expression', priority: 0, formulae: ['OR($C3="غائب",$C3="غائب بعذر")'], style: { font: { color: { argb: 'FFA0A7B4' } }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF1F2F5' } } } },
      { type: 'expression', priority: 1, formulae: ['LEFT($Q3,1)="⚠"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF4D6' } } } },
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

/** ملف دوام يوم واحد: المحفوظ لهذا اليوم إن وُجد، وإلا حاضر ومطلوب الصفحات من آخر دوام للطالب */
export function downloadSessionFile(date: string, students: Student[], sessions: SessionRecord[]) {
  const list = students.filter((s) => s.active || sessions.some((x) => x.id === `${s.id}-${date}`)).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const rows = list.map((st) => {
    const saved = sessions.find((x) => x.id === `${st.id}-${date}`);
    const prev = sessions.filter((x) => x.studentId === st.id && x.date < date).sort((a, b) => b.date.localeCompare(a.date));
    const lastMem = prev.find((x) => x.memorization)?.memorization?.requiredPages;
    const lastRev = prev.find((x) => x.revision)?.revision?.requiredPages;
    return sessionRow(saved, date, st.name, saved ? undefined : { memReq: lastMem, revReq: lastRev });
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
