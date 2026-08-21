-- ============================================================
-- AVUNK Complete Database Schema (Idempotent Migration)
-- Single source of truth for all tables, functions, RLS, storage
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_net";

-- ============================================================
-- 1. INSTITUTIONS
-- ============================================================
create table if not exists institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text unique,
  address text,
  verification_status text default 'verified' check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz default now()
);

-- Seed default institution
insert into institutions (name, domain, address, verification_status)
values ('Indian Institute of Technology (IIT) Delhi', 'iitd.ac.in', 'Hauz Khas, New Delhi', 'verified')
on conflict (domain) do nothing;

-- ============================================================
-- 2. PROFILES (linked 1:1 with auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete cascade unique not null,
  role text not null check (role in ('student', 'tp', 'company')),
  email text not null unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_profiles_auth_user_id on profiles(auth_user_id);
create index if not exists idx_profiles_role on profiles(role);

-- ============================================================
-- 3. STUDENT PROFILES
-- ============================================================
create table if not exists student_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade unique not null,
  full_name text not null,
  institute_id uuid references institutions(id) on delete set null,
  institute_name text,
  department text,
  graduation_year integer,
  address text,
  phone text,
  skills text[] default '{}',
  discoverable boolean default true,
  verification_status text default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_student_profiles_profile_id on student_profiles(profile_id);
create index if not exists idx_student_profiles_institute_id on student_profiles(institute_id);
create index if not exists idx_student_profiles_discoverable on student_profiles(discoverable);

-- ============================================================
-- 4. T&P PROFILES
-- ============================================================
create table if not exists tp_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade unique not null,
  institution_id uuid references institutions(id) on delete set null,
  institution_name text not null,
  institution_email text not null,
  address text,
  verification_status text default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  verification_document text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tp_profiles_profile_id on tp_profiles(profile_id);
create index if not exists idx_tp_profiles_institution_id on tp_profiles(institution_id);

-- ============================================================
-- 5. COMPANY PROFILES
-- ============================================================
create table if not exists company_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade unique not null,
  company_name text not null,
  company_email text not null,
  industry text,
  website text,
  address text,
  verification_status text default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  verification_document text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_company_profiles_profile_id on company_profiles(profile_id);

-- ============================================================
-- 6. RESUMES
-- ============================================================
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references student_profiles(id) on delete cascade not null,
  file_path text not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  version integer default 1,
  analysis_status text default 'pending' check (analysis_status in ('pending', 'analyzing', 'completed', 'failed')),
  uploaded_at timestamptz default now()
);

create index if not exists idx_resumes_student_id on resumes(student_id);

-- ============================================================
-- 7. RESUME ANALYSES
-- ============================================================
create table if not exists resume_analyses (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid references resumes(id) on delete cascade not null,
  student_id uuid references student_profiles(id) on delete cascade not null,
  score integer not null default 0,
  skills_detected text[] default '{}',
  strengths text[] default '{}',
  weaknesses text[] default '{}',
  missing_skills text[] default '{}',
  ats_feedback text,
  role_recommendations text[] default '{}',
  market_feedback text,
  ai_model text default 'gemini-1.5-flash',
  raw_ai_response jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_resume_analyses_student_id on resume_analyses(student_id);
create index if not exists idx_resume_analyses_resume_id on resume_analyses(resume_id);

-- ============================================================
-- 8. INTERNSHIP OFFERS
-- ============================================================
create table if not exists internship_offers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references student_profiles(id) on delete cascade not null,
  file_path text not null,
  file_name text not null,
  file_type text,
  file_size bigint,
  analysis_status text default 'pending' check (analysis_status in ('pending', 'analyzing', 'completed', 'failed')),
  uploaded_at timestamptz default now()
);

create index if not exists idx_internship_offers_student_id on internship_offers(student_id);

