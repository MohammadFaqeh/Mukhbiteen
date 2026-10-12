import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BookOpenText,
  CalendarCheck2,
  CalendarClock,
  ChartNoAxesCombined,
  FileText,
  HandHeart,
  Info,
  Minus,
  Plus,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { cx } from '@/utils/format';

const features = [
  {
    icon: ChartNoAxesCombined,
    title: 'متابعة مستوى الطالب',
    details: 'تعرض الصفحة الرئيسية ملخصًا لمستوى الطالب، وآخر علامات الحفظ والمراجعة، والحضور، والتنبيهات المهمة؛ لتعرفوا كيف يسير تقدمه من مكان واحد.',
    to: '/parent',
    linkLabel: 'العودة إلى الرئيسية',
  },
  {
    icon: BookOpenText,
    title: 'الحفظ والمراجعة',
    details: 'تجدون سجلات الحفظ والمراجعة حسب الأيام، مع مقدار المطلوب والمنجز المعتمد. وتُعرض علامة جودة التسميع بشكل منفصل عن نسبة الإنجاز.',
    to: '/parent/quran',
    linkLabel: 'عرض الحفظ والمراجعة',
  },
  {
    icon: CalendarCheck2,
    title: 'الدوام والتسميع',
    details: 'يوضح سجل الدوام أيام الحضور والغياب، وتفاصيل التسميع. كما يبيّن إن كان التسميع معتمدًا أو ما زال بانتظار الاعتماد.',
    to: '/parent/sessions',
    linkLabel: 'فتح سجل الدوام',
  },
  {
    icon: CalendarClock,
    title: 'المطلوب عند الكل',
    details: 'تظهر المطلوبات التي اختارت الإدارة إتاحتها لولي الأمر، مع وصفها ومقدارها وموعدها وحالة الإنجاز، إن كانت هذه التفاصيل محددة.',
    to: '/parent/next',
    linkLabel: 'عرض المطلوب عند الكل',
  },
  {
    icon: HandHeart,
    title: 'متابعة العبادات',
    details: 'يمكن لولي الأمر تعبئة جدول العبادات اليومي ومراجعة السجلات السابقة، كما تظهر ملخصات العلامة الأسبوعية والشهرية.',
    to: '/parent/worship',
    linkLabel: 'فتح جدول العبادات',
  },
  {
    icon: ScrollText,
    title: 'التجويد والأنشطة',
    details: 'تعرض صفحة التجويد الدورات والفصول والمواد المتاحة للطالب، وتظهر أنشطة المشروع وصوره في الصفحة الرئيسية.',
    to: '/parent/tajweed',
    linkLabel: 'عرض صفحة التجويد',
  },
  {
    icon: Bell,
    title: 'الإشعارات والتقارير',
    details: 'يعرض الجرس الإشعارات المرسلة لولي الأمر، وتجمع صفحة التقارير ملخصًا عن أداء الطالب خلال الفترة المتاحة.',
    to: '/parent/reports',
    linkLabel: 'عرض التقارير',
  },
];

export default function ParentAbout() {
  const [openFeature, setOpenFeature] = useState<number | null>(null);

  return (
    <div className="space-y-3 sm:space-y-5">
      <PageHeader title="عن الموقع" subtitle="تعرفوا على الخدمات التي تساعدكم في متابعة رحلة ابنكم القرآنية." />

      <section className="card overflow-hidden">
        <div className="flex items-start gap-3 bg-gradient-to-l from-navy-50/80 via-white to-sand-50/70 p-4 sm:gap-4 sm:p-7">
          <span className="rounded-xl bg-white p-2.5 text-navy-700 shadow-soft sm:rounded-2xl sm:p-3">
            <Info className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <div>
            <h2 className="text-[16px] font-extrabold text-navy-900 sm:text-[18px]">متابعة متكاملة، بصورة واضحة</h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-6 text-navy-600 sm:text-[14px] sm:leading-7">
              يجمع الموقع معلومات الحفظ والدوام والعبادات والمطلوبات في مكان واحد، لتبقوا على اطلاع على تقدم ابنكم وتتواصلوا مع رحلته التعليمية بسهولة.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-navy-500 sm:mt-3 sm:px-3 sm:py-1.5 sm:text-[12px]">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-700 sm:h-4 sm:w-4" />
              المعلومات المعروضة تخص الطالب المرتبط بحساب ولي الأمر
            </p>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-navy-100/70 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="section-title">ماذا يقدم الموقع؟</h2>
        </div>
        <div className="divide-y divide-navy-100/70">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isOpen = openFeature === index;
            return (
              <article key={feature.title}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3.5 py-3 text-right transition hover:bg-navy-50/50 sm:gap-3 sm:px-6 sm:py-4"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFeature(isOpen ? null : index)}
                >
                  <span className="rounded-lg bg-navy-50 p-2 text-navy-700 sm:rounded-xl sm:p-2.5">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-extrabold text-navy-900 sm:text-[14px]">{feature.title}</span>
                  </span>
                  <span className="text-navy-400">
                    {isOpen ? <Minus className="h-4 w-4 sm:h-5 sm:w-5" /> : <Plus className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </span>
                </button>
                {isOpen && (
                  <div className={cx('animate-fade-in bg-paper/60 px-5 pb-5 pt-1 sm:pr-[4.75rem] sm:pl-6')}>
                    <p className="text-[13px] leading-7 text-navy-600">{feature.details}</p>
                    <Link to={feature.to} className="mt-3 inline-flex text-[13px] font-bold text-burgundy-600 hover:text-burgundy-700">
                      {feature.linkLabel} ←
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <div className="flex items-center gap-2 border-t border-navy-100/70 bg-navy-50/50 px-5 py-3 text-[12px] text-navy-500">
          <FileText className="h-4 w-4 shrink-0" />
          قد تختلف المعلومات الظاهرة بحسب ما تسجّله الإدارة وما تتيحه لولي الأمر.
        </div>
      </section>
    </div>
  );
}
