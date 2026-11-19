import { requireAdmin } from '@/lib/auth';
import { adminReady } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Logo } from '@/components';
import Nav from './Nav';

export const metadata = { title: { default: '관리자', template: '%s · 웹툰보드 관리자' } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  let openQ = 0;
  if (adminReady()) {
    const { count } = await supabaseAdmin().from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'open');
    openQ = count || 0;
  }
  const n = me.profile.name || me.profile.email || '관리자';
  return (
    <div className="app">
      <nav className="nav" aria-label="관리자 메뉴">
        <div className="brand"><i><Logo /></i><div><b>웹툰보드</b><small>관리자</small></div></div>
        <Nav openQ={openQ} />
        <div className="me"><span className="av dark">{n.slice(0, 2).toUpperCase()}</span><span><b>{n}</b><small>{me.mode === 'local' ? '로컬 시연' : '전체 권한'}</small></span></div>
      </nav>
      <main>
        <header className="topbar">
          <span className="tbt">웹툰보드 관리자</span>
          <div className="tbr">
            <a className="svc" href="/studio" target="_blank" rel="noopener"><Logo size={15} /><span>서비스 바로가기</span></a>
            <span className="tbsep" aria-hidden="true" />
            {me.mode === 'cloud' && <a className="btn sm" href="/auth/signout">로그아웃</a>}
          </div>
        </header>
        {!adminReady() && <div className="demo">DB 연동 전 · 예시 데이터예요. Supabase 키(서비스 키 포함)를 넣으면 실제 회원 · 사용량이 보여요.</div>}
        {children}
      </main>
    </div>
  );
}
