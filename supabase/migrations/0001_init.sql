-- 웹툰보드 첫 스키마 — 회원 · 작품 · 그림 · AI 사용량 · 문의
-- Supabase SQL Editor에 통째로 붙여 넣어 실행하면 돼요.

-- ───────── 회원 프로필 (auth.users 1:1)
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  name          text,
  avatar_url    text,
  provider      text,                         -- email · google · kakao
  role          text not null default 'user' check (role in ('user','admin')),
  plan          text not null default 'free' check (plan in ('free','pro','edu')),
  status        text not null default 'active' check (status in ('active','suspended')),
  bonus_images  int  not null default 0,      -- 관리자가 더 준 이미지 장 수
  pro_notify    boolean not null default false,
  signup_source text,                         -- utm_source · 유입 채널
  memo          text,                         -- 관리자 메모
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz
);
create index if not exists profiles_created_idx on public.profiles(created_at desc);

-- 가입하면 프로필 자동 생성
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, avatar_url, provider, signup_source)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider','email'),
    new.raw_user_meta_data->>'signup_source'
  ) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── 작품 (본문 JSON은 Storage에 · 여기는 목록용 정보)
create table if not exists public.projects (
  id          text primary key,                -- 편집기가 만든 작품 id
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null default '새 작품',
  meta        jsonb not null default '{}',     -- 편집기 작품 목록 항목(회차 수 · 컷 수 · 즐겨찾기 …)
  data_path   text,                            -- storage: studio/{uid}/projects/{id}.json
  size_bytes  int not null default 0,
  episodes    int not null default 0,
  cuts        int not null default 0,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_owner_idx on public.projects(owner_id, updated_at desc);

-- ───────── 그림 (라이브러리 원본 · Storage 경로)
create table if not exists public.assets (
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  key        text not null,                    -- 편집기 blob 키
  path       text not null,
  bytes      int not null default 0,
  mime       text,
  created_at timestamptz not null default now(),
  primary key (owner_id, key)
);

-- ───────── AI 사용 기록 (한도 · 비용 통계)
create table if not exists public.ai_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('text','image')),
  model      text,
  units      int  not null default 1,          -- 글 1회 · 이미지 장 수
  in_tokens  int,
  out_tokens int,
  cost_krw   numeric(12,2) not null default 0,
  ok         boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on public.ai_usage(user_id, created_at desc);
create index if not exists ai_usage_time_idx on public.ai_usage(created_at desc);

-- ───────── 문의
create table if not exists public.inquiries (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles(id) on delete set null,
  email       text,
  subject     text not null,
  body        text not null,
  status      text not null default 'open' check (status in ('open','answered','closed')),
  answer      text,
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ───────── 관리자 확인
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ───────── RLS
alter table public.profiles  enable row level security;
alter table public.projects  enable row level security;
alter table public.assets    enable row level security;
alter table public.ai_usage  enable row level security;
alter table public.inquiries enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "own profile name" on public.profiles;
create policy "own profile name" on public.profiles for update using (id = auth.uid());
-- 본인은 이름 · 사진 · 알림 신청만 바꿀 수 있어요 (등급 · 권한은 서버에서만)
create or replace function public.profiles_guard() returns trigger language plpgsql set search_path = public as $$
begin
  -- 회원 본인이 고칠 때만 막아요 (서버 서비스 키 · 관리자는 통과)
  if auth.uid() is not null and auth.uid() = old.id and not public.is_admin() then
    new.role := old.role; new.plan := old.plan; new.status := old.status;
    new.bonus_images := old.bonus_images; new.memo := old.memo; new.email := old.email;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "own assets" on public.assets;
create policy "own assets" on public.assets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "own usage read" on public.ai_usage;
create policy "own usage read" on public.ai_usage for select using (user_id = auth.uid());
drop policy if exists "own inquiries" on public.inquiries;
create policy "own inquiries" on public.inquiries for select using (user_id = auth.uid());
drop policy if exists "write inquiry" on public.inquiries;
create policy "write inquiry" on public.inquiries for insert with check (user_id = auth.uid());

-- ───────── Storage: 비공개 버킷 studio/{uid}/…
insert into storage.buckets (id, name, public) values ('studio','studio', false)
  on conflict (id) do nothing;

drop policy if exists "studio own read"   on storage.objects;
drop policy if exists "studio own write"  on storage.objects;
drop policy if exists "studio own update" on storage.objects;
drop policy if exists "studio own delete" on storage.objects;
create policy "studio own read"   on storage.objects for select using (bucket_id = 'studio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "studio own write"  on storage.objects for insert with check (bucket_id = 'studio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "studio own update" on storage.objects for update using (bucket_id = 'studio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "studio own delete" on storage.objects for delete using (bucket_id = 'studio' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────── 이번 달 사용량 (한도 확인용)
create or replace view public.usage_month with (security_invoker = true) as
  select user_id,
         coalesce(sum(units) filter (where kind='text'  and ok), 0)::int as text_used,
         coalesce(sum(units) filter (where kind='image' and ok), 0)::int as image_used
  from public.ai_usage
  where created_at >= date_trunc('month', now())
  group by user_id;

-- 무료 이미지는 "가입 선물"이라 누적으로 세요
create or replace view public.usage_total with (security_invoker = true) as
  select user_id, coalesce(sum(units) filter (where kind='image' and ok), 0)::int as image_used_total
  from public.ai_usage group by user_id;
