import Link from 'next/link';
import { dayLabel, readHref } from '@/lib/read/config';
import type { SV } from '@/lib/read/view';
import Thumb from './Thumb';
import { k } from './k';

const when = (s: SV) => (s.kind === 'done' ? '완결' : s.kind === 'daily' ? `${s.days.map(dayLabel).join(' · ')}요일 연재` : '자유연재');

export function RankList({ list }: { list: SV[] }) {
  return (
    <ol className={k('rank')}>
      {list.map((s, i) => (
        <li key={s.id}><Link href={readHref(s.id)}><span className={k('n tnum')}>{i + 1}</span><span className={k('mini')}><Thumb s={s} w={120} h={180} /></span><span style={{ minWidth: 0 }}><b>{s.title}</b><small>{s.genre} · {s.author} · {when(s)}</small></span>{s.rating > 0 && <span className={k('r tnum')}>★ {s.rating.toFixed(2)}</span>}</Link></li>
      ))}
    </ol>
  );
}
