import type { ReactNode } from 'react';
import { PencilLine, X } from 'lucide-react';
import type { DailyWorship, PrayerLocation } from '@/types';
import { PRAYER_ITEMS, WEEKDAY_LABELS, dailyWorshipScore, isFriday } from '@/utils/worship';
import { cx, formatDayMonth, pct } from '@/utils/format';

interface Props {
  dates: string[]; // أيام الأسبوع السبعة: السبت..الجمعة
  days: Record<string, DailyWorship | undefined>; // يوم غير موجود = ولي الأمر لم يعبّئه
  editable?: boolean;
  onChange?: (date: string, patch: Partial<DailyWorship>) => void;
  onFill?: (date: string) => void; // تعبئة يوم فاضي يدويًا (للمشرف)
  onClear?: (date: string) => void; // إلغاء يوم أُضيف يدويًا ولم يُحفظ بعد
  manual?: Set<string>; // أيام أضافها المشرف يدويًا ولم تُحفظ بعد
}

const LOC_STYLE: Record<PrayerLocation, string> = {
  mosque: 'border-emerald-600 bg-emerald-600 text-white',
  home: 'border-amber-400 bg-amber-400 text-white',
  missed: 'border-burgundy-200 bg-burgundy-50 text-burgundy-500',
};
const LOC_LABEL: Record<PrayerLocation, string> = { mosque: 'مسجد', home: 'بيت', missed: '—' };
const NEXT_LOC: Record<PrayerLocation, PrayerLocation> = { mosque: 'home', home: 'missed', missed: 'mosque' };

function PrayerCell({ value, editable, onClick }: { value: PrayerLocation; editable?: boolean; onClick?: () => void }) {
  const Tag = editable ? 'button' : 'div';
  return (
    <Tag
      type={editable ? 'button' : undefined}
      onClick={editable ? onClick : undefined}
      className={cx('mx-auto flex h-8 w-16 items-center justify-center rounded-lg border text-[11px] font-bold transition', LOC_STYLE[value], editable && 'cursor-pointer hover:opacity-90 active:scale-95')}
    >
      {LOC_LABEL[value]}
    </Tag>
  );
}

function BoolCell({ value, editable, onClick }: { value: boolean; editable?: boolean; onClick?: () => void }) {
  const Tag = editable ? 'button' : 'div';
  return (
    <Tag
      type={editable ? 'button' : undefined}
      onClick={editable ? onClick : undefined}
      className={cx(
        'mx-auto flex h-7 w-7 items-center justify-center rounded-lg border text-[12px] font-bold',
        value ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-navy-100 text-navy-300',
        editable && 'cursor-pointer hover:opacity-90',
      )}
    >
      {value ? '✓' : '—'}
    </Tag>
  );
}

function MiniNumber({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
      className="input input-sm mx-auto w-14 px-1 text-center"
    />
  );
}

/**
 * جدول العبادات الأسبوعي (السبت-الجمعة) – قابل للتعديل للإدارة، وللعرض فقط لولي الأمر.
 * الأيام التي لم يعبّئها ولي الأمر تظهر باهتة (رمادية)، والمشرف يقدر يعبّيها يدويًا بزر "تعبئة".
 */
