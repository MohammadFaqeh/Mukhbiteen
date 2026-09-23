import type { Supervisor } from '@/types';

/** بيانات هوية المشروع الثابتة (شعارات، اسم المركز...) */
export const PROJECT = {
  name: 'مشروع المخبتين القرآني',
  center: 'مركز كفرأبيل القرآني',
  group: 'مجموعة المخبتين',
  verse: 'وَبَشِّرِ الْمُخْبِتِينَ',
  logo: '/images/brand/mukhbiteen-logo.png',
  centerLogo: '/images/brand/center-logo.png',
  credit: 'تصميم وتطوير: م. محمد عادل الفقيه',
};

export const supervisor: Supervisor = {
  name: 'م. محمد عادل الفقيه',
  title: 'مشرف مشروع المخبتين القرآني',
  photo: '/images/brand/supervisor.jpg',
};
