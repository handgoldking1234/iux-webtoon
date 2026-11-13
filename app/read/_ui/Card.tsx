import Link from 'next/link';
import { readHref } from '@/lib/read/config';
import type { SV } from '@/lib/read/view';
import Thumb from './Thumb';
import { k } from './k';

export default function Card({ s }: { s: SV }) {
  return (
    <Link className={k('card')} href={readHref(s.id)}>
      <div className={k('th')}>
        <Thumb s={s} w={300} h={400} />
        <div className={k('badges')}>{s.up && <span className={k('bd up')}>UP</span>}{s.isNew && s.kind === 'free' && <span className={k('bd new')}>신작</span>}{s.ai && <span className={k('bd ai')}>AI 활용</span>}</div>
      </div>
      <b>{s.title}</b>
      <span className={k('meta')}>{s.rating ? <span className={k('star tnum')}>★ {s.rating.toFixed(2)}</span> : <span className={k('star')}>새 작품</span>}<span>{s.author}</span></span>
    </Link>
  );
}
