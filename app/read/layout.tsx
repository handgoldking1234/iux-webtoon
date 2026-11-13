import type { Metadata, Viewport } from 'next';
import { getMe } from '@/lib/auth';
import Gnb from './_ui/Gnb';
import { k } from './_ui/k';
import './read.css';

export const metadata: Metadata = {
  title: { default: '웹툰보드 연재', template: '%s · 웹툰보드 연재' },
  description: '웹툰보드에서 만든 웹툰을 요일연재 · 자유연재로 읽는 곳',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#ffffff' };

export default async function ReadLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <div className="rd">
      <Gnb signedIn={!!me} />
      <main>{children}</main>
      <footer className={k('foot')}>
        <div className={k('wrap')}>
          <span>웹툰보드 연재 · toon.iux.kr</span>
          <a href="/read/policy">운영정책</a>
          <a href="/">웹툰 만들기</a>
        </div>
      </footer>
    </div>
  );
}
