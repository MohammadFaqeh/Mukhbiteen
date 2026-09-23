import type { ReactNode } from 'react';
import type { DailyWorship, PrayerLocation } from '@/types';
import { PRAYER_ITEMS, WEEKDAY_LABELS, dailyWorshipScore } from '@/utils/worship';
import { cx, formatDayMonth, pct } from '@/utils/format';

interface Props {
  dates: string[]; // الأيام الستة: السبت..الخميس
  days: Record<string, DailyWorship | undefined>;
  editable?: boolean;
  onChange?: (date: string, patch: Partial<DailyWorship>) => void;
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

/** جدول العبادات الأسبوعي (السبت-الخميس) – قابل للتعديل للإدارة، وللعرض فقط لولي الأمر */
export default function WorshipWeekGrid({ dates, days, editable, onChange }: Props) {
  const patch = (date: string, p: Partial<DailyWorship>) => onChange?.(date, p);

  const Row = ({ label, render }: { label: string; render: (date: string, d?: DailyWorship) => ReactNode }) => (
    <tr className="border-t border-navy-50">
      <td className="whitespace-nowrap px-3 py-2 text-[12px] font-bold text-navy-700">{label}</td>
      {dates.map((date) => (
        <td key={date} className="px-1.5 py-2 text-center">
          {render(date, days[date])}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[760px] text-[12px]">
        <thead>
          <tr>
            <th className="px-3 py-2 text-right text-[12px] font-medium text-navy-400">اليوم</th>
            {dates.map((date, i) => (
              <th key={date} className="px-1.5 py-2 text-center font-medium text-navy-500">
                <div>{WEEKDAY_LABELS[i]}</div>
                <div className="text-[10px] font-normal text-navy-300">{formatDayMonth(date)}</div>
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
                d ? <PrayerCell value={d.prayers[key]} editable={editable} onClick={() => patch(date, { prayers: { ...d.prayers, [key]: NEXT_LOC[d.prayers[key]] } })} /> : <span className="text-navy-200">—</span>
              }
            />
          ))}
          <Row label="أذكار الصباح" render={(date, d) => (d ? <BoolCell value={d.morningAdhkar} editable={editable} onClick={() => patch(date, { morningAdhkar: !d.morningAdhkar })} /> : '—')} />
          <Row label="أذكار المساء" render={(date, d) => (d ? <BoolCell value={d.eveningAdhkar} editable={editable} onClick={() => patch(date, { eveningAdhkar: !d.eveningAdhkar })} /> : '—')} />
          <Row label="أذكار النوم" render={(date, d) => (d ? <BoolCell value={d.sleepAdhkar} editable={editable} onClick={() => patch(date, { sleepAdhkar: !d.sleepAdhkar })} /> : '—')} />
          <Row
            label="صلاة الضحى (ركعات)"
            render={(date, d) => (d ? (editable ? <MiniNumber value={d.duhaRakahs} max={12} onChange={(v) => patch(date, { duhaRakahs: v })} /> : <span>{d.duhaRakahs || '—'}</span>) : '—')}
          />
          <Row label="قيام الليل" render={(date, d) => (d ? <BoolCell value={d.qiyam} editable={editable} onClick={() => patch(date, { qiyam: !d.qiyam })} /> : '—')} />
          <Row
            label="الوتر (ركعات)"
            render={(date, d) => (d ? (editable ? <MiniNumber value={d.witrRakahs} max={11} onChange={(v) => patch(date, { witrRakahs: v })} /> : <span>{d.witrRakahs || '—'}</span>) : '—')}
          />
          <Row
            label="السنن الرواتب (من 12)"
            render={(date, d) => (d ? (editable ? <MiniNumber value={d.rawatibRakahs} max={12} onChange={(v) => patch(date, { rawatibRakahs: v })} /> : <span>{d.rawatibRakahs}</span>) : '—')}
          />
          <Row
            label="رضا الوالدين %"
            render={(date, d) => (d ? (editable ? <MiniNumber value={d.parentsSatisfaction} max={100} onChange={(v) => patch(date, { parentsSatisfaction: v })} /> : <span>{d.parentsSatisfaction}%</span>) : '—')}
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
              <td key={date} className="px-1.5 py-2 text-center font-bold text-navy-900">
                {days[date] ? pct(dailyWorshipScore(days[date]!), 0) : '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
