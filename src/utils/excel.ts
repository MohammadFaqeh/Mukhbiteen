import type { Student } from '@/types';

// مكتبة xlsx كبيرة نسبيًا، فنحمّلها فقط عند الحاجة الفعلية (تصدير/استيراد) بدل تحميلها مع كل صفحة
const loadXlsx = () => import('xlsx');

/** أعمدة قالب استيراد/تصدير دوام يوم واحد لكل الطلاب، بنفس تسمية شيت "تسجيل التسميع" المعتمد */
export const TEMPLATE_HEADERS = [
  'اسم الطالب',
  'عدد صفحات الحفظ المطلوبة',
  'عدد صفحات الحفظ المسمّعة',
  'الصفحات المسمّعة حفظًا (وصف)',
  'علامة الحفظ',
  'عدد صفحات المراجعة المطلوبة',
  'عدد صفحات المراجعة المسمّعة',
  'الصفحات المسمّعة مراجعة (وصف)',
  'علامة المراجعة',
  'ملاحظات',
] as const;

export interface ImportedRow {
  rowIndex: number; // رقم الصف بالملف (للعرض بالمعاينة فقط)
  studentName: string;
  memRequiredPages?: number;
  memCompletedPages?: number;
  memRecited?: string;
  memGrade?: number;
  revRequiredPages?: number;
  revCompletedPages?: number;
  revRevised?: string;
  revGrade?: number;
  notes?: string;
}

/** يولّد ملف Excel فاضٍ (أو معبَّأ بأسماء الطلاب) بنفس أعمدة القالب المعتمد، ويبدأ تحميله مباشرة */
export async function downloadAttendanceTemplate(students: Student[]) {
  const XLSX = await loadXlsx();
  const rows = students.filter((s) => s.active).map((s) => ({ [TEMPLATE_HEADERS[0]]: s.name }));
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}], { header: [...TEMPLATE_HEADERS] });
  sheet['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'الدوام');
  XLSX.writeFile(book, 'قالب-تسجيل-الدوام.xlsx');
}

const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const str = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s || undefined;
};

/** يقرأ ملف Excel مرفوع ويحوّله لصفوف خام حسب أعمدة القالب، بدون أي مطابقة أو حفظ بعد */
export async function parseAttendanceExcel(file: File): Promise<ImportedRow[]> {
  const XLSX = await loadXlsx();
  const buf = await file.arrayBuffer();
  const book = XLSX.read(buf, { type: 'array' });
  const sheet = book.Sheets[book.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return raw
    .map((r, i) => ({
      rowIndex: i + 2, // +2: صف العناوين + الفهرسة من 1
      studentName: str(r[TEMPLATE_HEADERS[0]]) ?? '',
      memRequiredPages: num(r[TEMPLATE_HEADERS[1]]),
      memCompletedPages: num(r[TEMPLATE_HEADERS[2]]),
      memRecited: str(r[TEMPLATE_HEADERS[3]]),
      memGrade: num(r[TEMPLATE_HEADERS[4]]),
      revRequiredPages: num(r[TEMPLATE_HEADERS[5]]),
      revCompletedPages: num(r[TEMPLATE_HEADERS[6]]),
      revRevised: str(r[TEMPLATE_HEADERS[7]]),
      revGrade: num(r[TEMPLATE_HEADERS[8]]),
      notes: str(r[TEMPLATE_HEADERS[9]]),
    }))
    .filter((r) => r.studentName);
}
