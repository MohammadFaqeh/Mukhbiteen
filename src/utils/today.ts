function localISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** تاريخ اليوم الحقيقي بصيغة YYYY-MM-DD (محسوب مرة عند تحميل الصفحة) */
export const TODAY = localISODate(new Date());
