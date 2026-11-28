-- AI 사용 기록에 작품 · 회차 · 컷 · 작업 종류를 같이 남겨요 (관리자 › AI 사용 › 작품 · 회차별 내역)
alter table webtoon.ai_usage
  add column if not exists project_id text,
  add column if not exists project_title text,
  add column if not exists ep_no int,
  add column if not exists ep_title text,
  add column if not exists ep_cuts int,
  add column if not exists cut_no int,
  add column if not exists task text,
  add column if not exists note text;
create index if not exists ai_usage_project_idx on webtoon.ai_usage(project_id, created_at desc);
