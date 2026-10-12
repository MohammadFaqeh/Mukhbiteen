import { useState } from 'react';
import { CheckCircle2, Hourglass, Loader2, Plus, Trash2 } from 'lucide-react';
import type { Assignment, AssignmentProgress, AssignmentStoredStatus } from '@/types';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Toggle from '@/components/ui/Toggle';
import AssignmentProgressView, { AssignmentStatusBadge } from '@/components/shared/AssignmentProgressView';
import { Field } from './fields';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { useConfirmDelete } from '@/hooks/useConfirmDelete';
import { amountLabel, assignmentProgress, requiredText, statusLabels, unitLabels } from '@/utils/assignments';
import { TODAY } from '@/utils/today';
import { formatDate } from '@/utils/format';

const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const num = (v: string) => (v === '' ? undefined : Math.max(0, Number(v)));

/** نافذة تسجيل إنجاز/تسميع طالب على مطلوب + سجل ما سُجّل سابقًا (مع الحذف) */
function ProgressModal({ a, studentId, studentName, onClose }: { a: Assignment; studentId: string; studentName: string; onClose: () => void }) {
  const { addAssignmentProgress, deleteAssignmentProgress } = useData();
  const toast = useToast();
  const confirmDelete = useConfirmDelete();
  const p = assignmentProgress(a, studentId, TODAY);
  const next = p.remainingRanges[0];
  const [date, setDate] = useState(TODAY);
  const [from, setFrom] = useState<number | undefined>(next?.[0]);
  const [to, setTo] = useState<number | undefined>(next?.[1]);
  const [amount, setAmount] = useState<number | undefined>();
  const [approved, setApproved] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const history = a.progress.filter((x) => x.studentId === studentId);
  const unit = a.unit ? unitLabels[a.unit].many : '';

  const save = async () => {
    const entry: AssignmentProgress = { id: newId(), assignmentId: a.id, studentId, date, approved, note: note.trim() || undefined };
    if (p.measure === 'range') {
      if (from === undefined || from < a.rangeFrom! || (to ?? from) > a.rangeTo! || (to ?? from) < from) return toast(`حدد نطاقًا ضمن المطلوب (${a.rangeFrom}–${a.rangeTo}).`);
      entry.rangeFrom = from;
      entry.rangeTo = to ?? from;
    } else if (!amount) return toast('حدد المقدار المنجز.');
    else entry.amount = amount;
    setSaving(true);
    try {
      await addAssignmentProgress(entry);
      toast(approved ? 'تم تسجيل الإنجاز المعتمد' : 'تم تسجيل التسميع (غير معتمد بعد)');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'تعذّر الحفظ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`تسجيل إنجاز: ${a.title}`} subtitle={`${studentName} — المطلوب ${requiredText(a)}`}>
      <div className="space-y-4">
        <AssignmentProgressView a={a} p={p} compact />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="التاريخ">
            <input type="date" className="input" value={date} max={TODAY} onChange={(e) => setDate(e.target.value || TODAY)} />
          </Field>
          {p.measure === 'range' ? (
            <>
              <Field label={`من (${unit})`}>
                <input type="number" className="input text-center" min={a.rangeFrom} max={a.rangeTo} value={from ?? ''} onChange={(e) => setFrom(num(e.target.value))} />
              </Field>
              <Field label="إلى">
                <input type="number" className="input text-center" min={a.rangeFrom} max={a.rangeTo} value={to ?? ''} onChange={(e) => setTo(num(e.target.value))} />
              </Field>
            </>
          ) : (
            <Field label={`المقدار المنجز (${unit})`}>
              <input type="number" className="input text-center" min={1} value={amount ?? ''} onChange={(e) => setAmount(num(e.target.value))} />
            </Field>
          )}
        </div>
        <Toggle checked={approved} onChange={setApproved} label="التسميع معتمد" description="غير المعتمد يظهر لولي الأمر (سُمّع ولم يُعتمد) ولا يدخل في نسبة الإنجاز" />
        <Field label="ملاحظة (اختياري)">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <button className="btn-accent px-6" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            تسجيل
          </button>
        </div>

        {history.length > 0 && (
          <div>
            <p className="mb-2 text-[13px] font-bold text-navy-700">ما سُجّل سابقًا</p>
            <ul className="space-y-1.5">
              {history.map((h) => (
                <li key={h.id} className="flex items-center gap-2 rounded-xl bg-navy-50/60 px-3 py-2 text-[13px]">
                  {h.approved ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Hourglass className="h-4 w-4 shrink-0 text-amber-600" />}
                  <span className="text-navy-500">{formatDate(h.date)}</span>
                  <span className="flex-1 font-medium text-navy-800">
                    {h.rangeFrom !== undefined ? `${unit} ${h.rangeFrom}${h.rangeTo !== h.rangeFrom ? `–${h.rangeTo}` : ''}` : amountLabel(h.amount ?? 0, a.unit)}
                    {!h.approved && <span className="mr-1.5 text-[11px] text-amber-700">(غير معتمد)</span>}
                    {h.note && <span className="block text-[11px] text-navy-400">{h.note}</span>}
                  </span>
                  <button
                    className="rounded-lg p-1.5 text-navy-300 hover:bg-burgundy-50 hover:text-burgundy-600"
                    aria-label="حذف"
                    onClick={() => confirmDelete('حذف هذا التسجيل؟ ستُعاد حساب نسبة الإنجاز.', () => deleteAssignmentProgress(h), 'تم الحذف')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** صف طالب داخل مطلوب: إنجازه + زر تسجيل الإنجاز (أو اختيار الحالة للمطلوب بلا مقدار) */
export function AssignmentStudentRow({ a, studentId, studentName, photo, showName = true }: { a: Assignment; studentId: string; studentName: string; photo?: string; showName?: boolean }) {
  const { setAssignmentStatus } = useData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const p = assignmentProgress(a, studentId, TODAY);
  return (
    <div className="rounded-2xl border border-navy-100/70 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {showName && (
          <>
            <Avatar name={studentName} src={photo} size={28} />
            <span className="text-[13px] font-bold text-navy-800">{studentName}</span>
          </>
        )}
        <AssignmentStatusBadge status={p.status} />
        <span className="flex-1" />
        {p.measure === 'none' ? (
          <select
            className="input input-sm w-36"
            aria-label="حالة المطلوب"
            value={p.stored}
            onChange={async (e) => {
              try {
                await setAssignmentStatus(a.id, studentId, e.target.value as AssignmentStoredStatus);
              } catch (err) {
                toast(err instanceof Error ? err.message : 'تعذّر الحفظ.');
              }
            }}
          >
            {(['not_started', 'in_progress', 'completed'] as const).map((k) => (
              <option key={k} value={k}>
                {statusLabels[k]}
              </option>
            ))}
          </select>
        ) : (
          <button className="btn-soft px-3 py-1.5 text-[12px]" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> تسجيل إنجاز
          </button>
        )}
      </div>
      <AssignmentProgressView a={a} p={p} compact />
      {open && <ProgressModal a={a} studentId={studentId} studentName={studentName} onClose={() => setOpen(false)} />}
    </div>
  );
}
