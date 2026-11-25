-- 바로웹툰에 처음 들어온 회원이 자기 프로필(일반 회원 · 무료 · 보너스 0)을 직접 만들 수 있게
-- (서비스 키가 없어도 새 회원 작품이 저장되도록 · 2026-11-26)
create policy "own profile create" on webtoon.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and role = 'user' and plan = 'free' and status = 'active'
    and bonus_images = 0 and pro_notify = false and memo is null
  );
