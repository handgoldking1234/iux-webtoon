import Link from 'next/link';
import { readHref, todayKey } from '@/lib/read/config';
import { homeData } from '@/lib/read/store';
import { sv, type SV } from '@/lib/read/view';
import Card, { TopCard } from './_ui/Card';
import DayTabs from './_ui/DayTabs';
import Hero from './_ui/Hero';
import Rail from './_ui/Rail';
import { k } from './_ui/k';

export const dynamic = 'force-dynamic';

export default async function ReadHome() {
  const d = await homeData();
  const all = d.all.map(sv), rank = d.ranking.map(sv);
  const byRate = (L: SV[]) => L.slice().sort((a, b) => b.rating - a.rating);
  const G = (...g: string[]) => byRate(all.filter((s) => g.includes(s.genre)));
  const hero = rank.filter((s) => s.kind !== 'done').slice(0, 3);
  // 주제별 줄은 작품이 4편 넘게 모였을 때만 보여요 (작품이 적을 때 같은 작품이 줄마다 되풀이되지 않게)
  const themed: [string, string, SV[]][] = ([
    ['불 끄고 보는 이야기', '스릴러 · 미스터리 · 액션', G('스릴러', '미스터리', '액션')],
    ['가볍게 웃고 싶을 때', '개그 · 일상', G('개그', '일상')],
    ['다른 세계로', '판타지 · 로맨스 · 드라마', G('판타지', '로맨스', '드라마', '스포츠')],
  ] as [string, string, SV[]][]).filter((r) => r[2].length >= 4);
  const done = d.done.map(sv);
  return (
    <div className={k('wrap')}>
      <Hero list={hero.length ? hero : rank.slice(0, 1)} />
      {rank.length >= 3 && <Rail title="오늘의 TOP 10" sub="별점 · 관심 · 조회 기준" more="rank" kind="top">{rank.slice(0, 10).map((s, i) => <TopCard key={s.id} s={s} n={i + 1} />)}</Rail>}
      <section className={k('tt')} aria-label="연재 시간표"><DayTabs all={all} today={todayKey()} /></section>
      {d.free.length ? <Rail title="자유연재 새 작품" sub="누구나 올리는 곳" more="free">{d.free.slice(0, 14).map((s) => <Card key={s.id} s={sv(s)} />)}</Rail> : null}
      {themed.map(([t, sub, L]) => <Rail key={t} title={t} sub={sub}>{L.slice(0, 14).map((s) => <Card key={s.id} s={s} />)}</Rail>)}
      {done.length ? <Rail title="완결까지 한 번에" sub="기다릴 필요 없는 완결작">{byRate(done).slice(0, 14).map((s) => <Card key={s.id} s={s} />)}</Rail> : null}
      <section className={k('band')}>
        <div><h3>내 웹툰도 여기에</h3><p>웹툰보드에서 만든 회차는 「연재하기」 한 번으로 바로 올라가요. 자유연재로 시작해서 관심과 별점이 모이면 요일연재 후보가 돼요.</p></div>
        <div className={k('acts')}><Link className={k('btn big go')} href={readHref('publish')}>연재하기</Link><a className={k('btn big glass')} href="/studio">웹툰 만들기</a></div>
      </section>
    </div>
  );
}
