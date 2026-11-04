'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const I = {
  dash: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  mem: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>,
  ai: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  proj: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /></>,
  q: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
};
const ITEMS: [string, string, keyof typeof I][] = [['/admin', '대시보드', 'dash'], ['/admin/members', '회원관리', 'mem'], ['/admin/ai', 'AI 사용 · 비용', 'ai'], ['/admin/projects', '작품', 'proj'], ['/admin/inquiries', '문의', 'q']];

export default function Nav({ openQ }: { openQ: number }) {
  const p = usePathname();
  return (
    <>
      {ITEMS.map(([href, label, ic]) => {
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
