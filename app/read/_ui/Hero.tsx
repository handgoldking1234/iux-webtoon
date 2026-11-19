'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ageLabel, dayLabel, readHref } from '@/lib/read/config';
import type { SV } from '@/lib/read/view';
import { Ic } from './Icons';
import Thumb from './Thumb';
import { k } from './k';

const when = (s: SV) => (s.kind === 'done' ? '완결' : s.kind === 'daily' ? `매주 ${s.days.map(dayLabel).join('·')}요일` : '자유연재');

/** 맨 위 큰 대표 작품 — 여러 편이면 넘겨 볼 수 있어요 */
export default function Hero({ list }: { list: SV[] }) {
  const [i, setI] = useState(0);
  if (!list.length) return null;
  const n = list.length, f = list[((i % n) + n) % n];
  return (
    <section className={k('hero')} style={{ '--tint': f.art?.pal[1] || '#535353' } as React.CSSProperties} aria-label="추천 작품" aria-roledescription="carousel">
      <div className={k('cover')} key={f.id}><Thumb s={f} w={400} h={600} alt="" /></div>
      <div className={k('txt')}>
        <span className={k('kick')}>오늘의 추천 · {when(f)}</span>
        <h2>{f.title}</h2>
        <p className={k('desc')}>{f.description}</p>
        <p className={k('meta')}>
          <b>{f.author}</b>{f.rating > 0 && <><i>·</i><span className={k('tnum')}>★ {f.rating.toFixed(2)}</span></>}
          <i>·</i><span>{f.genre}</span><i>·</i><span>총 {f.episodes}화</span>
          <span className={k('age')}>{ageLabel(f.age)}</span>{f.ai && <span className={k('age')}>AI 활용</span>}
        </p>
      </div>
      <div className={k('acts')}>
        <Link className={k('btn big play')} href={readHref(`${f.id}/1`)}><Ic n="play" />첫 화 보기</Link>
        <Link className={k('btn big glass')} href={readHref(f.id)}>작품 정보</Link>
      </div>
      {n > 1 && (
        <div className={k('pager')}>
          <button aria-label="이전 추천" onClick={() => setI(i - 1 + n)}><Ic n="left" /></button>
          <span className={k('tnum')} aria-live="polite">{(((i % n) + n) % n) + 1} / {n}</span>
          <button aria-label="다음 추천" onClick={() => setI(i + 1)}><Ic n="right" /></button>
        </div>
      )}
    </section>
  );
}
