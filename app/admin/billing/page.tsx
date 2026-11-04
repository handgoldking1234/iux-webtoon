import Link from 'next/link';
import { plans } from '@/lib/admin-data';
import { getSettings } from '@/lib/settings';
import { date, num, won } from '@/lib/fmt';

export const metadata = { title: '요금제' };

export default async function Billing() {
  const [r, st] = await Promise.all([plans(), getSettings()]);
  const total = r.counts.free + r.counts.pro + r.counts.edu;
  return (
    <section className="view">
      <header className="ph"><h1>요금제</h1><span className="sub">결제는 아직 열지 않았어요 · 등급은 회원 상세에서 바꿔요</span><div className="act"><Link className="btn" href="/admin/settings">한도 · 단가 설정</Link></div></header>
      <div className="plans">
        <div className="plan"><div className="top"><b>무료</b><span className="pill p-gray">{num(r.counts.free)}명</span></div><div className="price">₩0</div><ul><li>글 AI 매달 {st.limits.freeText}회</li><li>AI 이미지 가입 선물 {st.limits.freeImage}장</li><li>작품 클라우드 저장</li></ul></div>
        <div className="plan hl"><div className="top"><b>프로</b><span className="pill p-ok">{num(r.counts.pro)}명</span></div><div className="price">준비 중</div><ul><li>글 AI 매달 {st.limits.proText}회</li><li>AI 이미지 매달 {st.limits.proImage}장</li><li>고해상도 · 나노바나나 Pro</li></ul></div>
        <div className="plan"><div className="top"><b>교육</b><span className="pill p-blue">{num(r.counts.edu)}명</span></div><div className="price">학교 · 학원</div><ul><li>프로와 같은 한도</li><li>관리자가 직접 지정</li></ul></div>
      </div>
      <div className="grid g-kpi">
        <div className="kpi"><span>전체 회원</span><strong>{num(total)}</strong></div>
        <div className="kpi"><span>프로 알림 신청</span><strong>{num(r.notify.length)}명</strong><em className="up">무료 회원의 {total ? Math.round((r.notify.length / Math.max(1, r.counts.free)) * 100) : 0}%</em></div>
        <div className="kpi"><span>이미지 1장 원가</span><strong>{won(st.cost.image)}</strong><em>Pro {won(st.cost.imagePro)}</em></div>
        <div className="kpi"><span>무료 회원 1명 최대 원가</span><strong>{won(st.limits.freeImage * st.cost.image + st.limits.freeText * st.cost.text)}</strong><em>이미지 다 쓰고 글 한 달치</em></div>
      </div>
      <div className="card"><div className="hd"><h2>프로 알림 신청 {r.notify.length}명</h2><a className="btn sm r" href="/admin/billing/export">CSV 받기</a></div>
        {r.notify.length ? <div className="tw"><table><thead><tr><th>이름</th><th>이메일</th><th>가입</th></tr></thead><tbody>
          {r.notify.slice(0, 50).map((x) => <tr key={x.id}><th scope="row"><Link href={`/admin/members/${x.id}`}>{x.name || '—'}</Link></th><td>{x.email}</td><td>{date(x.created_at)}</td></tr>)}
        </tbody></table></div> : <p className="note">아직 신청한 회원이 없어요</p>}
        {r.notify.length > 50 && <p className="note">50명까지만 보여요 · 전체는 CSV로 받아 주세요</p>}
      </div>
    </section>
  );
}
