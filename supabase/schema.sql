-- ================================================================
--  قاعدة بيانات مشروع المخبتين القرآني – Supabase
--  آمن لإعادة التشغيل أكثر من مرة (idempotent): نفّذه كاملًا من
--  SQL Editor -> New query -> Run
-- ================================================================

-- ------------------------------------------------------------------
--  الجداول
-- ------------------------------------------------------------------
create table if not exists public.students (
  id text primary key,
  name text not null,
  short_name text not null,
  photo_url text,
  birth_date date,
  group_name text not null default 'مجموعة المخبتين',
  guardian_name text,
  guardian_email text unique, -- يُستخدم لربط حساب ولي الأمر تلقائيًا عند إنشائه
  joined_at date not null default current_date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.students drop column if exists username; -- عمود قديم غير مستخدم بعد اعتماد الدخول بالبريد

-- ملفات المستخدمين: تمتد من auth.users وتحدد الدور وربط ولي الأمر بابنه
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'parent')),
  student_id text references public.students (id) on delete set null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id text primary key, -- بصيغة `${student_id}-${date}`
  student_id text not null references public.students (id) on delete cascade,
  date date not null,
  attendance text not null check (attendance in ('present', 'absent', 'excused', 'late')),
  commitment text check (commitment in ('excellent', 'very_good', 'good', 'needs_work')),
  score numeric,
  memorization jsonb, -- { required, recited, completion, grade, notes }
  revision jsonb, -- { required, revised, completion, grade, notes }
  notes text
);
create index if not exists sessions_student_date_idx on public.sessions (student_id, date);

create table if not exists public.daily_worship (
  id text primary key, -- بصيغة `${student_id}-${date}`
  student_id text not null references public.students (id) on delete cascade,
  date date not null,
  prayers jsonb not null, -- { fajr, dhuhr, asr, maghrib, isha }: 'mosque' | 'home' | 'missed'
  morning_adhkar boolean not null default false,
  evening_adhkar boolean not null default false,
  sleep_adhkar boolean not null default false,
  duha_rakahs int not null default 0,
  qiyam boolean not null default false,
  witr_rakahs int not null default 0,
  rawatib_rakahs int not null default 0,
  parents_satisfaction int not null default 0,
  wird_from_page int,
  wird_to_page int,
  charity boolean not null default false,
  notes text
);
create index if not exists daily_worship_student_date_idx on public.daily_worship (student_id, date);

create table if not exists public.next_requirements (
  student_id text primary key references public.students (id) on delete cascade,
  date date,
  memorization text,
  revision text,
  memorization_pages numeric, -- عدد صفحات المطلوب: للمشرف فقط، لا يظهر لولي الأمر
  revision_pages numeric,
  extra_task text,
  notes text,
  updated_at timestamptz not null default now()
);

-- للقواعد المنشأة قبل إضافة أعمدة عدد الصفحات
alter table public.next_requirements add column if not exists memorization_pages numeric;
alter table public.next_requirements add column if not exists revision_pages numeric;

create table if not exists public.activities (
  id text primary key,
  image_url text not null,
  title text not null,
  description text,
  date date not null,
  duration_days int not null default 6
);

