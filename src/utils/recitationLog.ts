/**
 * قراءة شيت "سجل التسميع" الأسبوعي — يقبل الشكلين المعتمدين:
 *  1. العريض (المدمج): صف أسماء الطلاب (خلايا مدموجة فوق أعمدة كل طالب)، تحته صف العناوين،
 *     ثم صف لكل تاريخ دوام، وعمود "تاريخ الدوام" أول الشيت، وصف "المجموع" بالآخر (يُتجاهل).
 *  2. الطويل: صف لكل طالب بكل تاريخ، بعمودي "اسم الطالب" و"تاريخ الدوام" — وهو شكل القالب الموحّد
 *     (الملف اللي ينزّله الموقع، انظر recitationFile.ts) اللي فيه كمان: الحضور، جودة الحفظ/المراجعة، الالتزام، الملاحظات، والمطلوب القادم.
 * التعرّف على الأعمدة بالكلمات المفتاحية بالعنوان (وليس بالترتيب)، فإضافة/تبديل أعمدة لا يكسر الاستيراد.
 */
import type { CellObject, WorkSheet } from 'xlsx';
import type { AttendanceStatus, CommitmentLevel } from '@/types';
import { parsePageRanges } from './quran';

const loadXlsx = () => import('xlsx');

export type LogField =
  | 'memRequired'
  | 'memText'
  | 'memCompleted'
  | 'memGrade'
  | 'revRequired'
  | 'revText'
  | 'revCompleted'
  | 'revGrade'
  | 'grade'
  | 'attendance'
  | 'commitment'
  | 'notes'
  | 'nextMem'
  | 'nextRev'
  | 'nextExtra'
  | 'memToday'
  | 'revToday';

export interface LogEntry {
  studentName: string;
  date: string; // YYYY-MM-DD
  row: number; // رقم الصف بالملف (لرسائل التنبيه)
  attendance?: AttendanceStatus;
  memRequired?: number;
  memText?: string;
  memCompleted?: number;
  memGrade?: number;
  revRequired?: number;
  revText?: string;
  revCompleted?: number;
  revGrade?: number;
  grade?: number; // جودة تسميع مشتركة للحفظ والمراجعة (عمود واحد بالشيت القديم)
  commitment?: CommitmentLevel;
  notes?: string;
  nextMem?: string;
  nextRev?: string;
  nextExtra?: string;
  memToday?: string; // المطلوب اليوم (نص) — يُحفظ وصفًا للمطلوب بسجل اليوم
  revToday?: string;
}

/** ملاحظة على صف بالملف — لا تمنع الاستيراد، لكن تُعرض قبل الحفظ */
export interface LogIssue {
  row: number;
  studentName: string;
  date: string;
  message: string;
}

export interface ParsedLog {
  format: 'wide' | 'long';
  studentNames: string[]; // بترتيب ظهورها بالملف
  dates: string[]; // مرتبة تصاعديًا
  entries: LogEntry[];
  issues: LogIssue[];
}

/** توحيد النص العربي للمقارنة: إزالة التشكيل وتوحيد الألف والتاء المربوطة والياء والمسافات */
export const normalizeArabic = (s: string) =>
  s
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();

/** تحديد نوع العمود من عنوانه */
export function classifyHeader(raw: string): LogField | null {
  const h = normalizeArabic(raw);
  if (!h) return null;
  const mem = h.includes('حفظ');
  const rev = h.includes('مراجع');
  // "المطلوب القادم: ..." يُفحص أولًا لأنه فيه كمان "مطلوب" و"حفظ"
  if (h.includes('قادم')) return h.includes('مهمه') ? 'nextExtra' : mem ? 'nextMem' : rev ? 'nextRev' : null;
  if (h.includes('اليوم')) return mem ? 'memToday' : rev ? 'revToday' : null;
  if (h.includes('جوده')) return mem ? 'memGrade' : rev ? 'revGrade' : 'grade';
  if (h.includes('حضور')) return 'attendance';
  if (h.includes('التزام')) return 'commitment';
  if (h.includes('ملاحظ')) return 'notes';
  if (!mem && !rev) return null;
  let kind: 'Required' | 'Text' | 'Completed' | null = null;
  if (h.includes('مطلوب')) kind = 'Required';
  else if (h.includes('الصفحات') && !h.includes('عدد')) kind = 'Text';
  else if (h.includes('مسمع') || h.includes('منجز')) kind = 'Completed';
  if (!kind) return null;
  return `${mem ? 'mem' : 'rev'}${kind}` as LogField;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toLatinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export type Xlsx = Awaited<ReturnType<typeof loadXlsx>>;

function isDateCell(X: Xlsx, c: CellObject) {
  return c.t === 'd' || (c.t === 'n' && !!c.z && X.SSF.is_date(c.z as string));
}

/** قيمة خلية التاريخ → YYYY-MM-DD، أو null إن لم تكن تاريخًا (مثل صف "المجموع") */
export function readDate(X: Xlsx, c: CellObject | undefined): string | null {
  if (!c || c.v === undefined || c.v === '') return null;
  if (c.t === 'd' && c.v instanceof Date) return `${c.v.getFullYear()}-${pad(c.v.getMonth() + 1)}-${pad(c.v.getDate())}`;
  if (c.t === 'n' && typeof c.v === 'number' && c.v > 20000 && c.v < 80000) {
    const p = X.SSF.parse_date_code(c.v);
    return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  }
  const s = toLatinDigits(String(c.w ?? c.v)).trim();
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // 10/10/2025
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  m = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/); // 2025-10-10
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  return null;
}

