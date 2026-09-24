import { useState, type ChangeEvent } from 'react';
import { AlertTriangle, FileSpreadsheet, Loader2, UploadCloud } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import type { Student } from '@/types';
import { parseAttendanceExcel, type ImportedRow } from '@/utils/excel';
import { completionPercent } from '@/utils/quran';
import { pct } from '@/utils/format';

const normalize = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

export interface MatchedImportRow extends ImportedRow {
  studentId: string | null; // null = لم يُحدَّد بعد أو تم تجاهله
  ignored: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  students: Student[];
  /** يُستدعى فقط بعد ضغط "اعتماد الاستيراد" — لا حفظ تلقائي بقاعدة البيانات */
  onApprove: (rows: MatchedImportRow[]) => void;
}

export default function ImportExcelModal({ open, onClose, students, onApprove }: Props) {
  const [rows, setRows] = useState<MatchedImportRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const reset = () => {
    setRows(null);
    setErr('');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const parsed = await parseAttendanceExcel(file);
      if (!parsed.length) {
        setErr('لم أجد صفوفًا فيها اسم طالب داخل الملف. تأكد إنك مستخدم القالب الصحيح.');
        return;
      }
      const byName = new Map(students.map((s) => [normalize(s.name), s]));
      setRows(
        parsed.map((r) => {
          const match = byName.get(normalize(r.studentName));
          return { ...r, studentId: match?.id ?? null, ignored: false };
        }),
      );
    } catch {
      setErr('تعذّر قراءة الملف. تأكد إنه بصيغة Excel (xlsx) صحيحة.');
    } finally {
      setBusy(false);
    }
  };

  const setRowStudent = (rowIndex: number, studentId: string) => setRows((r) => r?.map((x) => (x.rowIndex === rowIndex ? { ...x, studentId: studentId || null } : x)) ?? null);
  const toggleIgnore = (rowIndex: number) => setRows((r) => r?.map((x) => (x.rowIndex === rowIndex ? { ...x, ignored: !x.ignored } : x)) ?? null);

  const unmatchedCount = rows?.filter((r) => !r.studentId && !r.ignored).length ?? 0;
  const readyCount = rows?.filter((r) => r.studentId && !r.ignored).length ?? 0;

  const approve = () => {
    if (!rows) return;
    onApprove(rows);
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      size="xl"
      title="استيراد Excel لدوام اليوم"
      subtitle={rows ? `${readyCount} صف جاهز${unmatchedCount ? ` – ${unmatchedCount} بحاجة لتحديد الطالب` : ''}` : undefined}
      footer={
        rows && (
          <>
            <button className="btn-ghost" onClick={() => { reset(); onClose(); }}>
              إلغاء
            </button>
            <button className="btn-accent px-6" onClick={approve} disabled={readyCount === 0}>
              اعتماد الاستيراد ({readyCount})
            </button>
          </>
        )
      }
    >
      {!rows ? (
        <div className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/40 p-10 text-center text-[13px] text-navy-500 hover:bg-navy-50">
            {busy ? <Loader2 className="h-9 w-9 animate-spin text-navy-300" /> : <UploadCloud className="h-9 w-9 text-navy-300" />}
            {busy ? 'جارٍ القراءة...' : 'اختر ملف Excel (xlsx) من جهازك'}
            <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={onFile} disabled={busy} />
          </label>
          {err && (
            <p className="flex items-center gap-2 rounded-xl bg-burgundy-50 px-3 py-2 text-[13px] text-burgundy-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
            </p>
          )}
          <p className="flex items-center gap-2 text-[12px] text-navy-400">
            <FileSpreadsheet className="h-4 w-4" /> استخدم زر "تحميل قالب Excel" أولًا إذا ما عندك الملف بنفس الأعمدة المطلوبة.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {unmatchedCount > 0 && (
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> فيه أسماء ما طابقت أي طالب مسجَّل بالموقع — حدّد الطالب الصحيح يدويًا لكل صف، أو تجاهل الصف.
            </p>
          )}
          <div className="scrollbar-thin max-h-[420px] overflow-auto rounded-xl border border-navy-100">
            <table className="w-full min-w-[720px] text-[12px]">
              <thead className="sticky top-0 bg-navy-50/90 text-right text-navy-500">
                <tr>
                  <th className="px-3 py-2 font-medium">اسم الطالب بالملف</th>
                  <th className="px-3 py-2 font-medium">الطالب بالموقع</th>
                  <th className="px-3 py-2 font-medium">الحفظ (مطلوب/منجز)</th>
                  <th className="px-3 py-2 font-medium">المراجعة (مطلوب/منجز)</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rowIndex} className={r.ignored ? 'opacity-40' : !r.studentId ? 'bg-amber-50/50' : ''}>
                    <td className="px-3 py-2 font-medium text-navy-800">{r.studentName}</td>
                    <td className="px-3 py-2">
                      <Select
                        small
                        ariaLabel="تحديد الطالب"
                        value={r.studentId ?? ''}
                        onChange={(v) => setRowStudent(r.rowIndex, v)}
                        options={[{ value: '', label: '— اختر —' }, ...students.map((s) => ({ value: s.id, label: s.name }))]}
                      />
                    </td>
                    <td className="px-3 py-2 text-navy-600">
                      {r.memRequiredPages ?? 0} / {r.memCompletedPages ?? 0}{' '}
                      <span className="text-navy-400">({pct(completionPercent(r.memRequiredPages ?? 0, r.memCompletedPages ?? 0), 0)})</span>
                    </td>
                    <td className="px-3 py-2 text-navy-600">
                      {r.revRequiredPages ?? 0} / {r.revCompletedPages ?? 0}{' '}
                      <span className="text-navy-400">({pct(completionPercent(r.revRequiredPages ?? 0, r.revCompletedPages ?? 0), 0)})</span>
                    </td>
                    <td className="px-3 py-2 text-left">
                      <button type="button" className="text-[12px] font-medium text-burgundy-600 hover:underline" onClick={() => toggleIgnore(r.rowIndex)}>
                        {r.ignored ? 'إلغاء التجاهل' : 'تجاهل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-navy-400">هاي معاينة فقط — بعد "اعتماد الاستيراد" رح تنعبّى القيم بجدول الدوام وتقدر تراجعها أو تعدّلها قبل "حفظ الجميع".</p>
        </div>
      )}
    </Modal>
  );
}
