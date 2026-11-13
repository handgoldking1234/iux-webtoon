import Link from 'next/link';
import { readHref } from '@/lib/read/config';
import type { SV } from '@/lib/read/view';
import Thumb from './Thumb';
import { k } from './k';

export function RankList({ list, wide }: { list: SV[]; wide?: boolean }) {
  return (
    <ol className={k(`rank ${wide ? 'rank-wide' : ''}`)}>
      {list.map((s, i) => (
        <li key={s.id}><Link href={readHref(s.id)}><span className={k('n tnum')}>{i + 1}</span><span className={k('mini')}><Thumb s={s} w={88} h={118} /></span><span style={{ minWidth: 0 }}><b>{s.title}</b><small>{s.genre}{s.rating ? ` · ★ ${s.rating.toFixed(2)}` : ''}</small></span></Link></li>
      ))}
    </ol>
  );
}
