import type { Metadata } from 'next';
import './globals.css';
import { SITE_DESC, SITE_KEYWORDS, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site';

// 검색 사이트 소유 확인 코드 (구글 서치 콘솔 · 네이버 서치어드바이저에서 받은 값) — 공개돼도 괜찮은 값이에요
const GOOGLE_VERIFY = process.env.GOOGLE_SITE_VERIFICATION || '';
const NAVER_VERIFY = process.env.NAVER_SITE_VERIFICATION || '';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s · 바로웹툰' },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  openGraph: { type: 'website', locale: 'ko_KR', url: SITE_URL, siteName: SITE_NAME, title: SITE_TITLE, description: SITE_DESC, images: [{ url: '/og.jpg', width: 1200, height: 630, alt: '바로웹툰 — AI로 바로 만드는 나만의 웹툰' }] },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESC, images: ['/og.jpg'] },
  robots: { index: true, follow: true },
  verification: { ...(GOOGLE_VERIFY ? { google: GOOGLE_VERIFY } : {}), ...(NAVER_VERIFY ? { other: { 'naver-site-verification': NAVER_VERIFY } } : {}) },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
