import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { adminReady } from '@/lib/env';
import { homeData } from '@/lib/read/store';

export const revalidate = 3600;

// 검색 로봇에게 알려 줄 주소 목록 (연재 작품은 DB에 연결됐을 때만 — 예시 작품은 넣지 않아요)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/studio`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/read`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/read/daily`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/read/rank`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/read/free`, lastModified: now, changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
  if (!adminReady()) return fixed;
  try {
    const d = await homeData();
    return fixed.concat(d.all.map((s) => ({ url: `${SITE_URL}/read/${encodeURIComponent(s.id)}`, lastModified: new Date(s.last_episode_at || s.created_at), changeFrequency: 'weekly' as const, priority: 0.5 })));
  } catch {
    return fixed;
  }
}
