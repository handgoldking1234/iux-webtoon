'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { readHref } from '@/lib/read/config';
import { Ic } from './Icons';
import { k } from './k';

/** 옆으로 넘겨 보는 한 줄 — PC에서는 양옆 단추, 휴대폰에서는 손가락으로 넘겨요 */
export default function Rail({ title, sub, more, kind, children }: { title: string; sub?: string; more?: string; kind?: 'top' | 'wide'; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState({ l: true, r: false });
  const sync = () => { const el = ref.current; if (el) setAt({ l: el.scrollLeft < 8, r: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 }); };
  useEffect(() => { sync(); window.addEventListener('resize', sync); return () => window.removeEventListener('resize', sync); }, []);
  const go = (d: number) => { const el = ref.current; if (el) el.scrollBy({ left: d * el.clientWidth * 0.85, behavior: 'smooth' }); };
  return (
    <section className={k('row')}>
      <div className={k('sec-h')}><h2>{title}</h2>{sub && <small>{sub}</small>}{more !== undefined && <Link href={readHref(more)}>전체 보기</Link>}</div>
      <div className={k('railw')}>
        <button className={k('railb l')} aria-label="앞으로" disabled={at.l} onClick={() => go(-1)}><Ic n="left" /></button>
        <div className={k(`rail ${kind || ''}`)} ref={ref} onScroll={sync}>{children}</div>
        <button className={k('railb r')} aria-label="다음" disabled={at.r} onClick={() => go(1)}><Ic n="right" /></button>
      </div>
    </section>
  );
}
