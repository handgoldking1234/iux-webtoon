import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '바로웹툰', template: '%s · 바로웹툰' },
  description: 'AI로 바로 만드는 나만의 웹툰 · 기획부터 콘티 · 캐릭터 · 그림 · 말풍선까지 한곳에서',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
