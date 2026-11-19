-- 운영 설정 · 공지 (관리자 화면에서 바꿔요)

create table if not exists webtoon.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references webtoon.profiles(id) on delete set null
);

create table if not exists webtoon.notices (
  id         bigint generated always as identity primary key,
  title      text not null,
  body       text,
  level      text not null default 'info' check (level in ('info','warn','event')),
  active     boolean not null default true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  link       text,
  created_at timestamptz not null default now()
);

-- 서버(서비스 키)만 읽고 써요 — 화면에는 서버가 골라서 보내요
alter table webtoon.app_settings enable row level security;
alter table webtoon.notices      enable row level security;