-- لوحة الشرف: لقطة مجمّدة من ترتيب المجموعة وقت النشر، تُخزَّن جاهزة (entries) بدل استعلام حي
-- حتى لا يحتاج ولي الأمر صلاحية قراءة بيانات بقية الطلاب
create table if not exists public.honor_boards (
  id text primary key,
  title text not null,
  period_from date not null,
  period_to date not null,
  published boolean not null default false,
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- دورات التجويد لكل طالب: المجتازة + الحالية
alter table public.students add column if not exists tajweed_completed text[] not null default '{}';
alter table public.students add column if not exists tajweed_current text;
-- الأجزاء المحفوظة كاملة (1-30) — يحددها المشرف من ملف الطالب
alter table public.students add column if not exists memorized_juz smallint[] not null default '{}';
-- تاريخ إتمام كل جزء { "30": "2026-10-05" } — يُكتب على شهادة الجزء
alter table public.students add column if not exists memorized_juz_dates jsonb not null default '{}'::jsonb;

-- سورة الكهف يوم الجمعة
alter table public.daily_worship add column if not exists kahf boolean not null default false;

-- منشورات الأنشطة: أكثر من صورة بنفس المنشور، والعنوان اختياري
alter table public.activities add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.activities alter column title drop not null;

-- مادة كل دورة تجويد (ملف PDF) — تظهر لولي أمر كل طالب مسجّل بهذه الدورة حاليًا
create table if not exists public.tajweed_materials (
  course text primary key check (course in ('tamheedi', 'mutawassit', 'mutaqaddim', 'itqan')),
  pdf_url text,
  file_name text,
  updated_at timestamptz not null default now()
);
-- فصول كل دورة وتاريخ إعطاء كل فصل: [{ "id", "title", "date" }] — ثابتة للدورة، وكل طالب مسجّل فيها يتبعها
alter table public.tajweed_materials add column if not exists chapters jsonb not null default '[]'::jsonb;

-- ------------------------------------------------------------------
--  صلاحيات أساسية على الجداول (لازمة قبل RLS، وإلا "permission denied")
--  التطبيق لا يستخدم إلا مستخدمين مسجّلين دخول (authenticated) أبدًا،
--  لذلك لا داعي لمنح anon أي صلاحية.
-- ------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.students,
  public.sessions,
  public.daily_worship,
  public.next_requirements,
  public.activities,
  public.honor_boards,
  public.tajweed_materials
to authenticated;
grant select, insert, update on public.profiles to authenticated;

-- ------------------------------------------------------------------
--  ربط حساب تلقائي عند إنشاء مستخدم جديد في Authentication
--  إن طابق بريده guardian_email لأحد الطلاب -> دوره "parent" ويُربط بذلك الطالب
--  غير ذلك -> دوره "admin" (يُفترض أنه لا يوجد إلا حساب/حسابات إدارة قليلة)
-- ------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_student_id text;
begin
  select id into matched_student_id from public.students where guardian_email = new.email limit 1;
  insert into public.profiles (id, role, student_id, display_name)
  values (
    new.id,
    case when matched_student_id is not null then 'parent' else 'admin' end,
    matched_student_id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------
--  دالة مساعدة: هل المستخدم الحالي مشرف؟
-- ------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ------------------------------------------------------------------
--  تفعيل RLS + السياسات: المشرف يرى ويعدّل كل شيء، ولي الأمر يرى بيانات ابنه فقط
-- ------------------------------------------------------------------
alter table public.students enable row level security;
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.daily_worship enable row level security;
alter table public.next_requirements enable row level security;
alter table public.activities enable row level security;
alter table public.honor_boards enable row level security;
alter table public.tajweed_materials enable row level security;

drop policy if exists "admin full access students" on public.students;
create policy "admin full access students" on public.students for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "parent reads own student" on public.students;
create policy "parent reads own student" on public.students for select using (id = (select student_id from public.profiles where id = auth.uid()));

drop policy if exists "user reads own profile" on public.profiles;
create policy "user reads own profile" on public.profiles for select using (id = auth.uid());
drop policy if exists "admin reads all profiles" on public.profiles;
create policy "admin reads all profiles" on public.profiles for select using (public.is_admin());

drop policy if exists "admin full access sessions" on public.sessions;
create policy "admin full access sessions" on public.sessions for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "parent reads own sessions" on public.sessions;
create policy "parent reads own sessions" on public.sessions for select using (student_id = (select student_id from public.profiles where id = auth.uid()));

drop policy if exists "admin full access daily_worship" on public.daily_worship;
create policy "admin full access daily_worship" on public.daily_worship for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "parent reads own daily_worship" on public.daily_worship;
create policy "parent reads own daily_worship" on public.daily_worship for select using (student_id = (select student_id from public.profiles where id = auth.uid()));
-- ولي الأمر يعبّي جدول العبادات لابنه فقط (والمعرّف لازم يطابق الطالب والتاريخ)
drop policy if exists "parent inserts own daily_worship" on public.daily_worship;
create policy "parent inserts own daily_worship" on public.daily_worship for insert
  with check (student_id = (select student_id from public.profiles where id = auth.uid()) and id = student_id || '-' || date::text);
drop policy if exists "parent updates own daily_worship" on public.daily_worship;
create policy "parent updates own daily_worship" on public.daily_worship for update
  using (student_id = (select student_id from public.profiles where id = auth.uid()))
  with check (student_id = (select student_id from public.profiles where id = auth.uid()) and id = student_id || '-' || date::text);

drop policy if exists "admin full access next_requirements" on public.next_requirements;
create policy "admin full access next_requirements" on public.next_requirements for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "parent reads own next_requirements" on public.next_requirements;
create policy "parent reads own next_requirements" on public.next_requirements for select using (student_id = (select student_id from public.profiles where id = auth.uid()));

drop policy if exists "admin full access activities" on public.activities;
create policy "admin full access activities" on public.activities for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "authenticated reads activities" on public.activities;
create policy "authenticated reads activities" on public.activities for select using (auth.uid() is not null);

drop policy if exists "admin full access honor_boards" on public.honor_boards;
create policy "admin full access honor_boards" on public.honor_boards for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "authenticated reads published honor_boards" on public.honor_boards;
create policy "authenticated reads published honor_boards" on public.honor_boards for select using (published = true);

drop policy if exists "admin full access tajweed_materials" on public.tajweed_materials;
create policy "admin full access tajweed_materials" on public.tajweed_materials for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "authenticated reads tajweed_materials" on public.tajweed_materials;
create policy "authenticated reads tajweed_materials" on public.tajweed_materials for select using (auth.uid() is not null);

-- ------------------------------------------------------------------
--  تخزين الصور (Storage)
-- ------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('student-photos', 'student-photos', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('activity-images', 'activity-images', true) on conflict (id) do nothing;

drop policy if exists "public read student photos" on storage.objects;
create policy "public read student photos" on storage.objects for select using (bucket_id = 'student-photos');
drop policy if exists "admin write student photos" on storage.objects;
create policy "admin write student photos" on storage.objects for insert with check (bucket_id = 'student-photos' and public.is_admin());
drop policy if exists "admin update student photos" on storage.objects;
create policy "admin update student photos" on storage.objects for update using (bucket_id = 'student-photos' and public.is_admin());
drop policy if exists "admin delete student photos" on storage.objects;
create policy "admin delete student photos" on storage.objects for delete using (bucket_id = 'student-photos' and public.is_admin());

drop policy if exists "public read activity images" on storage.objects;
create policy "public read activity images" on storage.objects for select using (bucket_id = 'activity-images');
drop policy if exists "admin write activity images" on storage.objects;
create policy "admin write activity images" on storage.objects for insert with check (bucket_id = 'activity-images' and public.is_admin());
drop policy if exists "admin update activity images" on storage.objects;
create policy "admin update activity images" on storage.objects for update using (bucket_id = 'activity-images' and public.is_admin());
drop policy if exists "admin delete activity images" on storage.objects;
create policy "admin delete activity images" on storage.objects for delete using (bucket_id = 'activity-images' and public.is_admin());

-- ملفات مواد دورات التجويد (PDF)
insert into storage.buckets (id, name, public) values ('tajweed-materials', 'tajweed-materials', true) on conflict (id) do nothing;

drop policy if exists "public read tajweed materials" on storage.objects;
create policy "public read tajweed materials" on storage.objects for select using (bucket_id = 'tajweed-materials');
drop policy if exists "admin write tajweed materials" on storage.objects;
create policy "admin write tajweed materials" on storage.objects for insert with check (bucket_id = 'tajweed-materials' and public.is_admin());
drop policy if exists "admin update tajweed materials" on storage.objects;
create policy "admin update tajweed materials" on storage.objects for update using (bucket_id = 'tajweed-materials' and public.is_admin());
drop policy if exists "admin delete tajweed materials" on storage.objects;
create policy "admin delete tajweed materials" on storage.objects for delete using (bucket_id = 'tajweed-materials' and public.is_admin());

-- ================================================================
--  إضافة: مصادر الأجزاء + المطلوبات المرنة + الإشعارات
--  كلها إضافات (لا تحذف ولا تعيد تهيئة أي جدول أو بيانات) وآمنة لإعادة التشغيل
-- ================================================================

-- مصدر كل جزء محفوظ { "30": "prior" | "manual" | "auto" } — للتمييز بين المحفوظ سابقًا والمكتمل بالمشروع
alter table public.students add column if not exists memorized_juz_sources jsonb not null default '{}'::jsonb;

-- دالة مساعدة: الطالب المرتبط بحساب ولي الأمر الحالي
create or replace function public.my_student_id()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select student_id from public.profiles where id = auth.uid();
$$;

-- ------------------------------------------------------------------
--  المطلوبات المرنة (تجويد، حديث، درس، واجب، حفظ…)
-- ------------------------------------------------------------------
create table if not exists public.assignments (
  id text primary key,
  title text not null,
  description text,
  category text not null default 'other' check (category in ('memorization', 'revision', 'other')),
  due_date date, -- اختياري
  visible_to_parents boolean not null default true,
  unit text check (unit in ('page', 'ayah', 'hadith', 'item')), -- null = مطلوب بلا مقدار
  range_from int, -- المطلوب نطاق (من–إلى)
  range_to int,
  target_amount numeric, -- أو عدد فقط
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- الطلاب المستهدفون بكل مطلوب + حالة كل طالب (المتأخر يُشتق من تاريخ الاستحقاق ولا يُخزَّن)
create table if not exists public.assignment_students (
  assignment_id text not null references public.assignments (id) on delete cascade,
  student_id text not null references public.students (id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  added_at timestamptz not null default now(),
  primary key (assignment_id, student_id)
);
create index if not exists assignment_students_student_idx on public.assignment_students (student_id);

-- سجل الإنجاز/التسميع على المطلوب: نطاق أو مقدار، معتمد أو لا
create table if not exists public.assignment_progress (
  id text primary key,
  assignment_id text not null,
  student_id text not null,
  date date not null,
  range_from int,
  range_to int,
  amount numeric,
  approved boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  foreign key (assignment_id, student_id) references public.assignment_students (assignment_id, student_id) on delete cascade
);
create index if not exists assignment_progress_target_idx on public.assignment_progress (assignment_id, student_id);

-- هل المطلوب ظاهر للأهل؟ (security definer لتجنّب تداخل سياسات RLS بين الجدولين)
create or replace function public.assignment_visible(aid text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select visible_to_parents from public.assignments where id = aid), false);
$$;

-- حفظ مطلوب مع طلابه دفعة واحدة (معاملة واحدة: إما يُحفظ كله أو لا شيء)
create or replace function public.save_assignment(p jsonb, p_student_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  aid text := p ->> 'id';
begin
  if not public.is_admin() then
    raise exception 'غير مسموح';
  end if;
  if coalesce(trim(p ->> 'title'), '') = '' then
    raise exception 'عنوان المطلوب مطلوب';
  end if;
  if coalesce(cardinality(p_student_ids), 0) = 0 then
    raise exception 'اختر طالبًا واحدًا على الأقل';
  end if;
  insert into public.assignments (id, title, description, category, due_date, visible_to_parents, unit, range_from, range_to, target_amount, updated_at)
  values (
    aid,
    trim(p ->> 'title'),
    nullif(p ->> 'description', ''),
    coalesce(nullif(p ->> 'category', ''), 'other'),
    nullif(p ->> 'due_date', '')::date,
    coalesce((p ->> 'visible_to_parents')::boolean, true),
    nullif(p ->> 'unit', ''),
    nullif(p ->> 'range_from', '')::int,
    nullif(p ->> 'range_to', '')::int,
    nullif(p ->> 'target_amount', '')::numeric,
    now()
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    category = excluded.category,
    due_date = excluded.due_date,
    visible_to_parents = excluded.visible_to_parents,
    unit = excluded.unit,
    range_from = excluded.range_from,
    range_to = excluded.range_to,
    target_amount = excluded.target_amount,
    updated_at = now();
  delete from public.assignment_students where assignment_id = aid and not (student_id = any (p_student_ids));
  insert into public.assignment_students (assignment_id, student_id)
  select aid, sid from unnest(p_student_ids) as sid
  on conflict do nothing;
end;
$$;

-- ------------------------------------------------------------------
--  الإشعارات
-- ------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  link text,
  kind text not null default 'manual' check (kind in ('manual', 'auto')),
  rule_id text,
  dedupe_key text unique, -- يمنع تكرار إشعار تلقائي لنفس الحدث
  send_at timestamptz not null default now(), -- إشعار مجدول: لا يظهر قبل هذا الوقت
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists notifications_send_at_idx on public.notifications (send_at desc);

create table if not exists public.notification_recipients (
  notification_id uuid not null references public.notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  student_id text references public.students (id) on delete set null,
  read_at timestamptz,
  primary key (notification_id, user_id) -- نفس المستخدم لا يستلم نفس الإشعار مرتين
);
create index if not exists notification_recipients_user_idx on public.notification_recipients (user_id);

-- قواعد الإشعارات التلقائية (تُعدَّل من الموقع: إدارة الإشعارات ← الإشعارات التلقائية)
create table if not exists public.notification_rules (
  id text primary key,
  type text not null check (type in ('session_reminder', 'assignment_new', 'assignment_due', 'assignment_overdue', 'recitation_shortfall')),
  name text not null,
  enabled boolean not null default false,
  title_template text not null,
  body_template text not null,
  audience text[] not null default '{}', -- مجموعات مستهدفة، فارغة = الجميع
  weekdays int[] not null default '{}', -- أيام الدوام 0=الأحد … 6=السبت
  session_time time, -- ساعة الدوام (تظهر بالرسالة)
  send_time time, -- ساعة الإرسال بتوقيت المركز
  hours_before int, -- قبل الاستحقاق بكم ساعة
  updated_at timestamptz not null default now()
);

-- القواعد الافتراضية (موقوفة حتى تفعّلها الإدارة) — لا تُستبدل إذا كانت موجودة
insert into public.notification_rules (id, type, name, enabled, title_template, body_template, weekdays, session_time, send_time, hours_before) values
  ('session-reminder', 'session_reminder', 'تذكير بالدوام قبل يوم', false, 'تذكير بدوام الغد', 'نذكّركم بدوام الطالب {الطالب} غدًا {التاريخ} الساعة {الوقت}. بارك الله فيكم.', '{}', '16:00', '19:00', null),
  ('fajr-reminder', 'session_reminder', 'تذكير بدوام الفجر', false, 'دوام الفجر غدًا', 'دوام الفجر غدًا {التاريخ} الساعة {الوقت}، نرجو الحرص على حضور {الطالب} في الموعد.', '{}', '04:45', '20:30', null),
  ('assignment-new', 'assignment_new', 'إضافة مطلوب جديد', false, 'مطلوب جديد: {المطلوب}', 'أُضيف مطلوب جديد للطالب {الطالب}: {المطلوب}. موعد الاستحقاق: {الاستحقاق}.', '{}', null, null, null),
  ('assignment-due', 'assignment_due', 'قرب موعد استحقاق مطلوب', false, 'اقترب موعد المطلوب', 'يحين موعد المطلوب "{المطلوب}" للطالب {الطالب} في {الاستحقاق}، ولم يكتمل بعد.', '{}', null, '18:00', 24),
  ('assignment-overdue', 'assignment_overdue', 'تجاوز موعد مطلوب دون إكماله', false, 'تأخر في مطلوب', 'تجاوز المطلوب "{المطلوب}" موعد استحقاقه ({الاستحقاق}) ولم يكتمل بعد للطالب {الطالب}.', '{}', null, '18:00', null),
  ('recitation-shortfall', 'recitation_shortfall', 'تقصير في التسميع', false, 'تنبيه: تقصير في التسميع', 'لم يُكمل الطالب {الطالب} التسميع المطلوب يوم {التاريخ}: {المنجز}.', '{}', null, '20:00', null)
on conflict (id) do nothing;

-- توقيت المركز (الأردن) — كل مواعيد الإشعارات تُحسب به
create or replace function public.center_tz() returns text language sql immutable as $$ select 'Asia/Amman'::text $$;

create or replace function public.ar_date(d date) returns text language sql immutable as $$
  select case when d is null then null else
    (array['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'])[extract(dow from d)::int + 1] || ' ' || to_char(d, 'DD/MM/YYYY') end;
$$;

create or replace function public.ar_time(t time) returns text language sql immutable as $$
  select case when t is null then '' else
    to_char(t, 'FMHH12:MI') || case when extract(hour from t) < 12 then ' صباحًا' else ' مساءً' end end;
$$;

create or replace function public.fill_template(t text, student text, d text, tm text, req text, due text, done text)
returns text language sql immutable as $$
  select replace(replace(replace(replace(replace(replace(coalesce(t, ''),
    '{الطالب}', coalesce(student, '')), '{التاريخ}', coalesce(d, '')), '{الوقت}', coalesce(tm, '')),
    '{المطلوب}', coalesce(req, '')), '{الاستحقاق}', coalesce(due, 'بدون موعد محدد')), '{المنجز}', coalesce(done, ''));
$$;

-- نص تقصير جزء (حفظ/مراجعة) من سجل يوم الدوام، أو null إذا لا تقصير — نفس منطق pageShortfall بالموقع
create or replace function public.shortfall_text(label text, e jsonb)
returns text language plpgsql immutable as $$
declare
  req numeric := coalesce(nullif(e ->> 'requiredPages', '')::numeric, 0);
  rec numeric := coalesce(nullif(e ->> 'completedPages', '')::numeric, 0);
  ok boolean := coalesce((e ->> 'approved')::boolean, true);
  done numeric;
begin
  if e is null or req <= 0 then return null; end if;
  done := case when ok then rec else 0 end;
  if done >= req then return null; end if;
  if not ok and rec > 0 then
    return label || ': سمّع ' || trim_scale(rec) || ' من ' || trim_scale(req) || ' صفحات ولم يُعتمد التسميع';
  elsif done = 0 then
    return label || ': لم يُسمّع (المطلوب ' || trim_scale(req) || ' صفحات)';
  end if;
  return label || ': ' || trim_scale(done) || ' من أصل ' || trim_scale(req) || ' صفحات';
end;
$$;

-- إنشاء إشعار لأولياء أمر طالب مرة واحدة فقط لكل حدث (dedupe_key). يرجع true إذا أُنشئ فعلًا.
create or replace function public.notify_student_parents(p_student text, p_title text, p_body text, p_link text, p_rule text, p_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  nid uuid;
begin
  if not exists (select 1 from public.profiles where role = 'parent' and student_id = p_student) then
    return false; -- لا يوجد حساب ولي أمر لهذا الطالب بعد
  end if;
  insert into public.notifications (title, body, link, kind, rule_id, dedupe_key, send_at, created_by)
  values (p_title, p_body, p_link, 'auto', p_rule, p_key, now(), null)
  on conflict (dedupe_key) do nothing
  returning id into nid;
  if nid is null then
    return false; -- أُرسل سابقًا لنفس الحدث
  end if;
  insert into public.notification_recipients (notification_id, user_id, student_id)
  select nid, id, student_id from public.profiles where role = 'parent' and student_id = p_student
  on conflict do nothing;
  return true;
end;
$$;

-- تنفيذ قواعد الإشعارات التلقائية — يشغّلها pg_cron كل 10 دقائق (حتى لو الموقع مغلق)،
-- وتشغّلها الإدارة من الموقع بعد الحفظ لإرسال فوري. يرجع عدد الإشعارات المنشأة.
create or replace function public.run_notification_rules()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  lnow timestamp := now() at time zone public.center_tz();
  today date := (now() at time zone public.center_tz())::date;
  r record;
  x record;
  n int := 0;
  txt text;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'غير مسموح';
  end if;

  for r in select * from public.notification_rules where enabled loop
    if r.type = 'session_reminder' then
      -- الغد يوم دوام، وحان وقت الإرسال اليوم
      if extract(dow from today + 1)::int = any (r.weekdays) and lnow::time >= coalesce(r.send_time, '18:00') then
        for x in select s.id, s.name from public.students s
                 where s.active and (cardinality(r.audience) = 0 or s.group_name = any (r.audience)) loop
          if public.notify_student_parents(x.id,
               public.fill_template(r.title_template, x.name, public.ar_date(today + 1), public.ar_time(r.session_time), null, null, null),
               public.fill_template(r.body_template, x.name, public.ar_date(today + 1), public.ar_time(r.session_time), null, null, null),
               '/parent', r.id, r.id || ':' || (today + 1) || ':' || x.id) then
            n := n + 1;
          end if;
        end loop;
      end if;

    elsif r.type = 'assignment_new' then
      for x in select a.id as aid, a.title, a.due_date, s.id as sid, s.name
               from public.assignments a
               join public.assignment_students t on t.assignment_id = a.id
               join public.students s on s.id = t.student_id
               where a.visible_to_parents and s.active
                 and greatest(a.updated_at, t.added_at) > now() - interval '3 days'
                 and (cardinality(r.audience) = 0 or s.group_name = any (r.audience)) loop
        if public.notify_student_parents(x.sid,
             public.fill_template(r.title_template, x.name, null, null, x.title, public.ar_date(x.due_date), null),
             public.fill_template(r.body_template, x.name, null, null, x.title, public.ar_date(x.due_date), null),
             '/parent/next', r.id, r.id || ':' || x.aid || ':' || x.sid) then
          n := n + 1;
        end if;
      end loop;

    elsif r.type = 'assignment_due' then
      for x in select a.id as aid, a.title, a.due_date, s.id as sid, s.name
               from public.assignments a
               join public.assignment_students t on t.assignment_id = a.id
               join public.students s on s.id = t.student_id
               where a.visible_to_parents and s.active and t.status <> 'completed'
                 and a.due_date is not null and a.due_date >= today
                 and lnow >= a.due_date::timestamp - make_interval(hours => coalesce(r.hours_before, 24))
                 and lnow::time >= coalesce(r.send_time, '00:00')
                 and (cardinality(r.audience) = 0 or s.group_name = any (r.audience)) loop
        if public.notify_student_parents(x.sid,
             public.fill_template(r.title_template, x.name, null, null, x.title, public.ar_date(x.due_date), null),
             public.fill_template(r.body_template, x.name, null, null, x.title, public.ar_date(x.due_date), null),
             '/parent/next', r.id, r.id || ':' || x.aid || ':' || x.sid || ':' || x.due_date) then
          n := n + 1;
        end if;
      end loop;

    elsif r.type = 'assignment_overdue' then
      -- تقصير فعلي فقط: تجاوز تاريخ الاستحقاق ولم يكتمل (آخر 7 أيام فقط حتى لا تنهال إشعارات قديمة عند التفعيل)
      for x in select a.id as aid, a.title, a.due_date, s.id as sid, s.name
               from public.assignments a
               join public.assignment_students t on t.assignment_id = a.id
               join public.students s on s.id = t.student_id
               where a.visible_to_parents and s.active and t.status <> 'completed'
                 and a.due_date < today and a.due_date >= today - 7
                 and lnow::time >= coalesce(r.send_time, '00:00')
                 and (cardinality(r.audience) = 0 or s.group_name = any (r.audience)) loop
        if public.notify_student_parents(x.sid,
             public.fill_template(r.title_template, x.name, null, null, x.title, public.ar_date(x.due_date), null),
             public.fill_template(r.body_template, x.name, null, null, x.title, public.ar_date(x.due_date), null),
             '/parent/next', r.id, r.id || ':' || x.aid || ':' || x.sid || ':' || x.due_date) then
          n := n + 1;
        end if;
      end loop;

    elsif r.type = 'recitation_shortfall' then
      -- أيام الدوام في آخر يومين: يُرسل بعد ساعة الإرسال (فرصة لتصحيح السجل قبلها)
      for x in select se.id, se.date, se.memorization, se.revision, s.id as sid, s.name
               from public.sessions se
               join public.students s on s.id = se.student_id
               where s.active and se.attendance in ('present', 'late')
                 and se.date between today - 2 and today
                 and (se.date < today or lnow::time >= coalesce(r.send_time, '20:00'))
                 and (cardinality(r.audience) = 0 or s.group_name = any (r.audience)) loop
        txt := concat_ws('، ', public.shortfall_text('الحفظ', x.memorization), public.shortfall_text('المراجعة', x.revision));
        if txt <> '' and public.notify_student_parents(x.sid,
             public.fill_template(r.title_template, x.name, public.ar_date(x.date), null, null, null, txt),
             public.fill_template(r.body_template, x.name, public.ar_date(x.date), null, null, null, txt),
             '/parent/sessions', r.id, r.id || ':' || x.id) then
          n := n + 1;
        end if;
      end loop;
    end if;
  end loop;
  return n;
end;
$$;

-- إرسال إشعار يدوي (فوري أو مجدول) لأولياء أمور طلاب محددين أو مجموعات أو الجميع — معاملة واحدة
create or replace function public.send_notification(p_title text, p_body text, p_link text, p_send_at timestamptz, p_student_ids text[], p_groups text[], p_all boolean)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  nid uuid;
  cnt int;
begin
  if not public.is_admin() then
    raise exception 'غير مسموح';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'عنوان الإشعار مطلوب';
  end if;
  insert into public.notifications (title, body, link, kind, send_at)
  values (trim(p_title), coalesce(p_body, ''), nullif(p_link, ''), 'manual', coalesce(p_send_at, now()))
  returning id into nid;
  insert into public.notification_recipients (notification_id, user_id, student_id)
  select nid, p.id, p.student_id
  from public.profiles p
  join public.students s on s.id = p.student_id
  where p.role = 'parent'
    and (s.id = any (coalesce(p_student_ids, '{}')) or (s.active and (p_all or s.group_name = any (coalesce(p_groups, '{}')))))
  on conflict do nothing;
  get diagnostics cnt = row_count;
  if cnt = 0 then
    raise exception 'لا يوجد أولياء أمور لديهم حسابات ضمن المستلمين المحددين';
  end if;
  return cnt;
end;
$$;

-- ------------------------------------------------------------------
--  صلاحيات الجداول الجديدة
-- ------------------------------------------------------------------
grant select, insert, update, delete on public.assignments, public.assignment_students, public.assignment_progress, public.notification_rules to authenticated;
grant select, insert, delete on public.notifications, public.notification_recipients to authenticated;
-- ولي الأمر لا يعدّل من إشعاراته إلا وقت القراءة
revoke update on public.notification_recipients from authenticated, anon;
grant update (read_at) on public.notification_recipients to authenticated;
revoke all on public.assignments, public.assignment_students, public.assignment_progress, public.notification_rules, public.notifications, public.notification_recipients from anon;

revoke execute on function public.notify_student_parents(text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.run_notification_rules() from public, anon;
revoke execute on function public.send_notification(text, text, text, timestamptz, text[], text[], boolean) from public, anon;
revoke execute on function public.save_assignment(jsonb, text[]) from public, anon;
grant execute on function public.run_notification_rules() to authenticated;
grant execute on function public.send_notification(text, text, text, timestamptz, text[], text[], boolean) to authenticated;
grant execute on function public.save_assignment(jsonb, text[]) to authenticated;

alter table public.assignments enable row level security;
alter table public.assignment_students enable row level security;
alter table public.assignment_progress enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_recipients enable row level security;
alter table public.notification_rules enable row level security;

drop policy if exists "admin full access assignments" on public.assignments;
create policy "admin full access assignments" on public.assignments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "parent reads own visible assignments" on public.assignments;
create policy "parent reads own visible assignments" on public.assignments for select
  using (visible_to_parents and exists (select 1 from public.assignment_students t where t.assignment_id = assignments.id and t.student_id = public.my_student_id()));

drop policy if exists "admin full access assignment_students" on public.assignment_students;
create policy "admin full access assignment_students" on public.assignment_students for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "parent reads own assignment_students" on public.assignment_students;
create policy "parent reads own assignment_students" on public.assignment_students for select
  using (student_id = public.my_student_id() and public.assignment_visible(assignment_id));

drop policy if exists "admin full access assignment_progress" on public.assignment_progress;
create policy "admin full access assignment_progress" on public.assignment_progress for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "parent reads own assignment_progress" on public.assignment_progress;
create policy "parent reads own assignment_progress" on public.assignment_progress for select
  using (student_id = public.my_student_id() and public.assignment_visible(assignment_id));

drop policy if exists "admin full access notifications" on public.notifications;
create policy "admin full access notifications" on public.notifications for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "recipient reads delivered notifications" on public.notifications;
create policy "recipient reads delivered notifications" on public.notifications for select
  using (send_at <= now() and exists (select 1 from public.notification_recipients r where r.notification_id = notifications.id and r.user_id = auth.uid()));

drop policy if exists "admin full access notification_recipients" on public.notification_recipients;
create policy "admin full access notification_recipients" on public.notification_recipients for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "user reads own notification_recipients" on public.notification_recipients;
create policy "user reads own notification_recipients" on public.notification_recipients for select using (user_id = auth.uid());
drop policy if exists "user marks own notifications read" on public.notification_recipients;
create policy "user marks own notifications read" on public.notification_recipients for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "admin full access notification_rules" on public.notification_rules;
create policy "admin full access notification_rules" on public.notification_rules for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
--  الجدولة على الخادم (pg_cron): تشغيل القواعد كل 10 دقائق حتى لو لا أحد يفتح الموقع.
--  إن ظهرت رسالة "pg_cron غير متاح": فعّل pg_cron من Database -> Extensions ثم أعد تشغيل الملف.
-- ------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('mukhbiteen-notifications', '*/10 * * * *', 'select public.run_notification_rules()');
exception when others then
  raise notice 'pg_cron غير متاح: % — فعّله من Database -> Extensions ثم أعد تشغيل هذا الملف', sqlerrm;
end;
$$;
