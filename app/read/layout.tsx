import type { Metadata, Viewport } from 'next';
import { getMe } from '@/lib/auth';
import Gnb from './_ui/Gnb';
import { k } from './_ui/k';
import './read.css';

export const metadata: Metadata = {
  title: { default: '바로웹툰 연재', template: '%s · 바로웹툰 연재' },
  description: '바로웹툰에서 만든 웹툰을 요일연재 · 자유연재로 읽는 곳',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0b0d0c' };

export default async function ReadLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <div className="rd">
      <Gnb signedIn={!!me} />
      <main>{children}</main>
      <footer className={k('foot')}>
        <div className={k('wrap')}>
          <span>바로웹툰 연재 · webtoon.iux.kr</span>
          <a href="/read/policy">운영정책</a>
          <a href="/studio">웹툰 만들기</a>
          <a href="/">바로웹툰 소개</a>
        </div>
      </footer>
    </div>
  );
}
