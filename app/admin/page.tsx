import Link from 'next/link';
import { dashboard } from '@/lib/admin-data';
import { won, num, ago, PLAN } from '@/lib/fmt';

export const metadata = { title: '대시보드' };

export default async function Dashboard() {
  const d = await dashboard();
  const maxCost = Math.max(1, ...d.byDay.map((x) => x.cost)), maxSign = Math.max(1, ...d.byDay.map((x) => x.signups));
  const dayBudget = d.budget / 30, pct = Math.round((d.monthCost / Math.max(1, d.budget)) * 100);
  return (
    <section className="view">
      <header className="ph"><h1>대시보드</h1><span className="sub">이번 달 · 최근 14일</span></header>
      <div className="grid g-kpi">
        <Link className="kpi" href="/admin/members"><span>전체 회원</span><strong>{num(d.total)}</strong><em className="up">최근 7일 +{d.new7}</em></Link>
        <Link className="kpi" href="/admin/projects"><span>활성 제작자 (7일)</span><strong>{num(d.activeMakers)}</strong><em>작품 {num(d.works)}개</em></Link>
        <Link className="kpi" href="/admin/ai"><span>AI 이미지 (이번 달)</span><strong>{num(d.monthImages)}장</strong><em>글 AI {num(d.monthTexts)}회</em></Link>
        <Link className="kpi" href="/admin/ai"><span>AI 비용 (이번 달)</span><strong>{won(d.monthCost)}</strong><em className={pct >= 80 ? 'down' : pct >= 60 ? 'warn' : 'up'}>월 한도 {won(d.budget)}의 {pct}%</em></Link>
      </div>
      <div className="grid g-2">
        <div className="card">
          <div className="hd"><h2>일별 AI 비용</h2><span className="note">하루 예산 {won(dayBudget)} 넘은 날은 주황</span></div>
          <div className="vbars" role="img" aria-label="최근 14일 AI 비용">
            {d.byDay.map((x) => <div className="col" key={x.d}><span>{x.cost ? (x.cost >= 1000 ? `${(x.cost / 1000).toFixed(1)}k` : Math.round(x.cost)) : ''}</span><i className={x.cost > dayBudget ? 'hot' : ''} style={{ height: `${(x.cost / maxCost) * 88}%` }} title={`${x.d} · ${won(x.cost)} · 이미지 ${x.images} · 글 ${x.texts}`} /></div>)}
          </div>
          <div className="vlab">{d.byDay.map((x, i) => <span key={x.d}>{i % 2 ? '' : x.d.slice(5).replace('-', '.')}</span>)}</div>
        </div>
        <div className="card">
          <div className="hd"><h2>일별 신규 가입</h2></div>
          <div className="vbars" role="img" aria-label="최근 14일 가입">
            {d.byDay.map((x) => <div className="col" key={x.d}><span>{x.signups || ''}</span><i style={{ height: `${(x.signups / maxSign) * 88}%`, background: 'var(--blue)' }} title={`${x.d} · ${x.signups}명`} /></div>)}
          </div>
          <div className="vlab">{d.byDay.map((x, i) => <span key={x.d}>{i % 2 ? '' : x.d.slice(5).replace('-', '.')}</span>)}</div>
        </div>
      </div>
      <div className="grid g-3">
        <div className="card"><h2>할 일</h2>
          <Link className="row" href="/admin/inquiries"><span className="dot" style={{ background: 'var(--orange)' }} /><span style={{ flex: 1 }}>답하지 않은 문의</span><strong>{d.openInquiries}건</strong></Link>
          <Link className="row" href="/admin/members?plan=free"><span className="dot" style={{ background: 'var(--blue)' }} /><span style={{ flex: 1 }}>프로 알림 신청</span><strong>{d.proNotify}명</strong></Link>
          <Link className="row" href="/admin/ai"><span className="dot" style={{ background: pct >= 80 ? 'var(--badText)' : 'var(--amber)' }} /><span style={{ flex: 1 }}>AI 예산 사용</span><strong>{pct}%</strong></Link>
        </div>
        <div className="card"><div className="hd"><h2>AI 많이 쓴 회원</h2><Link className="r" href="/admin/ai" style={{ fontSize: 12, fontWeight: 600 }}>전체</Link></div>
          {d.top.length ? d.top.map((t, i) => <Link className="row" key={i} href={t.member ? `/admin/members/${t.member.id}` : '/admin/members'}><span className="av">{(t.member?.name || '?').slice(0, 1)}</span><span style={{ flex: 1, minWidth: 0 }}><b>{t.member?.name || '알 수 없음'}</b><span className="sub2">이미지 {t.image} · 글 {t.text}</span></span><b>{won(t.cost)}</b></Link>) : <p className="note">이번 달 사용 기록이 없어요</p>}
        </div>
        <div className="card"><div className="hd"><h2>최근 가입</h2><Link className="r" href="/admin/members" style={{ fontSize: 12, fontWeight: 600 }}>회원관리</Link></div>
          {d.recent.map((m) => <Link className="row" key={m.id} href={`/admin/members/${m.id}`}><span className="av">{(m.name || '?').slice(0, 1)}</span><span style={{ flex: 1, minWidth: 0 }}><b>{m.name}</b><span className="sub2">{'signup_source' in m && m.signup_source ? `${m.signup_source} · ` : ''}{ago(m.created_at)}</span></span><span className={`pill ${m.plan === 'free' ? 'p-gray' : 'p-ok'}`}>{PLAN[m.plan]}</span></Link>)}
        </div>
      </div>
      <div className="card"><h2>가입 유입 경로</h2>
        {d.sources.slice(0, 8).map(([k, v]) => <div className="brow" key={k}><span>{k}</span><div className="bar"><i style={{ width: `${(v / Math.max(1, d.sources[0][1])) * 100}%` }} /></div><span className="v">{num(v)}</span></div>)}
        <p className="note">링크에 ?utm_source=instagram 처럼 붙여 들어온 뒤 가입하면 여기에 잡혀요.</p>
      </div>
    </section>
  );
}