function readNumber(c: CellObject | undefined): number | undefined {
  if (!c || c.v === undefined || c.v === null || c.v === '') return undefined;
  if (typeof c.v === 'number') return c.v;
  const n = Number(toLatinDigits(String(c.v)).replace('%', '').trim());
  return Number.isFinite(n) ? n : undefined;
}

/** وصف الصفحات المسمّعة (نص حر). "0" يعني لا شيء. */
function readText(X: Xlsx, c: CellObject | undefined): string | undefined {
  if (!c || c.v === undefined || c.v === null || c.v === '') return undefined;
  // Excel أحيانًا يحوّل "27 ، 3" (أرقام أجزاء) لتاريخ تلقائيًا — نرجعه لأرقام الأجزاء
  if (isDateCell(X, c)) {
    const iso = readDate(X, c);
    if (iso) return `${+iso.slice(8, 10)} ، ${+iso.slice(5, 7)}`;
  }
  const s = String(c.w ?? c.v).trim();
  return s === '0' ? '' : s;
}

function readGrade(c: CellObject | undefined): number | undefined {
  const n = readNumber(c);
  if (n === undefined) return undefined;
  // خلية بتنسيق نسبة مئوية تُخزَّن 0..1
  return n <= 1 && typeof c?.z === 'string' && c.z.includes('%') ? Math.round(n * 100) : n;
}

const ATTENDANCE_WORDS: [string, AttendanceStatus][] = [
  ['بعذر', 'excused'],
  ['معذور', 'excused'],
  ['متاخر', 'late'],
  ['غائب', 'absent'],
  ['غياب', 'absent'],
  ['حاضر', 'present'],
];
const COMMITMENT_WORDS: [string, CommitmentLevel][] = [
  ['جيد جدا', 'very_good'],
  ['ممتاز', 'excellent'],
  ['متابعه', 'needs_work'],
  ['ضعيف', 'needs_work'],
  ['جيد', 'good'],
];
function pickWord<T>(list: [string, T][], raw: string) {
  const s = normalizeArabic(raw);
  return list.find(([w]) => s.includes(w))?.[1];
}

function cellText(sheet: WorkSheet, X: Xlsx, r: number, c: number) {
  const cell = sheet[X.utils.encode_cell({ r, c })] as CellObject | undefined;
  return cell ? String(cell.w ?? cell.v ?? '').trim() : '';
}

export class LogParseError extends Error {}

