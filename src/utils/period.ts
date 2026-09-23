import type { SessionRecord } from '@/types';
import { TODAY } from './today';

export interface Period {
  key: string;
  label: string;
  from: string;
  to: string;
}

function addMonths(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 10);
}

function firstDayOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** خيارات جاهزة لاختيار فترة زمنية (تُستخدم بالتقارير ولوحة الشرف) */
export function periodPresets(sessions: SessionRecord[]): Period[] {
  const earliest = sessions.length ? [...sessions].sort((a, b) => a.date.localeCompare(b.date))[0].date : TODAY;
  return [
    { key: 'month', label: 'هذا الشهر', from: firstDayOfMonth(TODAY), to: TODAY },
    { key: 'last3', label: 'آخر 3 أشهر', from: addMonths(TODAY, -3), to: TODAY },
    { key: 'term', label: 'الفصل كامل', from: earliest, to: TODAY },
  ];
}
