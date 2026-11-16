import { todayKey } from '@/lib/read/config';
import { homeData } from '@/lib/read/store';
import { sv } from '@/lib/read/view';
import DayTabs from '../_ui/DayTabs';
import { k } from '../_ui/k';

export const dynamic = 'force-dynamic';
export const metadata = { title: '요일연재' };
const KO: Record<string, string> = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };

export default async function Daily({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const q = await searchParams, today = todayKey();
  const all = (await homeData()).all.map(sv);
  return (
    <div className={k('wrap')}>
      <div className={k('page-h')}><h1>요일연재</h1><p>오늘은 {KO[today]}요일이에요</p></div>
      <DayTabs all={all} today={today} initial={q.day} />
    </div>
  );
}