export async function parseRecitationLog(file: File): Promise<ParsedLog> {
  const X = await loadXlsx();
  const book = X.read(await file.arrayBuffer(), { type: 'array', cellNF: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet?.['!ref']) throw new LogParseError('الملف فارغ.');
  const range = X.utils.decode_range(sheet['!ref']);
  const get = (r: number, c: number) => sheet[X.utils.encode_cell({ r, c })] as CellObject | undefined;

  // صف العناوين = أول صف فيه 3 عناوين معروفة على الأقل
  let headerRow = -1;
  const fields: (LogField | null)[] = [];
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 15) && headerRow < 0; r++) {
    const row: (LogField | null)[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) row[c] = classifyHeader(cellText(sheet, X, r, c));
    if (row.filter(Boolean).length >= 3) {
      headerRow = r;
      fields.push(...row);
    }
  }
  if (headerRow < 0) throw new LogParseError('لم أجد صف العناوين (حفظ مطلوب، حفظ مسمّع، مراجعة مطلوبة...). تأكد إنه نفس شيت سجل التسميع.');

  const findCol = (rows: number[], word: string) => {
    for (let c = range.s.c; c <= range.e.c; c++) for (const r of rows) if (r >= 0 && normalizeArabic(cellText(sheet, X, r, c)).includes(word)) return c;
    return -1;
  };
  const dateCol = findCol([headerRow, headerRow - 1], 'تاريخ');
  if (dateCol < 0) throw new LogParseError('لم أجد عمود "تاريخ الدوام".');
  const nameCol = findCol([headerRow], 'اسم');

  const entries: LogEntry[] = [];
  const issues: LogIssue[] = [];

  if (nameCol >= 0) {
    // ---------- الشكل الطويل: صف لكل طالب بكل تاريخ ----------
    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const name = cellText(sheet, X, r, nameCol);
      const date = readDate(X, get(r, dateCol));
      if (!name || !date) continue;
      const e: LogEntry = { studentName: name, date, row: r + 1 };
      fields.forEach((f, c) => f && assign(X, e, f, get(r, c), issues));
      if (hasData(e)) entries.push(e);
    }
  } else {
    // ---------- الشكل العريض: كتلة أعمدة لكل طالب، واسمه بالصف فوق العناوين ----------
    const nameRow = headerRow - 1;
    if (nameRow < range.s.r) throw new LogParseError('لم أجد صف أسماء الطلاب فوق صف العناوين.');
    const names: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) names[c] = cellText(sheet, X, nameRow, c);
    // الخلايا المدموجة: قيمة الاسم موجودة فقط بأول خلية — ننشرها على كل أعمدة الدمج
    (sheet['!merges'] ?? []).forEach((m) => {
      if (m.s.r > nameRow || m.e.r < nameRow) return;
      const v = cellText(sheet, X, m.s.r, m.s.c);
      for (let c = m.s.c; c <= m.e.c; c++) if (!names[c]) names[c] = v;
    });
    // احتياط لملف بلا دمج: الاسم يسري على الأعمدة التالية حتى يظهر اسم جديد
    let last = '';
    for (let c = range.s.c; c <= range.e.c; c++) {
      if (c === dateCol) continue;
      if (names[c]) last = names[c];
      else if (fields[c]) names[c] = last;
    }

    const blocks = new Map<string, { field: LogField; col: number }[]>();
    fields.forEach((f, c) => {
      if (!f || !names[c]) return;
      if (!blocks.has(names[c])) blocks.set(names[c], []);
      blocks.get(names[c])!.push({ field: f, col: c });
    });

    for (let r = headerRow + 1; r <= range.e.r; r++) {
      const date = readDate(X, get(r, dateCol));
      if (!date) continue;
      blocks.forEach((cols, name) => {
        const e: LogEntry = { studentName: name, date, row: r + 1 };
        cols.forEach(({ field, col }) => assign(X, e, field, get(r, col), issues));
        if (hasData(e)) entries.push(e);
      });
    }
  }

  if (!entries.length) throw new LogParseError('ما لقيت أي بيانات تسميع داخل الملف.');

  // نفس الطالب بنفس التاريخ مرتين: يُعتمد الصف الأخير مع تنبيه
  const byKey = new Map<string, LogEntry>();
  entries.forEach((e) => {
    const key = `${normalizeArabic(e.studentName)}|${e.date}`;
    const before = byKey.get(key);
    if (before) issues.push({ ...where(e), message: `الطالب مكرّر بنفس التاريخ (الصف ${before.row} والصف ${e.row}) — تم اعتماد الصف ${e.row}` });
    byKey.set(key, e);
  });
  const unique = [...byKey.values()];

  // تنبيه الجودة الناقصة فقط إذا الملف فيه أعمدة جودة منفصلة (القالب الموحّد) — الشيت القديم غالبًا بلا جودة
  const gradeCols = fields.includes('memGrade') || fields.includes('revGrade');
  unique.forEach((e) => {
    // القالب الموحّد: الصفحات المسمّعة أرقام صفحات (415-416) — تتوحّد كتابتها، ومنها يُحسب عدد المسمّع إذا تُرك فاضي
    if (gradeCols)
      (['mem', 'rev'] as const).forEach((k) => {
        const text = e[`${k}Text`];
        if (!text) return;
        const label = k === 'mem' ? 'الحفظ' : 'المراجعة';
        const parsed = parsePageRanges(text);
        if (!parsed) {
          issues.push({ ...where(e), message: `صفحات ${label} المسمّعة "${text}" مش أرقام صفحات — اكتبها مثل 415-416` });
          return;
        }
        e[`${k}Text`] = parsed.text;
        const done = e[`${k}Completed`];
        if (done === undefined) e[`${k}Completed`] = parsed.pages;
        else if (done !== parsed.pages) issues.push({ ...where(e), message: `${label}: مكتوب ${done} صفحات مسمّعة لكن ${parsed.text} = ${parsed.pages} — تم اعتماد ${done}` });
      });
    const recited = (e.memCompleted ?? 0) > 0 || (e.revCompleted ?? 0) > 0;
    if ((e.attendance === 'absent' || e.attendance === 'excused') && recited) issues.push({ ...where(e), message: 'مكتوب غائب لكن فيه صفحات مسمّعة — سيُسجَّل غائبًا بدون الصفحات' });
    if (gradeCols && e.attendance !== 'absent' && e.attendance !== 'excused') {
      if ((e.memCompleted ?? 0) > 0 && e.memGrade === undefined && e.grade === undefined) issues.push({ ...where(e), message: 'سمّع حفظ بدون جودة الحفظ — ستُستخدم الجودة الافتراضية' });
      if ((e.revCompleted ?? 0) > 0 && e.revGrade === undefined && e.grade === undefined) issues.push({ ...where(e), message: 'سمّع مراجعة بدون جودة المراجعة — ستُستخدم الجودة الافتراضية' });
    }
  });

  return {
    format: nameCol >= 0 ? 'long' : 'wide',
    studentNames: [...new Set(unique.map((e) => e.studentName))],
    dates: [...new Set(unique.map((e) => e.date))].sort(),
    entries: unique,
    issues: issues.sort((a, b) => a.row - b.row),
  };
}

