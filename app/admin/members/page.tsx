import Link from 'next/link';
import { listMembers } from '@/lib/admin-data';
import { won, ago, date, PLAN, PROVIDER } from '@/lib/fmt';

export const metadata = { title: '회원관리' };

export default async function Members({ searchParams }: { searchParams: Promise<{ q?: string; plan?: string; status?: string; sort?: string; page?: string }> }) {
  const sp = await searchParams;
  const r = await listMembers({ ...sp, page: +(sp.page || 1) });
  const pages = Math.max(1, Math.ceil(r.total / r.per));
  const qs = (o: Record<string, string | undefined>) => '?' + new URLSearchParams(Object.entries({ ...sp, ...o }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <section className="view">
      <header className="ph"><h1>회원관리</h1><span className="sub">전체 {r.total.toLocaleString('ko-KR')}명</span></header>
      <form style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label className="search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg><input type="search" name="q" defaultValue={sp.q} placeholder="이름 · 이메일 검색" aria-label="회원 검색" /></label>
        <select name="plan" defaultValue={sp.plan || ''} aria-label="등급"><option value="">등급 전체</option><option value="free">무료</option><option value="pro">프로</option><option value="edu">교육</option></select>
        <select name="status" defaultValue={sp.status || ''} aria-label="상태"><option value="">상태 전체</option><option value="active">정상</option><option value="suspended">정지</option></select>
        <select name="sort" defaultValue={sp.sort || ''} aria-label="정렬"><option value="">가입 최신순</option><option value="seen">최근 접속순</option></select>
        <button className="btn">찾기</button>
      </form>
      <div className="card" style={{ padding: 0, gap: 0, overflow: 'hidden' }}>
        <div className="tw"><table style={{ minWidth: 900 }}>
          <thead><tr style={{ background: 'var(--soft2)' }}><th scope="col" style={{ paddingLeft: 16 }}>회원</th><th scope="col">등급</th><th scope="col">로그인</th><th className="r" scope="col">작품</th><th className="r" scope="col">글 AI (월)</th><th className="r" scope="col">이미지 (누적)</th><th className="r" scope="col">비용 (월)</th><th scope="col">가입</th><th scope="col">최근 접속</th><th scope="col">상태</th></tr></thead>
          <tbody>
            {r.rows.map((m) => (
              <tr key={m.id} className="clk">
                <th scope="row" style={{ paddingLeft: 16 }}><Link href={`/admin/members/${m.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>{m.name || '(이름 없음)'}{m.role === 'admin' && <span className="pill p-dark" style={{ marginLeft: 6 }}>관리자</span>}<span className="sub2">{m.email}</span></Link></th>
                <td><span className={`pill ${m.plan === 'free' ? 'p-gray' : 'p-ok'}`}>{PLAN[m.plan]}</span>{m.pro_notify && <span className="pill p-blue" style={{ marginLeft: 4 }}>알림</span>}</td>
                <td>{PROVIDER[m.provider || 'email'] || m.provider}</td>
                <td className="r">{m.works}</td><td className="r">{m.text_month}</td><td className="r">{m.image_total}{m.bonus_images ? <small className="sub2">+{m.bonus_images} 추가</small> : null}</td><td className="r">{won(m.cost_month)}</td>
                <td>{date(m.created_at)}<span className="sub2">{m.signup_source || ''}</span></td><td>{ago(m.last_seen_at)}</td>
                <td>{m.status === 'suspended' ? <span className="pill p-bad">정지</span> : <span className="pill p-ok">정상</span>}</td>
              </tr>
            ))}
            {!r.rows.length && <tr><td colSpan={10} className="c note" style={{ padding: 30 }}>조건에 맞는 회원이 없어요</td></tr>}
          </tbody>
        </table></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', color: 'var(--mute)', fontSize: 12, borderTop: '1px solid var(--line2)' }}>
          <span>{r.page} / {pages}쪽</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            {r.page > 1 && <Link className="btn sm" href={qs({ page: String(r.page - 1) })}>‹ 이전</Link>}
            {r.page < pages && <Link className="btn sm" href={qs({ page: String(r.page + 1) })}>다음 ›</Link>}
          </div>
        </div>
      </div>
    </section>
  );
}
