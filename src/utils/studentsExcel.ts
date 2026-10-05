/**
 * ملف Excel لبيانات الطلاب العامة — نفس الملف للتنزيل والرفع:
 * يُنزَّل معبّأ ببيانات الطلاب الحالية من الموقع، يُعدَّل أو تُضاف له صفوف طلاب جدد، ثم يُرفع.
 * الأعمدة تُعرف بالكلمات المفتاحية بعناوينها (وليس بالترتيب).
 */
import type { CellObject } from 'xlsx';
import type { Student } from '@/types';
import { LogParseError, normalizeArabic, readDate } from './recitationLog';

const loadXlsx = () => import('xlsx');

export type StudentField = 'id' | 'name' | 'shortName' | 'birthDate' | 'guardianName' | 'guardianEmail' | 'group' | 'joinedAt' | 'active' | 'notes';

/** أعمدة الملف المُنزَّل: الأسماء والمعلومات العامة والبريد. رقم الطالب عمود مخفي لمطابقة الطالب عند الرفع حتى لو تعدّل اسمه */
const HEADERS: [StudentField, string, number][] = [
  ['name', 'اسم الطالب', 28],
  ['shortName', 'الاسم المختصر', 16],
  ['birthDate', 'تاريخ الميلاد', 14],
  ['guardianName', 'اسم ولي الأمر', 24],
  ['guardianEmail', 'بريد ولي الأمر (لتسجيل الدخول)', 30],
  ['id', 'رقم الطالب في الموقع (لا تعدّله)', 18],
];

function classify(raw: string): StudentField | null {
  const h = normalizeArabic(raw);
  if (!h) return null;
  if (h.includes('رقم')) return 'id';
  if (h.includes('ولي')) return h.includes('بريد') || h.includes('ايميل') || h.includes('email') ? 'guardianEmail' : 'guardianName';
  if (h.includes('بريد') || h.includes('ايميل')) return 'guardianEmail';
  if (h.includes('مختصر')) return 'shortName';
  if (h.includes('ميلاد')) return 'birthDate';
  if (h.includes('انضمام')) return 'joinedAt';
  if (h.includes('مجموع')) return 'group';
  if (h.includes('فعال') || h.includes('نشط')) return 'active';
  if (h.includes('ملاحظ')) return 'notes';
  if (h.includes('اسم')) return 'name';
  return null;
}

/** ينزّل ملف بيانات الطلاب الحالي (أو ملف فاضي بالعناوين إذا ما في طلاب) */
export async function downloadStudentsFile(students: Student[]) {
  const X = await loadXlsx();
  const rows = [...students]
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
    .map((s) => [s.name, s.shortName, s.birthDate, s.guardianName, s.guardianEmail ?? '', s.id]);
  const sheet = X.utils.aoa_to_sheet([HEADERS.map(([, h]) => h), ...rows]);
  sheet['!cols'] = HEADERS.map(([f, , wch]) => ({ wch, hidden: f === 'id' }));
  const book = X.utils.book_new();
  X.utils.book_append_sheet(book, sheet, 'الطلاب');
  book.Workbook = { Views: [{ RTL: true }] };
  X.writeFile(book, 'بيانات-الطلاب.xlsx');
}

export type StudentRow = { row: number } & Partial<Omit<Student, 'photo'>>;

export interface ParsedStudents {
  rows: StudentRow[];
  issues: { row: number; name: string; message: string }[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function parseStudentsFile(file: File): Promise<ParsedStudents> {
  const X = await loadXlsx();
  const book = X.read(await file.arrayBuffer(), { type: 'array', cellNF: true });
  const sheet = book.Sheets[book.SheetNames[0]];
  if (!sheet?.['!ref']) throw new LogParseError('الملف فارغ.');
  const range = X.utils.decode_range(sheet['!ref']);
  const get = (r: number, c: number) => sheet[X.utils.encode_cell({ r, c })] as CellObject | undefined;
  const text = (r: number, c: number) => {
    const cell = get(r, c);
    return cell ? String(cell.w ?? cell.v ?? '').trim() : '';
  };

  // صف العناوين = أول صف فيه عمود اسم الطالب + عمود ثاني معروف على الأقل
  let headerRow = -1;
  let fields: (StudentField | null)[] = [];
  for (let r = range.s.r; r <= Math.min(range.e.r, range.s.r + 10) && headerRow < 0; r++) {
    const row: (StudentField | null)[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) row[c] = classify(text(r, c));
    if (row.includes('name') && row.filter(Boolean).length >= 2) {
      headerRow = r;
      fields = row;
    }
  }
  if (headerRow < 0) throw new LogParseError('لم أجد صف العناوين (اسم الطالب، تاريخ الميلاد، اسم ولي الأمر...). نزّل ملف بيانات الطلاب من الموقع واستخدمه.');

  const rows: StudentRow[] = [];
  const issues: ParsedStudents['issues'] = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const s: StudentRow = { row: r + 1 };
    fields.forEach((f, c) => {
      if (!f) return;
      const v = text(r, c);
      if (!v) return;
      if (f === 'birthDate' || f === 'joinedAt') {
        const d = readDate(X, get(r, c));
        if (d) s[f] = d;
        else issues.push({ row: r + 1, name: '', message: `"${v}" ليس تاريخًا صحيحًا — اكتبه بهذا الشكل: 2015-03-21 أو 21/03/2015` });
      } else if (f === 'active') s.active = !/^(لا|no|false|0|غير فعال|منسحب)$/i.test(normalizeArabic(v));
      else if (f === 'guardianEmail') {
        const email = v.toLowerCase();
        if (EMAIL.test(email)) s.guardianEmail = email;
        else issues.push({ row: r + 1, name: '', message: `بريد ولي الأمر "${v}" غير صحيح — تم تجاهله` });
      } else s[f] = v;
    });
    if (!s.name) {
      if (Object.keys(s).length > 1) issues.push({ row: r + 1, name: '', message: 'صف دون اسم الطالب — تم تجاهله' });
      continue;
    }
    rows.push(s);
  }
  issues.forEach((i) => (i.name = rows.find((s) => s.row === i.row)?.name ?? ''));
  if (!rows.length) throw new LogParseError('لم أجد أي طالب داخل الملف.');
  return { rows, issues };
}