-- ============================================================
-- 9. OFFER ANALYSES
-- ============================================================
create table if not exists offer_analyses (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references internship_offers(id) on delete cascade not null,
  student_id uuid references student_profiles(id) on delete cascade not null,
  company_name text,
  internship_role text,
  risk_score integer not null default 0,
  risk_level text not null check (risk_level in ('Low', 'Medium', 'High')),
  confidence integer not null default 80,
  positive_signals text[] default '{}',
  warning_signals text[] default '{}',
  missing_information text[] default '{}',
  inconsistencies text[] default '{}',
  recommendation text,
  company_research jsonb,
  internship_research jsonb,
  sources jsonb,
  raw_ai_response jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_offer_analyses_student_id on offer_analyses(student_id);
create index if not exists idx_offer_analyses_offer_id on offer_analyses(offer_id);

-- ============================================================
-- 10. INTERNSHIP REQUIREMENTS (posted by companies)
-- ============================================================
create table if not exists internship_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references company_profiles(id) on delete cascade not null,
  title text not null,
  description text,
  required_skills text[] default '{}',
  preferred_skills text[] default '{}',
  location text,
  mode text default 'Remote' check (mode in ('Remote', 'Onsite', 'Hybrid')),
  stipend text,
  duration text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_internship_requirements_company_id on internship_requirements(company_id);

-- ============================================================
-- 11. STUDENT-COMPANY MATCHES
-- ============================================================
create table if not exists student_company_matches (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references student_profiles(id) on delete cascade not null,
  company_id uuid references company_profiles(id) on delete cascade not null,
  internship_requirement_id uuid references internship_requirements(id) on delete cascade,
  match_score integer not null,
  matching_skills text[] default '{}',
  missing_skills text[] default '{}',
  ai_explanation text,
  created_at timestamptz default now()
);

create index if not exists idx_student_company_matches_student_id on student_company_matches(student_id);
create index if not exists idx_student_company_matches_company_id on student_company_matches(company_id);

-- ============================================================
-- 12. INTERNSHIP APPLICATIONS
-- ============================================================
create table if not exists internship_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references student_profiles(id) on delete cascade not null,
  company_id uuid references company_profiles(id) on delete cascade not null,
  requirement_id uuid references internship_requirements(id) on delete cascade,
  status text default 'applied' check (status in ('applied', 'under_review', 'shortlisted', 'rejected')),
  applied_at timestamptz default now()
);

create index if not exists idx_internship_applications_student_id on internship_applications(student_id);
create index if not exists idx_internship_applications_company_id on internship_applications(company_id);

alter table internship_applications enable row level security;

drop policy if exists "internship_applications_all" on internship_applications;
create policy "internship_applications_all" on internship_applications
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 13. STUDENT INTERNSHIPS (Active/Completed Tracked Work)
-- ============================================================
create table if not exists student_internships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references student_profiles(id) on delete cascade not null,
  company_id uuid references company_profiles(id) on delete set null,
  company_name text not null,
  role text not null,
  start_date date not null default current_date,
  end_date date not null default (current_date + interval '30 days'),
  total_days integer not null default 30,
  status text not null default 'pending_verification' check (status in ('pending_verification', 'active', 'completed', 'paused')),
  mentor_name text,
  mentor_email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_student_internships_student_id on student_internships(student_id);
create index if not exists idx_student_internships_company_id on student_internships(company_id);
alter table student_internships enable row level security;

