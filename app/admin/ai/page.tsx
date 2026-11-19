import Link from 'next/link';
import { aiReport } from '@/lib/admin-data';
import { won, num } from '@/lib/fmt';
import { getSettings } from '@/lib/settings';

export const metadata = { title: 'AI 사용 · 비용' };

export default async function AiPage() {
  const [d, st] = await Promise.all([aiReport(), getSettings()]);
  const pct = Math.round((d.monthCost / Math.max(1, d.budget)) * 100);
  const max = Math.max(1, ...d.byDay.map((x) => x.images + x.texts));
  return (
    <section className="view">
      <header className="ph"><h1>AI 사용 · 비용</h1><span className="sub">이번 달 · 단가 · 한도 · 예산은 설정에서 바꿔요</span></header>
      <div className="grid g-kpi">
        <div className="kpi"><span>이번 달 비용</span><strong>{won(d.monthCost)}</strong><em className={pct >= 80 ? 'down' : 'up'}>한도의 {pct}%</em></div>
        <div className="kpi"><span>월 한도</span><strong>{won(d.budget)}</strong><em>남은 {won(Math.max(0, d.budget - d.monthCost))}</em></div>
        <div className="kpi"><span>AI 이미지</span><strong>{num(d.monthImages)}장</strong><em>장당 {won(st.cost.image)} · Pro {won(st.cost.imagePro)}</em></div>
        <div className="kpi"><span>글 AI</span><strong>{num(d.monthTexts)}회</strong><em>회당 약 {won(st.cost.text)}</em></div>
      </div>
      <div className="card"><div className="hd"><h2>일별 사용량</h2><div className="legend r"><span><i style={{ background: 'var(--ink)' }} />이미지</span><span><i style={{ background: 'var(--faint)' }} />글 AI</span></div></div>
        <div className="vbars" role="img" aria-label="최근 14일 AI 사용량">
          {d.byDay.map((x) => <div className="col" key={x.d}><span>{x.images + x.texts || ''}</span><i style={{ height: `${(x.images / max) * 88}%` }} /><i style={{ height: `${(x.texts / max) * 88}%`, background: 'var(--faint)', borderRadius: 0 }} /></div>)}
        </div>
        <div className="vlab">{d.byDay.map((x, i) => <span key={x.d}>{i % 2 ? '' : x.d.slice(5).replace('-', '.')}</span>)}</div>
      </div>
      <div className="grid g-2">
        <div className="card"><h2>모델별</h2>
          {d.byModel.length ? d.byModel.map((m) => <div className="brow" key={m.model}><span>{m.model}</span><div className="bar b-blue"><i style={{ width: `${(m.cost / Math.max(1, d.monthCost)) * 100}%` }} /></div><span className="v">{won(m.cost)}</span></div>) : <p className="note">기록이 없어요</p>}
        </div>
        <div className="card"><h2>많이 쓴 회원</h2>
          {d.top.length ? d.top.map((t, i) => <Link className="row" key={i} href={t.member ? `/admin/members/${t.member.id}` : '#'}><span className="av">{(t.member?.name || '?').slice(0, 1)}</span><span style={{ flex: 1 }}><b>{t.member?.name || '알 수 없음'}</b><span className="sub2">이미지 {t.image} · 글 {t.text}</span></span><b>{won(t.cost)}</b></Link>) : <p className="note">기록이 없어요</p>}
        </div>
      </div>
      <div className="callout i"><span>무료 한도: 글 AI 매달 <b>{st.limits.freeText}회</b> · 이미지 가입 선물 <b>{st.limits.freeImage}장</b> / 프로: 글 {st.limits.proText}회 · 이미지 {st.limits.proImage}장(월). 회원별 추가 이미지는 회원 상세에서 줄 수 있어요.</span></div>
    </section>
  );
}
