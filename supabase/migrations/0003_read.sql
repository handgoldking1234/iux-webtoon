-- 연재관(/read) — 작품 · 회차 · 별점 · 댓글 · 관심 · 신고 · 연재하기 초안
-- 0001 · 0002 다음에 실행해요.
--
-- 떼어 내기 쉽게: 연재관 테이블은 모두 read_ 로 시작하고, 편집기 테이블(projects · assets …)을
-- 참조하지 않아요. 회원과는 auth.users 의 id 로만 이어져요. 작가 이름은 연재할 때 적은 필명을 그대로 저장해요.
-- 쓰기는 모두 서버(서비스 키)가 해요. 아래 RLS는 공개된 것만 누구나 읽게 열어 둔 거예요.

-- ───────── 작품
create table if not exists webtoon.read_series (
  id            text primary key,                         -- 주소에 쓰는 짧은 id (/read/{id})
  author_id     uuid not null references auth.users(id) on delete cascade,
  author_name   text not null,                            -- 필명
  title         text not null,
  description   text not null default '',
  genre         text not null default '기타',
  age           text not null default 'all' check (age in ('all','12','15','19')),
  ai            boolean not null default false,           -- AI 활용 표시
  kind          text not null default 'free' check (kind in ('free','daily','done')),   -- 자유연재 · 요일연재 · 완결
  days          text[] not null default '{}',             -- mon … sun
  review        text not null default 'none' check (review in ('none','pending','approved','rejected')), -- 요일연재 심사
  review_note   text,
  hidden        boolean not null default false,           -- 운영 숨김
  thumb_path    text,
  source_project text,                                    -- 편집기 작품 id (느슨한 연결, 외래키 없음)
  episodes      int not null default 0,
  follows       int not null default 0,
  views         bigint not null default 0,
  rating_sum    bigint not null default 0,
  rating_count  int not null default 0,
  last_episode_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists read_series_kind_idx on webtoon.read_series(kind, hidden, last_episode_at desc);
create index if not exists read_series_author_idx on webtoon.read_series(author_id);

-- ───────── 회차
create table if not exists webtoon.read_episodes (
  id            bigint generated always as identity primary key,
  series_id     text not null references webtoon.read_series(id) on delete cascade,
  no            int not null,                             -- 1화, 2화 …
  title         text not null,
  author_note   text,
  cuts          jsonb not null default '[]',              -- [{path,w,h}] 위에서 아래로
  thumb_path    text,
  ai            boolean not null default false,
  status        text not null default 'public' check (status in ('public','scheduled','hidden')),
  publish_at    timestamptz not null default now(),       -- 예약 공개
  views         bigint not null default 0,
  rating_sum    bigint not null default 0,
  rating_count  int not null default 0,
  comments      int not null default 0,
  created_at    timestamptz not null default now(),
  unique (series_id, no)
);
create index if not exists read_episodes_series_idx on webtoon.read_episodes(series_id, no desc);

-- ───────── 별점 (1~10) · 관심 · 댓글 · 좋아요 · 신고
create table if not exists webtoon.read_ratings (
  episode_id bigint not null references webtoon.read_episodes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  score      int not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (episode_id, user_id)
);
create table if not exists webtoon.read_follows (
  series_id  text not null references webtoon.read_series(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (series_id, user_id)
);
create table if not exists webtoon.read_comments (
  id         bigint generated always as identity primary key,
  episode_id bigint not null references webtoon.read_episodes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  nickname   text not null,
  body       text not null check (char_length(body) between 1 and 500),
  likes      int not null default 0,
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists read_comments_ep_idx on webtoon.read_comments(episode_id, created_at desc);
create table if not exists webtoon.read_comment_likes (
  comment_id bigint not null references webtoon.read_comments(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  primary key (comment_id, user_id)
);
create table if not exists webtoon.read_reports (
  id          bigint generated always as identity primary key,
  target_type text not null check (target_type in ('series','episode','comment')),
  target_id   text not null,
  user_id     uuid references auth.users(id) on delete set null,
  reason      text not null,
  status      text not null default 'open' check (status in ('open','done','dismissed')),
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists read_reports_open_idx on webtoon.read_reports(status, created_at desc);

-- ───────── 연재하기 초안 — 편집기가 그림을 올려 두고, 연재하기 화면에서 정보를 채워 공개해요
create table if not exists webtoon.read_drafts (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  source      jsonb not null default '{}',   -- {project, workTitle, logline, genre, ep:{num,title,syn}}
  cuts        jsonb not null default '[]',   -- [{path,w,h}]
  ai          boolean not null default false,
  ready       boolean not null default false, -- 그림을 다 올렸으면 true
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ───────── 조회수 (로그인 안 해도 +1) — 서버가 불러요
create or replace function webtoon.read_add_view(ep bigint) returns void
language sql security definer set search_path = webtoon as $$
  update webtoon.read_episodes set views = views + 1 where id = ep;
  update webtoon.read_series set views = views + 1 where id = (select series_id from webtoon.read_episodes where id = ep);
$$;

-- ───────── 별점 · 관심 · 댓글 · 좋아요 — 합계를 한 번에 맞게 고쳐요 (서버만 불러요)
create or replace function webtoon.read_rate(ep bigint, uid uuid, sc int) returns void
language plpgsql security definer set search_path = webtoon as $$
declare prev int; sid text;
begin
  select score into prev from webtoon.read_ratings where episode_id = ep and user_id = uid;
  insert into webtoon.read_ratings (episode_id, user_id, score) values (ep, uid, sc)
    on conflict (episode_id, user_id) do update set score = excluded.score, created_at = now();
  select series_id into sid from webtoon.read_episodes where id = ep;
  update webtoon.read_episodes set rating_sum = rating_sum + sc - coalesce(prev, 0), rating_count = rating_count + (case when prev is null then 1 else 0 end) where id = ep;
  update webtoon.read_series   set rating_sum = rating_sum + sc - coalesce(prev, 0), rating_count = rating_count + (case when prev is null then 1 else 0 end) where id = sid;
end $$;

create or replace function webtoon.read_follow(sid text, uid uuid, on_ boolean) returns int
language plpgsql security definer set search_path = webtoon as $$
declare n int;
begin
  if on_ then insert into webtoon.read_follows (series_id, user_id) values (sid, uid) on conflict do nothing;
  else delete from webtoon.read_follows where series_id = sid and user_id = uid; end if;
  select count(*) into n from webtoon.read_follows where series_id = sid;
  update webtoon.read_series set follows = n where id = sid;
  return n;
end $$;

create or replace function webtoon.read_add_comment(ep bigint, uid uuid, nick text, txt text) returns bigint
language plpgsql security definer set search_path = webtoon as $$
declare cid bigint;
begin
  insert into webtoon.read_comments (episode_id, user_id, nickname, body) values (ep, uid, nick, txt) returning id into cid;
  update webtoon.read_episodes set comments = comments + 1 where id = ep;
  return cid;
end $$;

create or replace function webtoon.read_like_comment(cid bigint, uid uuid) returns int
language plpgsql security definer set search_path = webtoon as $$
declare n int;
begin
  insert into webtoon.read_comment_likes (comment_id, user_id) values (cid, uid) on conflict do nothing;
  select count(*) into n from webtoon.read_comment_likes where comment_id = cid;
  update webtoon.read_comments set likes = n where id = cid;
  return n;
end $$;

-- 서버(서비스 키)만 부를 수 있게
revoke execute on function webtoon.read_rate(bigint, uuid, int), webtoon.read_follow(text, uuid, boolean), webtoon.read_add_comment(bigint, uuid, text, text), webtoon.read_like_comment(bigint, uuid), webtoon.read_add_view(bigint) from anon, authenticated, public;

-- ───────── RLS — 공개된 것만 누구나 읽기, 쓰기는 서버만
alter table webtoon.read_series        enable row level security;
alter table webtoon.read_episodes      enable row level security;
alter table webtoon.read_ratings       enable row level security;
alter table webtoon.read_follows       enable row level security;
alter table webtoon.read_comments      enable row level security;
alter table webtoon.read_comment_likes enable row level security;
alter table webtoon.read_reports       enable row level security;
alter table webtoon.read_drafts        enable row level security;

drop policy if exists "read series public" on webtoon.read_series;
create policy "read series public" on webtoon.read_series for select using (not hidden or author_id = auth.uid());
drop policy if exists "read episodes public" on webtoon.read_episodes;
create policy "read episodes public" on webtoon.read_episodes for select
  using (status = 'public' and publish_at <= now() and exists (select 1 from webtoon.read_series s where s.id = series_id and not s.hidden));
drop policy if exists "read comments public" on webtoon.read_comments;
create policy "read comments public" on webtoon.read_comments for select using (not hidden);
drop policy if exists "read own follows" on webtoon.read_follows;
create policy "read own follows" on webtoon.read_follows for select using (user_id = auth.uid());
drop policy if exists "read own ratings" on webtoon.read_ratings;
create policy "read own ratings" on webtoon.read_ratings for select using (user_id = auth.uid());

-- ───────── 연재 그림 버킷 (공개 읽기) — R2_PUBLIC_URL 을 쓰면 이 버킷은 비어 있어요
insert into storage.buckets (id, name, public) values ('webtoon-read','webtoon-read', true)
  on conflict (id) do nothing;