drop policy if exists "student_internships_all" on student_internships;
create policy "student_internships_all" on student_internships
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 14. INTERNSHIP DAILY WORK LOGS
-- ============================================================
create table if not exists internship_daily_logs (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid references student_internships(id) on delete cascade not null,
  student_id uuid references student_profiles(id) on delete cascade not null,
  log_date date not null default current_date,
  title text not null,
  description text not null,
  tasks_completed text,
  learnings text,
  blockers text,
  hours_worked numeric(4, 2) not null default 4.0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_internship_daily_logs_internship_id on internship_daily_logs(internship_id);
create index if not exists idx_internship_daily_logs_student_id on internship_daily_logs(student_id);
alter table internship_daily_logs enable row level security;

drop policy if exists "internship_daily_logs_all" on internship_daily_logs;
create policy "internship_daily_logs_all" on internship_daily_logs
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 15. INTERNSHIP LOG EVIDENCE
-- ============================================================
create table if not exists internship_log_evidence (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid references internship_daily_logs(id) on delete cascade not null,
  evidence_type text not null check (evidence_type in ('file', 'github', 'demo', 'link')),
  title text,
  file_path text,
  file_url text,
  file_name text,
  file_type text,
  url text,
  created_at timestamptz default now()
);

create index if not exists idx_internship_log_evidence_daily_log_id on internship_log_evidence(daily_log_id);
alter table internship_log_evidence enable row level security;

drop policy if exists "internship_log_evidence_all" on internship_log_evidence;
create policy "internship_log_evidence_all" on internship_log_evidence
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 16. INTERNSHIP MENTOR REVIEWS
-- ============================================================
create table if not exists internship_mentor_reviews (
  id uuid primary key default gen_random_uuid(),
  daily_log_id uuid references internship_daily_logs(id) on delete cascade not null,
  reviewer_id uuid references profiles(id) on delete set null,
  reviewer_name text,
  decision text not null check (decision in ('approved', 'changes_requested', 'rejected')),
  comment text not null,
  created_at timestamptz default now()
);

create index if not exists idx_internship_mentor_reviews_daily_log_id on internship_mentor_reviews(daily_log_id);
alter table internship_mentor_reviews enable row level security;

drop policy if exists "internship_mentor_reviews_all" on internship_mentor_reviews;
-- ============================================================
-- 17. INTERNSHIP TASKS (Assigned by College/T&P or Company)
-- ============================================================
create table if not exists internship_tasks (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid references student_internships(id) on delete cascade,
  student_id uuid references student_profiles(id) on delete cascade not null,
  company_id uuid references company_profiles(id) on delete set null,
  college_id uuid references tp_profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  created_by_role text not null check (created_by_role in ('tp', 'company')),
  task_source text not null default 'College / T&P',
  title text not null,
  description text not null,
  instructions text,
  deadline date not null default (current_date + interval '7 days'),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  submission_required boolean not null default true,
  submission_type text not null default 'multiple' check (submission_type in ('text', 'file', 'github', 'url', 'multiple')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted', 'under_review', 'completed', 'changes_requested', 'overdue')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_internship_tasks_student_id on internship_tasks(student_id);
create index if not exists idx_internship_tasks_internship_id on internship_tasks(internship_id);
create index if not exists idx_internship_tasks_company_id on internship_tasks(company_id);
create index if not exists idx_internship_tasks_created_by on internship_tasks(created_by);
alter table internship_tasks enable row level security;

drop policy if exists "internship_tasks_all" on internship_tasks;
create policy "internship_tasks_all" on internship_tasks
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 18. TASK SUBMISSIONS & VERIFICATIONS
-- ============================================================
create table if not exists task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references internship_tasks(id) on delete cascade not null,
  student_id uuid references student_profiles(id) on delete cascade not null,
  submission_text text,
  file_url text,
  file_name text,
  github_url text,
  demo_url text,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'completed', 'changes_requested', 'rejected')),
  submitted_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewer_name text,
  review_comment text
);

create index if not exists idx_task_submissions_task_id on task_submissions(task_id);
create index if not exists idx_task_submissions_student_id on task_submissions(student_id);
alter table task_submissions enable row level security;

drop policy if exists "task_submissions_all" on task_submissions;
create policy "task_submissions_all" on task_submissions
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 19. INTERNSHIP ATTENDANCE / PRESENCE (OPTIONAL)
-- ============================================================
create table if not exists internship_attendance (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid references student_internships(id) on delete cascade not null,
  student_id uuid references student_profiles(id) on delete cascade not null,
  company_id uuid references company_profiles(id) on delete cascade not null,
  date date not null default current_date,
  status text not null check (status in ('present', 'absent', 'half_day', 'leave')),
  marked_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now(),
  unique(internship_id, date)
);

create index if not exists idx_internship_attendance_internship_id on internship_attendance(internship_id);
create index if not exists idx_internship_attendance_student_id on internship_attendance(student_id);
create index if not exists idx_internship_attendance_company_id on internship_attendance(company_id);
alter table internship_attendance enable row level security;

drop policy if exists "internship_attendance_all" on internship_attendance;
create policy "internship_attendance_all" on internship_attendance
  for all using (auth.role() = 'authenticated');

-- ============================================================
-- 20. CREDITS (one row per user)
-- ============================================================
create table if not exists credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique not null,
  free_credits integer default 2 not null,
  paid_credits integer default 0 not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_credits_user_id on credits(user_id);

-- ============================================================
-- 13. CREDIT TRANSACTIONS
-- ============================================================
create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('deduction', 'addition', 'grant', 'refund')),
  amount integer not null,
  reason text,
  reference text,
  created_at timestamptz default now()
);

create index if not exists idx_credit_transactions_user_id on credit_transactions(user_id);

