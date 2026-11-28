-- 연재 관리: 휴지통(지운 시각) · 작가가 잠깐 숨기기
alter table webtoon.read_series   add column if not exists deleted_at timestamptz;          -- 휴지통에 넣은 시각 (30일 뒤 완전히 지워요)
alter table webtoon.read_series   add column if not exists paused boolean not null default false; -- 작가가 잠깐 숨김
alter table webtoon.read_episodes add column if not exists deleted_at timestamptz;

drop policy if exists "read series public" on webtoon.read_series;
create policy "read series public" on webtoon.read_series for select
  using ((not hidden and not paused and deleted_at is null) or author_id = auth.uid());
drop policy if exists "read episodes public" on webtoon.read_episodes;
create policy "read episodes public" on webtoon.read_episodes for select
  using (status = 'public' and publish_at <= now() and deleted_at is null
    and exists (select 1 from webtoon.read_series s where s.id = series_id and not s.hidden and not s.paused and s.deleted_at is null));
