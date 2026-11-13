import { ranking } from '@/lib/read/store';
import { sv } from '@/lib/read/view';
import { RankList } from '../_ui/RankList';
import { k } from '../_ui/k';

export const dynamic = 'force-dynamic';
export const metadata = { title: '랭킹' };

export default async function Rank() {
  const L = (await ranking(30)).map(sv);
  return (
    <div className={k('wrap')} style={{ paddingBlock: '24px 10px', maxWidth: 960 }}>
      <div className={k('sec-h')}><h2>실시간 랭킹</h2><span className={k('muted')} style={{ fontSize: 13 }}>별점 · 관심 · 조회 기준</span></div>
      <div className={k('box')}><RankList list={L} wide /></div>
    </div>
  );
}