-- ============================================================
-- 14. PAYMENTS (future expansion)
-- ============================================================
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  provider text default 'razorpay',
  payment_id text,
  amount numeric(10,2),
  status text default 'created',
  created_at timestamptz default now()
);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('offer-letters', 'offer-letters', false)
on conflict (id) do nothing;

-- ============================================================
-- DATABASE FUNCTIONS
-- ============================================================

-- Function: Atomically consume 1 credit
create or replace function consume_credit(p_user_profile_id uuid, p_feature text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_credit_row credits%rowtype;
begin
  select * into v_credit_row
  from credits
  where user_id = p_user_profile_id
  for update;

  if not found then
    return false;
  end if;

  if (v_credit_row.free_credits + v_credit_row.paid_credits) <= 0 then
    return false;
  end if;

  if v_credit_row.free_credits > 0 then
    update credits
    set free_credits = free_credits - 1,
        updated_at = now()
    where user_id = p_user_profile_id;
  else
    update credits
    set paid_credits = paid_credits - 1,
        updated_at = now()
    where user_id = p_user_profile_id;
  end if;

  insert into credit_transactions (user_id, type, amount, reason, reference)
  values (p_user_profile_id, 'deduction', -1, p_feature, 'ai_analysis');

  return true;
end;
$$;

-- Function: Refund 1 credit on failure
create or replace function refund_credit(p_user_profile_id uuid, p_feature text)
returns boolean
language plpgsql
security definer
as $$
begin
  update credits
  set free_credits = free_credits + 1,
      updated_at = now()
  where user_id = p_user_profile_id;

  if not found then
    return false;
  end if;

  insert into credit_transactions (user_id, type, amount, reason, reference)
  values (p_user_profile_id, 'refund', 1, 'Refund: ' || p_feature || ' failed', 'system_refund');

  return true;
end;
$$;

-- Function: Initialize credits for a new user profile
create or replace function initialize_credits(p_user_profile_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into credits (user_id, free_credits, paid_credits)
  values (p_user_profile_id, 2, 0)
  on conflict (user_id) do nothing;

  insert into credit_transactions (user_id, type, amount, reason, reference)
  values (p_user_profile_id, 'grant', 2, 'Welcome bonus: 2 free AI credits', 'signup');
end;
$$;

-- Function: Automatically create profile and role subprofile when auth.users is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
  v_profile_id uuid;
  v_skills text[];
begin
  -- 1. Determine role
  v_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if v_role not in ('student', 'tp', 'company') then
    v_role := 'student';
  end if;

  -- 2. Create or find profile
  insert into public.profiles (auth_user_id, role, email)
  values (new.id, v_role, coalesce(new.email, ''))
  on conflict (auth_user_id) do update
    set email = excluded.email,
        role = excluded.role,
        updated_at = now()
  returning id into v_profile_id;

  if v_profile_id is null then
    select id into v_profile_id from public.profiles where auth_user_id = new.id;
  end if;

  -- 3. Create role-specific subprofile
  if v_role = 'student' then
    v_skills := '{}';
    if new.raw_user_meta_data ? 'skills' then
      if jsonb_typeof(new.raw_user_meta_data->'skills') = 'array' then
        select coalesce(array_agg(elem::text), '{}')
        into v_skills
        from jsonb_array_elements_text(new.raw_user_meta_data->'skills') as elem;
      end if;
    end if;

    insert into public.student_profiles (
      profile_id,
      full_name,
      institute_name,
      department,
      graduation_year,
      address,
      phone,
      skills,
      discoverable,
      verification_status
    ) values (
      v_profile_id,
      coalesce(nullif(new.raw_user_meta_data->>'fullName', ''), split_part(coalesce(new.email, ''), '@', 1)),
      coalesce(new.raw_user_meta_data->>'institute', ''),
      coalesce(new.raw_user_meta_data->>'department', ''),
      case 
        when (new.raw_user_meta_data->>'graduationYear') ~ '^[0-9]+$' 
        then (new.raw_user_meta_data->>'graduationYear')::integer 
        else extract(year from now())::integer + 1 
      end,
      coalesce(new.raw_user_meta_data->>'address', ''),
      coalesce(new.raw_user_meta_data->>'phone', ''),
      coalesce(v_skills, '{}'),
      true,
      'pending'
    )
    on conflict (profile_id) do update
      set full_name = coalesce(nullif(excluded.full_name, ''), student_profiles.full_name),
          institute_name = case when excluded.institute_name <> '' then excluded.institute_name else student_profiles.institute_name end,
          department = case when excluded.department <> '' then excluded.department else student_profiles.department end,
          graduation_year = coalesce(excluded.graduation_year, student_profiles.graduation_year),
          phone = case when excluded.phone <> '' then excluded.phone else student_profiles.phone end,
          skills = case when array_length(excluded.skills, 1) > 0 then excluded.skills else student_profiles.skills end,
          updated_at = now();

  elsif v_role = 'tp' then
    insert into public.tp_profiles (
      profile_id,
      institution_name,
      institution_email,
      address,
      verification_status
    ) values (
      v_profile_id,
      coalesce(nullif(new.raw_user_meta_data->>'institutionName', ''), 'Training & Placement Cell'),
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data->>'address', ''),
      'pending'
    )
    on conflict (profile_id) do update
      set institution_name = coalesce(nullif(excluded.institution_name, ''), tp_profiles.institution_name),
          address = case when excluded.address <> '' then excluded.address else tp_profiles.address end,
          updated_at = now();

  elsif v_role = 'company' then
    insert into public.company_profiles (
      profile_id,
      company_name,
      company_email,
      industry,
      website,
      address,
      verification_status
    ) values (
      v_profile_id,
      coalesce(nullif(new.raw_user_meta_data->>'companyName', ''), split_part(coalesce(new.email, ''), '@', 1)),
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data->>'industry', ''),
      coalesce(new.raw_user_meta_data->>'website', ''),
      coalesce(new.raw_user_meta_data->>'address', ''),
      'pending'
    )
    on conflict (profile_id) do update
      set company_name = coalesce(nullif(excluded.company_name, ''), company_profiles.company_name),
          industry = case when excluded.industry <> '' then excluded.industry else company_profiles.industry end,
          website = case when excluded.website <> '' then excluded.website else company_profiles.website end,
          address = case when excluded.address <> '' then excluded.address else company_profiles.address end,
          updated_at = now();
  end if;

  -- 4. Initialize 2 free credits
  perform public.initialize_credits(v_profile_id);

  return new;
