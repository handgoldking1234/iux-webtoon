import { ranking } from '@/lib/read/store';
import { sv } from '@/lib/read/view';
import { RankList } from '../_ui/RankList';
import { k } from '../_ui/k';

export const dynamic = 'force-dynamic';
export const metadata = { title: '랭킹' };

export default async function Rank() {
  const L = (await ranking(30)).map(sv);
  return (
    <div className={k('wrap')} style={{ maxWidth: 960 }}>
      <div className={k('page-h')}><h1>실시간 랭킹</h1><p>별점 · 관심 · 조회 기준</p></div>
      {L.length ? <RankList list={L} /> : <p className={k('empty')}>아직 순위에 오른 작품이 없어요</p>}
    </div>
  );
}
