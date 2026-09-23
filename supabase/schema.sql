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
  extra_task text,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id text primary key,
  image_url text not null,
  title text not null,
  description text,
  date date not null,
  duration_days int not null default 6
);

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
  public.activities
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

drop policy if exists "admin full access next_requirements" on public.next_requirements;
create policy "admin full access next_requirements" on public.next_requirements for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "parent reads own next_requirements" on public.next_requirements;
create policy "parent reads own next_requirements" on public.next_requirements for select using (student_id = (select student_id from public.profiles where id = auth.uid()));

drop policy if exists "admin full access activities" on public.activities;
create policy "admin full access activities" on public.activities for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "authenticated reads activities" on public.activities;
create policy "authenticated reads activities" on public.activities for select using (auth.uid() is not null);

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