end;
$$;

-- Trigger: Automatically execute handle_new_user on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================
alter table profiles enable row level security;
alter table student_profiles enable row level security;
alter table tp_profiles enable row level security;
alter table company_profiles enable row level security;
alter table institutions enable row level security;
alter table resumes enable row level security;
alter table resume_analyses enable row level security;
alter table internship_offers enable row level security;
alter table offer_analyses enable row level security;
alter table internship_requirements enable row level security;
alter table student_company_matches enable row level security;
alter table credits enable row level security;
alter table credit_transactions enable row level security;
alter table payments enable row level security;

-- ============================================================
-- RLS POLICIES (with DROP IF EXISTS for safe re-runs)
-- ============================================================

-- --- PROFILES ---
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = auth_user_id);

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = auth_user_id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = auth_user_id);

-- --- INSTITUTIONS ---
drop policy if exists "institutions_select_all" on institutions;
create policy "institutions_select_all" on institutions
  for select using (auth.role() = 'authenticated');

-- --- STUDENT PROFILES ---
drop policy if exists "student_profiles_select_own" on student_profiles;
create policy "student_profiles_select_own" on student_profiles
  for select using (
    exists (select 1 from profiles where profiles.id = student_profiles.profile_id and profiles.auth_user_id = auth.uid())
  );

drop policy if exists "student_profiles_insert_own" on student_profiles;
create policy "student_profiles_insert_own" on student_profiles
  for insert with check (
    exists (select 1 from profiles where profiles.id = student_profiles.profile_id and profiles.auth_user_id = auth.uid())
  );

drop policy if exists "student_profiles_update_own" on student_profiles;
create policy "student_profiles_update_own" on student_profiles
  for update using (
    exists (select 1 from profiles where profiles.id = student_profiles.profile_id and profiles.auth_user_id = auth.uid())
  );

drop policy if exists "student_profiles_select_tp" on student_profiles;
create policy "student_profiles_select_tp" on student_profiles
  for select using (
    exists (
      select 1 from tp_profiles tp
      join profiles p on p.id = tp.profile_id
      where p.auth_user_id = auth.uid()
        and tp.institution_id is not null
        and tp.institution_id = student_profiles.institute_id
    )
  );

