import { useEffect, useState } from 'react';
import { CalendarClock, Save, X } from 'lucide-react';
import type { SessionNotice } from '@/types';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import { cx, formatDate, weekday } from '@/utils/format';
import { TODAY } from '@/utils/today';

type Kind = SessionNotice['kind'] | 'normal';

const kinds: { k: Kind; label: string }[] = [
  { k: 'normal', label: 'عادي' },
  { k: 'tajweed', label: 'تجويد فقط' },
  { k: 'none', label: 'لا يوجد دوام' },
];

/**
 * تحكّم سريع بالدوام القادم لكل الطلاب: عادي (مطلوب كل طالب) / دوام تجويد فقط / لا يوجد دوام.
 * التنبيه يظهر لكل الأهل بدل تذكرة المطلوب، ويختفي تلقائيًا بعد تاريخه — مطلوبات الطلاب لا تُمس.
 */
export default function SessionNoticeControl() {
  const { activeSessionNotice: active, saveSessionNotice } = useData();
  const toast = useToast();
  const [kind, setKind] = useState<Kind>(active?.kind ?? 'normal');
  const [date, setDate] = useState(active?.date ?? '');
  const [note, setNote] = useState(active?.note ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setKind(active?.kind ?? 'normal');
    setDate(active?.date ?? '');
    setNote(active?.note ?? '');
  }, [active]);

  const save = async (next: SessionNotice | null, msg: string) => {
    setBusy(true);
    try {
      await saveSessionNotice(next);
      toast(msg);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'تعذّر الحفظ.');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (kind === 'normal') return save(null, 'رجع الدوام القادم عاديًا — يظهر للأهل مطلوب كل طالب');
    if (!date) return toast('اختر تاريخ الدوام');
    if (date < TODAY) return toast('التاريخ لازم يكون اليوم أو بعده');
    return save({ kind, date, note: note.trim() || undefined }, kind === 'tajweed' ? 'تم: الدوام القادم تجويد فقط' : 'تم: لا يوجد دوام');
  };

  const dirty = kind !== (active?.kind ?? 'normal') || (kind !== 'normal' && (date !== (active?.date ?? '') || note.trim() !== (active?.note ?? '')));

  return (
    <section className={cx('card p-4 sm:p-5', active && 'ring-1 ring-gold-300')}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex basis-[14rem] items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-600">
            <CalendarClock className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="section-title">الدوام القادم لكل الطلاب</h3>
            <p className="text-[12px] text-navy-400">يظهر للأهل بدل المطلوب، ويرجع عاديًا تلقائيًا بعد التاريخ</p>
          </div>
        </div>
        {active && (
          <span className="rounded-full bg-gold-300/30 px-3 py-1 text-[12px] font-bold text-navy-800">
            مفعّل: {active.kind === 'tajweed' ? 'تجويد فقط' : 'لا يوجد دوام'} · {weekday(active.date)} {formatDate(active.date)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="inline-flex rounded-xl bg-navy-50 p-1" role="radiogroup" aria-label="نوع الدوام القادم">
          {kinds.map(({ k, label }) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cx('rounded-lg px-3 py-1.5 text-[13px] font-bold transition', kind === k ? 'bg-navy-800 text-white shadow-soft' : 'text-navy-500 hover:text-navy-800')}
            >
              {label}
            </button>
          ))}
        </div>
        {kind !== 'normal' && (
          <>
            <label className="w-full sm:w-auto">
              <span className="field-label">التاريخ</span>
              <input type="date" min={TODAY} className="input input-sm w-full sm:w-44" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="min-w-0 flex-1 basis-[14rem]">
              <span className="field-label">ملاحظة للأهل (اختياري)</span>
              <input className="input input-sm w-full" placeholder={kind === 'tajweed' ? 'مثلًا: إحضار كتاب التجويد' : 'مثلًا: بسبب العطلة الرسمية'} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </>
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-accent px-4 py-1.5 text-[13px]" disabled={busy || !dirty} onClick={submit}>
            <Save className="h-4 w-4" /> حفظ
          </button>
          {active && (
            <button type="button" className="btn-ghost px-3 py-1.5 text-[13px]" disabled={busy} onClick={() => save(null, 'تم إلغاء التنبيه')}>
              <X className="h-4 w-4" /> إلغاء التنبيه
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
