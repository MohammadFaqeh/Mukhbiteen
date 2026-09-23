import { Award, Medal, Trophy } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import Avatar from '@/components/ui/Avatar';
import { cx, formatDate, pct } from '@/utils/format';

const PODIUM_TONE = [
  { bg: 'from-gold-400/25 to-white', ring: 'ring-gold-400', icon: 'text-gold-600', Icon: Trophy },
  { bg: 'from-navy-100 to-white', ring: 'ring-navy-300', icon: 'text-navy-500', Icon: Medal },
  { bg: 'from-burgundy-100 to-white', ring: 'ring-burgundy-300', icon: 'text-burgundy-500', Icon: Award },
];

/** لوحة الشرف — تظهر لكل أولياء الأمور معًا عند نشرها من الإدارة فقط، مع إبراز مركز ابن ولي الأمر تحديدًا */
export default function HonorBoardCard() {
  const { honorBoards } = useData();
  const { user } = useAuth();
  const board = honorBoards.find((h) => h.published);
  if (!board) return null;

  const mine = board.entries.find((e) => e.studentId === user?.studentId);

  return (
    <section className="card p-5">
      <header className="mb-4 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/20 text-gold-600">
          <Trophy className="h-[18px] w-[18px]" />
        </span>
        <div>
          <h3 className="section-title">{board.title}</h3>
          <p className="text-[12px] text-navy-400">
            {formatDate(board.periodFrom)} – {formatDate(board.periodTo)}
          </p>
        </div>
      </header>

      {mine && (
        <div className="mb-4 rounded-xl bg-emerald-50/70 p-3 text-center text-[13px] text-navy-700">
          حصل ابنك على <b className="text-navy-900">المركز {mine.rank}</b> من أصل {board.entries.length} طالبًا، بمعدل <b className="text-navy-900">{pct(mine.average)}</b>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {board.entries.slice(0, 3).map((e, i) => {
          const tone = PODIUM_TONE[i];
          const isMine = e.studentId === user?.studentId;
          return (
            <div key={e.studentId} className={cx('flex flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-b p-4 text-center ring-2', tone.bg, tone.ring, isMine && 'outline outline-2 outline-offset-2 outline-emerald-500')}>
              <tone.Icon className={cx('h-5 w-5', tone.icon)} />
              <Avatar name={e.name} src={e.photo} size={56} />
              <p className="text-[13px] font-extrabold text-navy-900">{e.name}</p>
              <p className="text-[11px] text-navy-500">المركز {e.rank}</p>
              <p className="text-[17px] font-extrabold text-navy-900">{pct(e.average)}</p>
            </div>
          );
        })}
      </div>

      {board.entries.length > 3 && (
        <ul className="mt-3 divide-y divide-navy-50 rounded-xl border border-navy-50">
          {board.entries.slice(3).map((e) => (
            <li key={e.studentId} className={cx('flex items-center gap-3 px-4 py-2', e.studentId === user?.studentId && 'bg-emerald-50/60')}>
              <span className="w-6 text-center text-[12px] font-bold text-navy-400">{e.rank}</span>
              <Avatar name={e.name} src={e.photo} size={26} />
              <span className="flex-1 text-[13px] font-medium text-navy-800">{e.name}</span>
              <b className="text-[12px] text-navy-700">{pct(e.average)}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
