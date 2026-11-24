import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// 검색 로봇 안내: 소개 · 연재관 · 약관은 열고, 관리자 · 계정 · API · 편집기 내부는 닫아요
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/api/', '/read/publish', '/studio-assets/'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
