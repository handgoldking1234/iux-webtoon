import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '웹툰보드', template: '%s · 웹툰보드' },
  description: '기획부터 콘티 · AI 이미지 · 말풍선까지, 웹툰 한 화를 한 곳에서 만드는 편집기',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