drop policy if exists "student_profiles_select_company" on student_profiles;
create policy "student_profiles_select_company" on student_profiles
  for select using (
    student_profiles.discoverable = true
    and exists (
      select 1 from profiles p
      where p.auth_user_id = auth.uid() and p.role = 'company'
    )
  );

-- --- T&P PROFILES ---
drop policy if exists "tp_profiles_select_own" on tp_profiles;
create policy "tp_profiles_select_own" on tp_profiles
  for select using (
    exists (select 1 from profiles where profiles.id = tp_profiles.profile_id and profiles.auth_user_id = auth.uid())
  );

drop policy if exists "tp_profiles_insert_own" on tp_profiles;
create policy "tp_profiles_insert_own" on tp_profiles
  for insert with check (
    exists (select 1 from profiles where profiles.id = tp_profiles.profile_id and profiles.auth_user_id = auth.uid())
  );

drop policy if exists "tp_profiles_update_own" on tp_profiles;
create policy "tp_profiles_update_own" on tp_profiles
  for update using (
    exists (select 1 from profiles where profiles.id = tp_profiles.profile_id and profiles.auth_user_id = auth.uid())
  );

-- --- COMPANY PROFILES ---
drop policy if exists "company_profiles_select_own" on company_profiles;
drop policy if exists "company_profiles_select_all" on company_profiles;
create policy "company_profiles_select_all" on company_profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "company_profiles_insert_own" on company_profiles;
create policy "company_profiles_insert_own" on company_profiles
  for insert with check (
    exists (select 1 from profiles where profiles.id = company_profiles.profile_id and profiles.auth_user_id = auth.uid())
  );

drop policy if exists "company_profiles_update_own" on company_profiles;
create policy "company_profiles_update_own" on company_profiles
  for update using (
    exists (select 1 from profiles where profiles.id = company_profiles.profile_id and profiles.auth_user_id = auth.uid())
  );

