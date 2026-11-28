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
        <Link className={k('logo')} href={readHref()}><i><Ic n="book" /></i>바로웹툰<small>연재</small></Link>
        <nav className={k('menu')} aria-label="연재관 메뉴">
          {MENU.map(([h, l]) => <Link key={h} href={readHref(h)} className={cur === h ? k('on') : undefined} aria-current={cur === h ? 'page' : undefined}>{l}</Link>)}
          <a className={k('out')} href="/">바로웹툰 소개</a>
        </nav>
        <div className={k('right')}>
          {signedIn
            ? <Link className={k('btn')} href={readHref('publish')} title="그림 파일로 올리기 · 내가 올린 작품 고치기 · 휴지통">연재 올리기</Link>
            : <a className={k('btn only-wide')} href={`/login?next=${encodeURIComponent(p)}`}>로그인</a>}
          <a className={k('btn go')} href="/studio" title="웹툰 만들기 (작업실) · 만든 회차는 작업실에서 「연재하기」로 올려요"><Ic n="pen" />웹툰 만들기</a>
        </div>
      </div>
    </header>
  );
}
