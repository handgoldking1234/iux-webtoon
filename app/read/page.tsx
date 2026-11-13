import Link from 'next/link';
import { DAY_KEYS, readHref, todayKey } from '@/lib/read/config';
import { homeData } from '@/lib/read/store';
import { sv, type SV } from '@/lib/read/view';
import Card from './_ui/Card';
import DayTabs from './_ui/DayTabs';
import { Ic } from './_ui/Icons';
import Thumb from './_ui/Thumb';
import { k } from './_ui/k';
import { RankList } from './_ui/RankList';

export const dynamic = 'force-dynamic';

export default async function ReadHome() {
  const d = await homeData();
  const bucket: Record<string, SV[]> = {};
  for (const day of DAY_KEYS) bucket[day] = d.daily.filter((s) => s.days.includes(day)).map(sv).sort((a, b) => b.rating - a.rating);
  bucket.done = d.done.map(sv);
  const f = d.featured ? sv(d.featured) : null;
  return (
    <div className={k('wrap')}>
      {f && (
        <section className={k('feature')} aria-label="오늘의 추천">
          <div className={k('art')}><Thumb s={f} w={900} h={560} noTitle alt={`${f.title} 대표 그림`} /></div>
          <div className={k('txt')}>
            <span className={k('tag')}>오늘의 추천{f.days.length ? ` · 매주 ${f.days.map((x) => ({ mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' })[x as 'mon']).join('·')}요일` : ''}</span>
            <h2>{f.title}</h2>
            <p>{f.description}</p>
            <div className={k('acts')}><Link className={k('btn go')} href={readHref(`${f.id}/1`)}>첫 화 보기</Link><Link className={k('btn')} href={readHref(f.id)}>작품 보기</Link></div>
          </div>
        </section>
      )}
      <div className={k('layout')}>
        <div>
          <div className={k('sec-h')}><h2>요일연재</h2><Link href={readHref('daily')}>전체 보기</Link></div>
          <DayTabs bucket={bucket} today={todayKey()} />
          <div className={k('sec-h')} style={{ marginTop: 34 }}><h2>자유연재 새 작품</h2><Link href={readHref('free')}>전체 보기</Link></div>
          {d.free.length ? <div className={k('grid swipe')}>{d.free.slice(0, 10).map((s) => <Card key={s.id} s={sv(s)} />)}</div> : <p className={k('empty')}>아직 자유연재 작품이 없어요. 첫 작품을 올려 보세요.</p>}
          <p className={k('notice')}><Ic n="info" />자유연재는 누구나 올릴 수 있어요. 관심과 별점이 많이 모이면 요일연재 추천 후보가 돼요.</p>
        </div>
        <aside className={k('side')}>
          <div className={k('box')}><div className={k('sec-h')} style={{ marginBottom: 6 }}><h2 style={{ fontSize: 17 }}>실시간 랭킹</h2><Link href={readHref('rank')}>더 보기</Link></div><RankList list={d.ranking.slice(0, 8).map(sv)} /></div>
          <div className={k('box make')}><h3>내 웹툰도 여기에</h3><p>웹툰보드에서 만든 회차는 「연재하기」 한 번으로 바로 올라가요. 파일을 따로 내보낼 필요가 없어요.</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link className={k('btn go')} href={readHref('publish')}>연재하기</Link><a className={k('btn')} href="/studio">웹툰 만들기</a></div></div>
        </aside>
      </div>
    </div>
  );
}
