# مشروع المخبتين القرآني – مركز كفرأبيل القرآني

واجهة Frontend كاملة (نسخة تجريبية) لمتابعة طلاب مشروع المخبتين: صفحة خاصة لولي الأمر، ولوحة إدارة للمشرف.
لا يوجد Backend ولا قاعدة بيانات في هذه المرحلة؛ كل البيانات تجريبية في ملف واحد.

## التشغيل

```bash
npm install
npm run dev
```

ثم افتح: http://localhost:5173

للبناء النهائي: `npm run build` (الناتج في `dist/`).

## الحسابات التجريبية

| الدور | اسم المستخدم | كلمة المرور |
|---|---|---|
| الإدارة | `admin` | `admin123` |
| ولي الأمر | `parent` | `parent123` |

في صفحة الدخول يوجد دخول سريع، ويمكن اختيار أي طالب لتجربة صفحة ولي الأمر الخاصة به.

## التقنيات

React 18 + TypeScript + Vite + Tailwind CSS + React Router + Lucide Icons.
الخطوط: Tajawal (أوزان 300–800) و Amiri للآيات، محمّلة محليًا عبر `@fontsource` (تعمل بدون إنترنت).
الرسوم البيانية مبنية بـ SVG بدون مكتبات إضافية.

## هيكل المشروع

```
public/
  images/brand/        شعار المشروع، شعار المركز، صورة المشرف
  images/students/     صور الطلاب الـ12
  images/activities/   صور تجريبية للسلايد شو (استبدلها بصور حقيقية)
src/
  data/mockData.ts     ← كل البيانات التجريبية (عدّل من هنا)
  types/               أنواع البيانات (مطابقة لجداول Supabase المستقبلية)
  context/             AuthContext (دخول تجريبي) – DataContext (مخزن البيانات) – ToastContext
  hooks/               useParentStudent
  utils/               تنسيق التواريخ العربية، حساب المعدلات والحضور والعبادات
  layouts/             Sidebar، ParentLayout، AdminLayout
  components/
    brand/             الخلفية، الشعارات، التذييل
    ui/                عناصر عامة: Avatar، Badge، Modal، Toggle، Progress، ScoreChart ...
    shared/            مكونات مشتركة: جدول العبادات، تفاصيل يوم الدوام، التقارير
    parent/            مكونات صفحة ولي الأمر
    admin/             نماذج الإدارة
  pages/
    LoginPage.tsx
    parent/            الرئيسية، المطلوب القادم، الحفظ والمراجعة، العبادات، سجل الدوام، التقارير
    admin/             لوحة التحكم، إدارة الطلاب، صفحة الطالب (Tabs)، تسجيل دوام اليوم، الصور والأنشطة، التقارير
```

## تعديل البيانات

- الطلاب وأسماؤهم وصورهم: مصفوفة `students` في `src/data/mockData.ts`.
- المطلوب للدوام القادم: `nextRequirements`.
- صور السلايد شو: `activities` (الصورة تظهر لمدة `durationDays` من تاريخ النشر، الافتراضي 6 أيام).
- سجلات الدوام تُولَّد تلقائيًا بقيم ثابتة من `studentProfiles`، ويمكن كتابة أيام محددة يدويًا في `manualSessions`.
- تاريخ "اليوم" التجريبي: `TODAY`.

التعديلات التي تتم من لوحة الإدارة تُحفظ في `localStorage` للمتصفح فقط.
لإرجاع البيانات الأصلية: زر **إعادة ضبط البيانات التجريبية** أسفل قائمة الإدارة.
إذا عدّلت ملف `mockData.ts` ولم تظهر التعديلات، اضغط نفس الزر.

## معادلة العلامة المقترحة

زر الآلة الحاسبة في نماذج الدوام يقترح علامة اليوم:
حضور 10% + حفظ 30% + مراجعة 30% + عبادات 20% + تقييم 10%
(الدالة `suggestScore` في `src/utils/stats.ts`).

## الربط مع Supabase لاحقًا

المشروع مصمم بحيث لا تحتاج الصفحات لأي تغيير:

1. `npm install @supabase/supabase-js` وأنشئ `src/lib/supabase.ts`.
2. أنشئ الجداول بنفس حقول الأنواع في `src/types/index.ts`:
   `students`, `sessions`, `next_requirements`, `activities`, و `profiles` (role + student_id).
3. في `DataContext.tsx`: حمّل البيانات من الجداول بدل `initialData`، واجعل كل دالة
   (`addStudent`, `upsertSessions`, `saveRequirement`, `addActivity` ...) تكتب إلى Supabase ثم تحدّث الحالة.
4. في `AuthContext.tsx`: استبدل `login` بـ `supabase.auth.signInWithPassword` واقرأ الدور من `profiles`.
5. الصور: استبدل `URL.createObjectURL` في نماذج الطالب والأنشطة بالرفع إلى Supabase Storage.
6. فعّل RLS بحيث يرى ولي الأمر سجلات ابنه فقط.

---

تصميم وتطوير: م. محمد عادل الفقيه
