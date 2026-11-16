import Link from 'next/link';
import { readHref } from '@/lib/read/config';
import type { SV } from '@/lib/read/view';
import Thumb from './Thumb';
import { k } from './k';

/** 포스터 카드 — 제목은 그림 위에, 아래에는 별점 · 작가만 */
export default function Card({ s }: { s: SV }) {
  return (
    <Link className={k('card')} href={readHref(s.id)} aria-label={`${s.title} · ${s.author}`}>
      <div className={k('th')}>
        <Thumb s={s} w={400} h={600} />
        <div className={k('badges')}>{s.up && <span className={k('bd up')}>UP</span>}{s.isNew && <span className={k('bd new')}>신작</span>}{s.ai && <span className={k('bd ai')}>AI 활용</span>}</div>
      </div>
      <span className={k('meta')}>{s.rating ? <span className={k('star tnum')}>★ {s.rating.toFixed(2)}</span> : <span className={k('star')}>새 작품</span>}<span>{s.author}</span></span>
    </Link>
  );
}

/** TOP 10 — 큰 숫자 + 포스터 */
export function TopCard({ s, n }: { s: SV; n: number }) {
  return (
    <Link className={k('topi')} href={readHref(s.id)} aria-label={`${n}위 ${s.title}`}>
      <span className={k('n')} aria-hidden="true">{n}</span>
      <span className={k('th')}><Thumb s={s} w={400} h={600} /></span>
    </Link>
  );
}
