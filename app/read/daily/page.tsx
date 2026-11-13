import Link from 'next/link';
import { DAYS, readHref, todayKey } from '@/lib/read/config';
import { listByDay } from '@/lib/read/store';
import { sv } from '@/lib/read/view';
import Card from '../_ui/Card';
import { k } from '../_ui/k';

export const dynamic = 'force-dynamic';
export const metadata = { title: '요일연재' };

export default async function Daily({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const q = await searchParams, today = todayKey();
  const day = q.day && (DAYS.some((d) => d[0] === q.day) || q.day === 'done') ? q.day : today;
  const L = (await listByDay(day)).map(sv);
  return (
    <div className={k('wrap')} style={{ paddingBlock: '24px 10px' }}>
      <div className={k('sec-h')}><h2>요일연재</h2><span className={k('muted')} style={{ fontSize: 13 }}>별점 높은 순</span></div>
      <nav className={k('days')} aria-label="요일">
        {[...DAYS, ['done', '완결'] as const].map(([d, l]) => <Link key={d} href={readHref(`daily?day=${d}`)} className={day === d ? k('on') : undefined} aria-current={day === d ? 'page' : undefined}>{l}{d === today && <span className={k('today')}>오늘</span>}</Link>)}
      </nav>
      {L.length ? <div className={k('grid')}>{L.map((s) => <Card key={s.id} s={s} />)}</div> : <p className={k('empty')}>이 요일에는 아직 연재 작품이 없어요</p>}
    </div>
  );
}
