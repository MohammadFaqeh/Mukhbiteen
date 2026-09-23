import type { Supervisor } from '@/types';

// BASE_URL يطابق إعداد `base` بـ vite.config.ts (مسار الموقع الفرعي عند النشر على GitHub Pages)
const base = import.meta.env.BASE_URL;

/** بيانات هوية المشروع الثابتة (شعارات، اسم المركز...) */
export const PROJECT = {
  name: 'مشروع المخبتين القرآني',
  center: 'مركز كفرأبيل القرآني',
  group: 'مجموعة المخبتين',
  verse: 'وَبَشِّرِ الْمُخْبِتِينَ',
  logo: `${base}images/brand/mukhbiteen-logo.png`,
  centerLogo: `${base}images/brand/center-logo.png`,
  credit: 'تصميم وتطوير: م. محمد عادل الفقيه',
};

export const supervisor: Supervisor = {
  name: 'م. محمد عادل الفقيه',
  title: 'مشرف مشروع المخبتين القرآني',
  photo: `${base}images/brand/supervisor.jpg`,
};
