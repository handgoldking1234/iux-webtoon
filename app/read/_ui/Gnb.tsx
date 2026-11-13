'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { readHref, RESERVED } from '@/lib/read/config';
import { Ic } from './Icons';
import { k } from './k';

const MENU: [string, string][] = [['', '홈'], ['daily', '요일연재'], ['free', '자유연재'], ['rank', '랭킹']];

export default function Gnb({ signedIn }: { signedIn: boolean }) {
  const p = usePathname() || '/read';
  const seg = p.replace(/^\/read\/?/, '').split('/').filter(Boolean);
  // 뷰어(/read/작품/화)에서는 뷰어 막대가 대신해요
  if (seg.length >= 2 && !RESERVED.has(seg[0])) return null;
  const cur = seg[0] || '';
  return (
    <header className={k('gnb')}>
      <div className={k('wrap')}>
        <Link className={k('logo')} href={readHref()}><i><Ic n="book" /></i>웹툰보드<small>연재</small></Link>
        <nav className={k('menu')} aria-label="연재관 메뉴">
          {MENU.map(([h, l]) => <Link key={h} href={readHref(h)} className={cur === h ? k('on') : undefined} aria-current={cur === h ? 'page' : undefined}>{l}</Link>)}
        </nav>
        <div className={k('right')}>
          <a className={k('btn only-wide')} href="/studio"><Ic n="pen" />만들기</a>
          {!signedIn && <a className={k('btn only-wide')} href={`/login?next=${encodeURIComponent(p)}`}>로그인</a>}
          <Link className={k('btn go')} href={readHref('publish')}><Ic n="up" />연재하기</Link>
        </div>
      </div>
    </header>
  );
}