const where = (e: LogEntry) => ({ row: e.row, studentName: e.studentName, date: e.date });

function assign(X: Xlsx, e: LogEntry, f: LogField, c: CellObject | undefined, issues: LogIssue[]) {
  const raw = c ? String(c.w ?? c.v ?? '').trim() : '';
  switch (f) {
    case 'memText':
    case 'revText':
      e[f] = readText(X, c);
      return;
    case 'notes':
    case 'nextMem':
    case 'nextRev':
    case 'nextExtra':
    case 'memToday':
    case 'revToday':
      e[f] = raw || undefined;
      return;
    case 'attendance':
      if (!raw) return;
      e.attendance = pickWord(ATTENDANCE_WORDS, raw);
      if (!e.attendance) issues.push({ ...where(e), message: `قيمة الحضور "${raw}" غير معروفة (المسموح: حاضر، متأخر، غائب، غائب بعذر)` });
      return;
    case 'commitment':
      if (!raw) return;
      e.commitment = pickWord(COMMITMENT_WORDS, raw);
      if (!e.commitment) issues.push({ ...where(e), message: `قيمة الالتزام "${raw}" غير معروفة — تم تجاهلها` });
      return;
    case 'grade':
    case 'memGrade':
    case 'revGrade': {
      const g = readGrade(c);
      if (g === undefined && raw) issues.push({ ...where(e), message: `جودة التسميع "${raw}" مش رقم — تم تجاهلها` });
      else if (g !== undefined && (g < 0 || g > 100)) issues.push({ ...where(e), message: `جودة التسميع ${g} خارج المدى 0-100 — تم تجاهلها` });
      else e[f] = g;
      return;
    }
    default: {
      const n = readNumber(c);
      if (n === undefined && raw) issues.push({ ...where(e), message: `"${raw}" مش رقم بعمود عدد الصفحات — تم تجاهله` });
      else if (n !== undefined && n < 0) issues.push({ ...where(e), message: `عدد صفحات سالب (${n}) — تم تجاهله` });
      else e[f] = n;
    }
  }
}

/** صف الطالب فاضي تمامًا بهذا التاريخ = لم يُسجَّل له شيء (عطلة/لم يُدخل) — لا يُنشأ له دوام */
function hasData(e: LogEntry) {
  return (
    [e.attendance, e.memRequired, e.memCompleted, e.memGrade, e.revRequired, e.revCompleted, e.revGrade, e.grade, e.commitment].some((v) => v !== undefined) ||
    !!(e.memText || e.revText || e.notes || e.nextMem || e.nextRev || e.nextExtra)
  );
}