-- --- RESUMES ---
drop policy if exists "resumes_select_own" on resumes;
create policy "resumes_select_own" on resumes
  for select using (
    exists (
      select 1 from student_profiles sp
      join profiles p on p.id = sp.profile_id
      where sp.id = resumes.student_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "resumes_insert_own" on resumes;
create policy "resumes_insert_own" on resumes
  for insert with check (
    exists (
      select 1 from student_profiles sp
      join profiles p on p.id = sp.profile_id
      where sp.id = resumes.student_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "resumes_select_tp" on resumes;
create policy "resumes_select_tp" on resumes
  for select using (
    exists (
      select 1 from student_profiles sp
      join tp_profiles tp on tp.institution_id = sp.institute_id
      join profiles p on p.id = tp.profile_id
      where sp.id = resumes.student_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "resumes_select_company" on resumes;
create policy "resumes_select_company" on resumes
  for select using (
    exists (
      select 1 from student_profiles sp
      join profiles p on p.auth_user_id = auth.uid()
      where sp.id = resumes.student_id
        and sp.discoverable = true
        and p.role = 'company'
    )
  );

-- --- RESUME ANALYSES ---
drop policy if exists "resume_analyses_select_own" on resume_analyses;
create policy "resume_analyses_select_own" on resume_analyses
  for select using (
    exists (
      select 1 from student_profiles sp
      join profiles p on p.id = sp.profile_id
      where sp.id = resume_analyses.student_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "resume_analyses_select_tp" on resume_analyses;
create policy "resume_analyses_select_tp" on resume_analyses
  for select using (
    exists (
      select 1 from student_profiles sp
      join tp_profiles tp on tp.institution_id = sp.institute_id
      join profiles p on p.id = tp.profile_id
      where sp.id = resume_analyses.student_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "resume_analyses_select_company" on resume_analyses;
create policy "resume_analyses_select_company" on resume_analyses
  for select using (
    exists (
      select 1 from student_profiles sp
      join profiles p on p.auth_user_id = auth.uid()
      where sp.id = resume_analyses.student_id
        and sp.discoverable = true
        and p.role = 'company'
    )
  );

-- --- INTERNSHIP OFFERS ---
drop policy if exists "internship_offers_select_own" on internship_offers;
create policy "internship_offers_select_own" on internship_offers
  for select using (
    exists (
      select 1 from student_profiles sp
      join profiles p on p.id = sp.profile_id
      where sp.id = internship_offers.student_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "internship_offers_insert_own" on internship_offers;
create policy "internship_offers_insert_own" on internship_offers
  for insert with check (
    exists (
      select 1 from student_profiles sp
      join profiles p on p.id = sp.profile_id
      where sp.id = internship_offers.student_id and p.auth_user_id = auth.uid()
    )
  );

-- --- OFFER ANALYSES ---
drop policy if exists "offer_analyses_select_own" on offer_analyses;
create policy "offer_analyses_select_own" on offer_analyses
  for select using (
    exists (
      select 1 from student_profiles sp
      join profiles p on p.id = sp.profile_id
      where sp.id = offer_analyses.student_id and p.auth_user_id = auth.uid()
    )
  );

-- --- INTERNSHIP REQUIREMENTS ---
drop policy if exists "internship_requirements_select_own" on internship_requirements;
create policy "internship_requirements_select_own" on internship_requirements
  for select using (
    exists (
      select 1 from company_profiles cp
      join profiles p on p.id = cp.profile_id
      where cp.id = internship_requirements.company_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "internship_requirements_insert_own" on internship_requirements;
create policy "internship_requirements_insert_own" on internship_requirements
  for insert with check (
    exists (
      select 1 from company_profiles cp
      join profiles p on p.id = cp.profile_id
      where cp.id = internship_requirements.company_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "internship_requirements_update_own" on internship_requirements;
create policy "internship_requirements_update_own" on internship_requirements
  for update using (
    exists (
      select 1 from company_profiles cp
      join profiles p on p.id = cp.profile_id
      where cp.id = internship_requirements.company_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "internship_requirements_select_students" on internship_requirements;
create policy "internship_requirements_select_students" on internship_requirements
  for select using (
    internship_requirements.is_active = true
    and exists (select 1 from profiles p where p.auth_user_id = auth.uid() and p.role = 'student')
  );

-- --- STUDENT-COMPANY MATCHES ---
drop policy if exists "student_company_matches_select_company" on student_company_matches;
create policy "student_company_matches_select_company" on student_company_matches
  for select using (
    exists (
      select 1 from company_profiles cp
      join profiles p on p.id = cp.profile_id
      where cp.id = student_company_matches.company_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "student_company_matches_select_student" on student_company_matches;
create policy "student_company_matches_select_student" on student_company_matches
  for select using (
    exists (
      select 1 from student_profiles sp
      join profiles p on p.id = sp.profile_id
      where sp.id = student_company_matches.student_id and p.auth_user_id = auth.uid()
    )
  );

-- --- CREDITS ---
drop policy if exists "credits_select_own" on credits;
create policy "credits_select_own" on credits
  for select using (
    exists (select 1 from profiles p where p.id = credits.user_id and p.auth_user_id = auth.uid())
  );

-- --- CREDIT TRANSACTIONS ---
drop policy if exists "credit_transactions_select_own" on credit_transactions;
create policy "credit_transactions_select_own" on credit_transactions
  for select using (
    exists (select 1 from profiles p where p.id = credit_transactions.user_id and p.auth_user_id = auth.uid())
  );

-- --- PAYMENTS ---
drop policy if exists "payments_select_own" on payments;
create policy "payments_select_own" on payments
  for select using (
    exists (select 1 from profiles p where p.id = payments.user_id and p.auth_user_id = auth.uid())
  );

-- ============================================================
-- STORAGE POLICIES
-- ============================================================

drop policy if exists "resumes_upload_own" on storage.objects;
create policy "resumes_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'resumes'
    and auth.role() = 'authenticated'
  );

drop policy if exists "resumes_read_own" on storage.objects;
create policy "resumes_read_own" on storage.objects
  for select using (
    bucket_id = 'resumes'
    and auth.role() = 'authenticated'
  );

drop policy if exists "offer_letters_upload_own" on storage.objects;
create policy "offer_letters_upload_own" on storage.objects
  for insert with check (
    bucket_id = 'offer-letters'
    and auth.role() = 'authenticated'
  );

drop policy if exists "offer_letters_read_own" on storage.objects;
create policy "offer_letters_read_own" on storage.objects
  for select using (
    bucket_id = 'offer-letters'
    and auth.role() = 'authenticated'
  );
