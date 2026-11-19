import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMember } from '@/lib/admin-data';
import { updateMember } from '../../actions';
import { won, ago, date, PLAN, PROVIDER, bytes } from '@/lib/fmt';

export const metadata = { title: '회원 상세' };

export default async function Member({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getMember(id);
  if (!r) notFound();
  const m = r.member, L = r.limits;
  return (
    <section className="view">
      <header className="ph"><Link href="/admin/members" className="btn sm">‹ 회원 목록</Link><h1>{m.name || '(이름 없음)'}</h1><span className="sub">{m.email}</span>
        <div className="act">{m.status === 'suspended' ? <span className="pill p-bad">정지</span> : <span className="pill p-ok">정상</span>}<span className={`pill ${m.plan === 'free' ? 'p-gray' : 'p-ok'}`}>{PLAN[m.plan]}</span>{m.role === 'admin' && <span className="pill p-dark">관리자</span>}</div></header>
      <div className="grid g-kpi">
        <div className="kpi"><span>작품</span><strong>{m.works}</strong></div>
        <div className="kpi"><span>글 AI (이번 달)</span><strong>{m.text_month} / {L.text}</strong></div>
        <div className="kpi"><span>AI 이미지 ({L.imagePeriod === 'total' ? '누적' : '이번 달'})</span><strong>{L.imagePeriod === 'total' ? m.image_total : m.image_month} / {L.image}</strong>{m.bonus_images ? <em className="up">추가 {m.bonus_images}장 포함</em> : null}</div>
        <div className="kpi"><span>AI 비용 (이번 달)</span><strong>{won(m.cost_month)}</strong></div>
      </div>
      <div className="split">
        <div className="main" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card"><h2>작품 {r.projects.length}개</h2>
            {r.projects.length ? <div className="tw"><table><thead><tr><th>제목</th><th className="r">회차</th><th className="r">컷</th><th className="r">크기</th><th>수정</th></tr></thead><tbody>
              {r.projects.map((p) => <tr key={p.id}><th scope="row">{p.title}{p.deleted_at && <span className="pill p-bad" style={{ marginLeft: 6 }}>삭제됨</span>}</th><td className="r">{p.episodes}</td><td className="r">{p.cuts}</td><td className="r">{bytes(p.size_bytes)}</td><td>{ago(p.updated_at)}</td></tr>)}
            </tbody></table></div> : <p className="note">아직 클라우드에 저장한 작품이 없어요</p>}
          </div>
          <div className="card"><h2>최근 AI 사용</h2>
            {r.usage.length ? <div className="tw"><table><thead><tr><th>시각</th><th>종류</th><th>모델</th><th className="r">비용</th></tr></thead><tbody>
              {r.usage.map((u, i) => <tr key={i}><td>{ago(u.created_at)}</td><td>{u.kind === 'image' ? <span className="pill p-blue">이미지</span> : <span className="pill p-gray">글</span>}</td><td className="sub2" style={{ display: 'table-cell' }}>{u.model}</td><td className="r">{won(+u.cost_krw)}</td></tr>)}
            </tbody></table></div> : <p className="note">사용 기록이 없어요</p>}
          </div>
        </div>
        <aside className="side" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card"><h2>회원 정보</h2>
            <dl className="kv"><dt>로그인</dt><dd>{PROVIDER[m.provider || 'email'] || m.provider}</dd><dt>가입</dt><dd>{date(m.created_at)}</dd><dt>최근 접속</dt><dd>{ago(m.last_seen_at)}</dd><dt>유입</dt><dd>{m.signup_source || '—'}</dd><dt>프로 알림</dt><dd>{m.pro_notify ? '신청' : '—'}</dd></dl>
          </div>
          <form className="card" action={updateMember}>
            <h2>관리</h2><input type="hidden" name="id" value={m.id} />
            <label className="fld">등급<select name="plan" defaultValue={m.plan}><option value="free">무료</option><option value="pro">프로</option><option value="edu">교육</option></select></label>
            <label className="fld">권한<select name="role" defaultValue={m.role}><option value="user">일반</option><option value="admin">관리자</option></select></label>
            <label className="fld">상태<select name="status" defaultValue={m.status}><option value="active">정상</option><option value="suspended">정지 (로그인은 되지만 작업실 · AI를 못 써요)</option></select></label>
            <label className="fld">추가 이미지(장)<input type="number" name="bonus_images" min={0} max={10000} defaultValue={m.bonus_images} /></label>
            <label className="fld">관리자 메모<textarea name="memo" rows={3} defaultValue={m.memo || ''} /></label>
            <button className="btn pri" disabled={r.demo}>{r.demo ? 'DB 연동 후 저장돼요' : '저장'}</button>
          </form>
          {r.inquiries.length > 0 && <div className="card"><h2>문의 {r.inquiries.length}건</h2>{r.inquiries.map((q) => <Link className="row" key={q.id} href="/admin/inquiries"><span className={`pill ${q.status === 'open' ? 'p-warn' : 'p-ok'}`}>{q.status === 'open' ? '대기' : '답변'}</span><span style={{ flex: 1 }}>{q.subject}</span></Link>)}</div>}
        </aside>
      </div>
    </section>
  );
}
