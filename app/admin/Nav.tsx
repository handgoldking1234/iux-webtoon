'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const I = {
  dash: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  mem: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>,
  ai: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  proj: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /></>,
  q: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
  acq: <><path d="M3 4h18l-7 8v6l-4 2v-8z" /></>,
  bill: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  read: <><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" /><path d="M5 17a3 3 0 0 1 3-3h11" /></>,
  set: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
};
const ITEMS: ([string, string, keyof typeof I] | null)[] = [['/admin', '대시보드', 'dash'], ['/admin/acq', '유입경로', 'acq'], ['/admin/members', '회원관리', 'mem'], ['/admin/ai', 'AI 사용 · 비용', 'ai'], ['/admin/projects', '작품', 'proj'], ['/admin/read', '연재관', 'read'], null, ['/admin/billing', '요금제', 'bill'], ['/admin/inquiries', '문의', 'q'], ['/admin/notices', '공지', 'bell'], ['/admin/settings', '설정', 'set']];

export default function Nav({ openQ }: { openQ: number }) {
  const p = usePathname();
  return (
    <>
      {ITEMS.map((it, i) => {
        if (!it) return <div className="sep" key={'s' + i} />;
        const [href, label, ic] = it;
        const on = href === '/admin' ? p === '/admin' : p.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? 'page' : undefined}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{I[ic]}</svg>
            {label}
            {ic === 'q' && openQ > 0 && <span className="cnt">{openQ}</span>}
          </Link>
        );
      })}
    </>
  );
}