export default function WorshipWeekGrid({ dates, days, editable, onChange, onFill, onClear, manual }: Props) {
  const patch = (date: string, p: Partial<DailyWorship>) => onChange?.(date, p);
  const blankCol = (date: string) => !days[date];
  const colTone = (date: string) => (blankCol(date) ? 'bg-navy-50/70 text-navy-300' : manual?.has(date) ? 'bg-amber-50/60' : '');

  const Row = ({ label, render }: { label: string; render: (date: string, d?: DailyWorship) => ReactNode }) => (
    <tr className="border-t border-navy-50">
      <td className="whitespace-nowrap px-3 py-2 text-[12px] font-bold text-navy-700">{label}</td>
      {dates.map((date) => (
        <td key={date} className={cx('px-1.5 py-2 text-center', colTone(date))}>
          {days[date] ? render(date, days[date]) : <span className="text-navy-200">·</span>}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[860px] text-[12px]">
        <thead>
          <tr>
            <th className="px-3 py-2 text-right text-[12px] font-medium text-navy-400">اليوم</th>
            {dates.map((date, i) => (
              <th key={date} className={cx('px-1.5 py-2 text-center align-top font-medium text-navy-500', colTone(date))}>
                <div>{WEEKDAY_LABELS[i]}</div>
                <div className="text-[10px] font-normal text-navy-300">{formatDayMonth(date)}</div>
                {blankCol(date) ? (
                  editable && onFill ? (
                    <button type="button" onClick={() => onFill(date)} className="mt-1 inline-flex items-center gap-1 rounded-lg border border-navy-200 bg-white px-2 py-0.5 text-[10px] font-bold text-navy-600 hover:bg-navy-50">
                      <PencilLine className="h-3 w-3" /> تعبئة
                    </button>
                  ) : (
                    <div className="mt-1 text-[10px] font-normal">لم يُعبّأ</div>
                  )
                ) : manual?.has(date) ? (
                  <button type="button" onClick={() => onClear?.(date)} className="mt-1 inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100" title="إلغاء التعبئة اليدوية">
                    يدوي <X className="h-3 w-3" />
                  </button>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PRAYER_ITEMS.map(({ key, label }) => (
            <Row
              key={key}
              label={label}
              render={(date, d) =>
                d && <PrayerCell value={d.prayers[key]} editable={editable} onClick={() => patch(date, { prayers: { ...d.prayers, [key]: NEXT_LOC[d.prayers[key]] } })} />
              }
            />
          ))}
          <Row label="أذكار الصباح" render={(date, d) => (d && <BoolCell value={d.morningAdhkar} editable={editable} onClick={() => patch(date, { morningAdhkar: !d.morningAdhkar })} />)} />
          <Row label="أذكار المساء" render={(date, d) => (d && <BoolCell value={d.eveningAdhkar} editable={editable} onClick={() => patch(date, { eveningAdhkar: !d.eveningAdhkar })} />)} />
          <Row label="أذكار النوم" render={(date, d) => (d && <BoolCell value={d.sleepAdhkar} editable={editable} onClick={() => patch(date, { sleepAdhkar: !d.sleepAdhkar })} />)} />
          <Row
            label="صلاة الضحى (ركعات)"
            render={(date, d) => (d && (editable ? <MiniNumber value={d.duhaRakahs} max={12} onChange={(v) => patch(date, { duhaRakahs: v })} /> : <span>{d.duhaRakahs || '—'}</span>))}
          />
          <Row label="قيام الليل" render={(date, d) => (d && <BoolCell value={d.qiyam} editable={editable} onClick={() => patch(date, { qiyam: !d.qiyam })} />)} />
          <Row
            label="سورة الكهف (الجمعة)"
            render={(date, d) => (d && isFriday(date) ? <BoolCell value={d.kahf} editable={editable} onClick={() => patch(date, { kahf: !d.kahf })} /> : <span className="text-navy-200">·</span>)}
          />
          <Row
            label="الوتر (ركعات)"
            render={(date, d) => (d && (editable ? <MiniNumber value={d.witrRakahs} max={11} onChange={(v) => patch(date, { witrRakahs: v })} /> : <span>{d.witrRakahs || '—'}</span>))}
          />
          <Row
            label="السنن الرواتب (من 12)"
            render={(date, d) => (d && (editable ? <MiniNumber value={d.rawatibRakahs} max={12} onChange={(v) => patch(date, { rawatibRakahs: v })} /> : <span>{d.rawatibRakahs}</span>))}
          />
          <Row
            label="رضا الوالدين %"
            render={(date, d) => (d && (editable ? <MiniNumber value={d.parentsSatisfaction} max={100} onChange={(v) => patch(date, { parentsSatisfaction: v })} /> : <span>{d.parentsSatisfaction}%</span>))}
          />
          <Row
            label="ورد القراءة (من - إلى)"
            render={(date, d) => {
              if (!d) return '—';
              if (!editable) return d.wirdFromPage != null && d.wirdToPage != null ? <span>{d.wirdFromPage} - {d.wirdToPage}</span> : '—';
              return (
                <div className="flex items-center justify-center gap-1">
                  <MiniNumber value={d.wirdFromPage ?? 0} max={999} onChange={(v) => patch(date, { wirdFromPage: v })} />
                  <span className="text-navy-300">-</span>
                  <MiniNumber value={d.wirdToPage ?? 0} max={999} onChange={(v) => patch(date, { wirdToPage: v })} />
                </div>
              );
            }}
          />
          <tr className="border-t border-navy-100 bg-navy-50/40">
            <td className="px-3 py-2 text-[12px] font-bold text-navy-800">علامة اليوم</td>
            {dates.map((date) => (
              <td key={date} className={cx('px-1.5 py-2 text-center font-bold text-navy-900', colTone(date))}>
                {days[date] ? pct(dailyWorshipScore(days[date]!), 0) : '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
