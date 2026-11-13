-- 웹툰보드 첫 스키마 — 회원 · 작품 · 그림 · AI 사용량 · 문의
-- Supabase SQL Editor에 통째로 붙여 넣어 실행하면 돼요.
--
-- 모든 테이블은 'webtoon' 구역(스키마)에 만들어요.
--  · 새 Supabase 프로젝트든, 여러 서비스가 함께 쓰는 프로젝트(iux-cloud)든 그대로 돌아가요.
--  · 다른 서비스 테이블과 섞이지 않고, 나중에 이 구역만 통째로 옮길 수 있어요.
--  · 실행한 뒤 Supabase › Project Settings › API › Exposed schemas 에 webtoon 을 추가해 주세요.

create schema if not exists webtoon;
grant usage on schema webtoon to anon, authenticated, service_role;
alter default privileges in schema webtoon grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema webtoon grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema webtoon grant execute on functions to anon, authenticated, service_role;

-- ───────── 회원 프로필 (auth.users 1:1)
create table if not exists webtoon.profiles (
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
create index if not exists profiles_created_idx on webtoon.profiles(created_at desc);

-- 프로필은 회원이 웹툰보드에 처음 들어올 때 서버가 만들어요 (lib/auth.ts).
-- auth.users 트리거를 쓰지 않는 이유: 공용 프로젝트에서 다른 서비스 가입자까지 웹툰보드 회원이 되지 않게.

-- ───────── 작품 (본문 JSON은 Storage에 · 여기는 목록용 정보)
create table if not exists webtoon.projects (
  id          text primary key,                -- 편집기가 만든 작품 id
  owner_id    uuid not null references webtoon.profiles(id) on delete cascade,
  title       text not null default '새 작품',
  meta        jsonb not null default '{}',     -- 편집기 작품 목록 항목(회차 수 · 컷 수 · 즐겨찾기 …)
  data_path   text,                            -- storage: webtoon/{uid}/projects/{id}.json
  size_bytes  int not null default 0,
  episodes    int not null default 0,
  cuts        int not null default 0,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_owner_idx on webtoon.projects(owner_id, updated_at desc);

-- ───────── 그림 (라이브러리 원본 · Storage 경로)
create table if not exists webtoon.assets (
  owner_id   uuid not null references webtoon.profiles(id) on delete cascade,
  key        text not null,                    -- 편집기 blob 키
  path       text not null,
  bytes      int not null default 0,
  mime       text,
  created_at timestamptz not null default now(),
  primary key (owner_id, key)
);

-- ───────── AI 사용 기록 (한도 · 비용 통계)
create table if not exists webtoon.ai_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references webtoon.profiles(id) on delete cascade,
  kind       text not null check (kind in ('text','image')),
  model      text,
  units      int  not null default 1,          -- 글 1회 · 이미지 장 수
  in_tokens  int,
  out_tokens int,
  cost_krw   numeric(12,2) not null default 0,
  ok         boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on webtoon.ai_usage(user_id, created_at desc);
create index if not exists ai_usage_time_idx on webtoon.ai_usage(created_at desc);

-- ───────── 문의
create table if not exists webtoon.inquiries (
  id          bigint generated always as identity primary key,
  user_id     uuid references webtoon.profiles(id) on delete set null,
  email       text,
  subject     text not null,
  body        text not null,
  status      text not null default 'open' check (status in ('open','answered','closed')),
  answer      text,
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);

-- ───────── 관리자 확인
create or replace function webtoon.is_admin() returns boolean
language sql stable security definer set search_path = webtoon as $$
  select exists(select 1 from webtoon.profiles where id = auth.uid() and role = 'admin');
$$;

-- ───────── RLS
alter table webtoon.profiles  enable row level security;
alter table webtoon.projects  enable row level security;
alter table webtoon.assets    enable row level security;
alter table webtoon.ai_usage  enable row level security;
alter table webtoon.inquiries enable row level security;

drop policy if exists "own profile read" on webtoon.profiles;
create policy "own profile read" on webtoon.profiles for select using (id = auth.uid() or webtoon.is_admin());
drop policy if exists "own profile name" on webtoon.profiles;
create policy "own profile name" on webtoon.profiles for update using (id = auth.uid());
-- 본인은 이름 · 사진 · 알림 신청만 바꿀 수 있어요 (등급 · 권한은 서버에서만)
create or replace function webtoon.profiles_guard() returns trigger language plpgsql set search_path = webtoon as $$
begin
  -- 회원 본인이 고칠 때만 막아요 (서버 서비스 키 · 관리자는 통과)
  if auth.uid() is not null and auth.uid() = old.id and not webtoon.is_admin() then
    new.role := old.role; new.plan := old.plan; new.status := old.status;
    new.bonus_images := old.bonus_images; new.memo := old.memo; new.email := old.email;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on webtoon.profiles;
create trigger profiles_guard before update on webtoon.profiles for each row execute function webtoon.profiles_guard();

drop policy if exists "own projects" on webtoon.projects;
create policy "own projects" on webtoon.projects for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "own assets" on webtoon.assets;
create policy "own assets" on webtoon.assets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "own usage read" on webtoon.ai_usage;
create policy "own usage read" on webtoon.ai_usage for select using (user_id = auth.uid());
drop policy if exists "own inquiries" on webtoon.inquiries;
create policy "own inquiries" on webtoon.inquiries for select using (user_id = auth.uid());
drop policy if exists "write inquiry" on webtoon.inquiries;
create policy "write inquiry" on webtoon.inquiries for insert with check (user_id = auth.uid());

-- ───────── Storage: 비공개 버킷 webtoon/{uid}/… (공용 프로젝트에서도 이름이 겹치지 않게)
insert into storage.buckets (id, name, public) values ('webtoon','webtoon', false)
  on conflict (id) do nothing;

drop policy if exists "webtoon own read"   on storage.objects;
drop policy if exists "webtoon own write"  on storage.objects;
drop policy if exists "webtoon own update" on storage.objects;
drop policy if exists "webtoon own delete" on storage.objects;
create policy "webtoon own read"   on storage.objects for select using (bucket_id = 'webtoon' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "webtoon own write"  on storage.objects for insert with check (bucket_id = 'webtoon' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "webtoon own update" on storage.objects for update using (bucket_id = 'webtoon' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "webtoon own delete" on storage.objects for delete using (bucket_id = 'webtoon' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────── 이번 달 사용량 (한도 확인용)
create or replace view webtoon.usage_month with (security_invoker = true) as
  select user_id,
         coalesce(sum(units) filter (where kind='text'  and ok), 0)::int as text_used,
         coalesce(sum(units) filter (where kind='image' and ok), 0)::int as image_used
  from webtoon.ai_usage
  where created_at >= date_trunc('month', now())
  group by user_id;

-- 무료 이미지는 "가입 선물"이라 누적으로 세요
create or replace view webtoon.usage_total with (security_invoker = true) as
  select user_id, coalesce(sum(units) filter (where kind='image' and ok), 0)::int as image_used_total
  from webtoon.ai_usage group by user_id;
