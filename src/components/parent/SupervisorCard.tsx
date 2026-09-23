import { supervisor } from '@/data/project';

export default function SupervisorCard() {
  return (
    <section className="card flex items-center gap-4 overflow-hidden p-4">
      <img src={supervisor.photo} alt={supervisor.name} className="h-16 w-16 shrink-0 rounded-2xl bg-navy-900 object-cover object-[50%_20%]" />
      <div>
        <p className="text-[12px] text-navy-400">{supervisor.title}</p>
        <p className="text-[16px] font-bold text-navy-900">{supervisor.name}</p>
        <p className="text-[12px] text-navy-500">للاستفسار عن مستوى الطالب تواصلوا مع المشرف مباشرة.</p>
      </div>
    </section>
  );
}
