import Link from 'next/link';
import { readHref } from '@/lib/read/config';
import { listFree } from '@/lib/read/store';
import { sv } from '@/lib/read/view';
import Card from '../_ui/Card';
import { Ic } from '../_ui/Icons';
import { k } from '../_ui/k';

export const dynamic = 'force-dynamic';
export const metadata = { title: '자유연재' };

export default async function Free({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const sort = (await searchParams).sort === 'rate' ? 'rate' : 'new';
  const L = (await listFree(sort)).map(sv);
  return (
    <div className={k('wrap')} style={{ paddingBlock: '24px 10px' }}>
      <div className={k('sec-h')}><h2>자유연재</h2></div>
      <nav className={k('tabs2')} aria-label="정렬">
        <Link href={readHref('free')} className={sort === 'new' ? k('on') : undefined}>최신 업데이트</Link>
        <Link href={readHref('free?sort=rate')} className={sort === 'rate' ? k('on') : undefined}>별점순</Link>
      </nav>
      {L.length ? <div className={k('grid')}>{L.map((s) => <Card key={s.id} s={s} />)}</div> : <p className={k('empty')}>아직 자유연재 작품이 없어요</p>}
      <p className={k('notice')}><Ic n="info" />운영정책에 맞지 않는 작품은 신고를 받아 숨김 처리될 수 있어요.</p>
    </div>
  );
}
