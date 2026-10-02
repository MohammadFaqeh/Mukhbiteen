import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Images } from 'lucide-react';
import type { Activity } from '@/types';
import { cx, formatDate } from '@/utils/format';

interface Slide {
  key: string;
  url: string;
  title: string;
  description: string;
  date: string;
}

/**
 * كل صورة بالمنشور شريحة مستقلة. العنوان الرئيسي والوصف يظهران على أول صورة بالمنشور فقط،
 * وباقي الصور تظهر بعنوانها الخاص إن وُجد، أو بدون أي نص فوقها.
 */
function toSlides(items: Activity[]): Slide[] {
  return items.flatMap((a) =>
    (a.images.length ? a.images : [{ url: a.image }]).map((im, k) => ({
      key: `${a.id}-${k}`,
      url: im.url,
      title: (im.caption?.trim() || (k === 0 ? a.title : '')) ?? '',
      description: k === 0 ? a.description : '',
      date: a.date,
    })),
  );
}

export default function Slideshow({ items: posts, className }: { items: Activity[]; className?: string }) {
  const items = useMemo(() => toSlides(posts), [posts]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = items.length;

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n, paused]);
  useEffect(() => setI(0), [n]);

  if (!n)
    return (
      <div className={cx('card flex flex-col items-center justify-center gap-2 p-8 text-center text-navy-400', className)}>
        <Images className="h-8 w-8" />
        لا توجد صور منشورة حاليًا.
      </div>
    );

  const go = (d: number) => setI((x) => (x + d + n) % n);
  return (
    <section
      className={cx('group relative overflow-hidden rounded-2xl bg-navy-900 shadow-lift', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="صور من أنشطة ودوام المجموعة"
    >
      {items.map((a, k) => (
        <img
          key={a.key}
          src={a.url}
          alt={a.title || 'صورة من أنشطة المجموعة'}
          className={cx('absolute inset-0 h-full w-full object-cover transition-all duration-[900ms]', k === i ? 'scale-100 opacity-100' : 'scale-105 opacity-0')}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-transparent" />
      <div className="relative flex h-full flex-col justify-end p-5 text-white sm:p-8">
        <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] backdrop-blur">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDate(items[i].date)}
        </span>
        {items[i].title && (
          <h3 key={items[i].key} className="animate-fade-in text-[19px] font-bold sm:text-[26px] lg:text-[30px]">
            {items[i].title}
          </h3>
        )}
        {items[i].description && <p className="mt-1 line-clamp-2 max-w-3xl text-[13px] text-white/80 sm:text-[15px]">{items[i].description}</p>}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex max-w-[70%] flex-wrap gap-1.5">
            {items.map((a, k) => (
              <button key={a.key} onClick={() => setI(k)} aria-label={`الصورة ${k + 1}`} className={cx('h-1.5 rounded-full transition-all', k === i ? 'w-6 bg-gold-300' : 'w-1.5 bg-white/40 hover:bg-white/70')} />
            ))}
          </div>
          {n > 1 && (
            <div className="flex gap-1.5">
              <button onClick={() => go(-1)} className="rounded-full bg-white/15 p-1.5 backdrop-blur transition hover:bg-white/25" aria-label="السابق">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={() => go(1)} className="rounded-full bg-white/15 p-1.5 backdrop-blur transition hover:bg-white/25" aria-label="التالي">
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
