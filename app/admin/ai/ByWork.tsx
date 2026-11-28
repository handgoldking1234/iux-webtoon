import Link from 'next/link';
import { aiByWork, type UseSum } from '@/lib/admin-data';
import { won, num } from '@/lib/fmt';

const when = (s: string) => new Date(s).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const tasks = (s: UseSum) => Object.entries(s.tasks).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(' · ');
const tok = (s: UseSum) => (s.inTok || s.outTok ? `${num(s.inTok)} → ${num(s.outTok)}` : '–');

/** AI 사용 내역 — 작품 › 회차 › 한 건씩. 누르면 펼쳐져요 */
export default async function ByWork() {
  const d = await aiByWork();
  return (
    <div className="card">
      <div className="hd"><h2>작품 · 회차별 사용 내역</h2><span className="note">최근 31일 · {num(d.total)}건 · 줄을 누르면 한 건씩 보여요</span></div>
      {d.demo ? <p className="note">관리자 키가 연결되면 실제 기록이 보여요.</p> : !d.works.length ? <p className="note">아직 기록이 없어요.</p> : d.works.map((w) => (
        <details key={w.key} className="usew">
          <summary>
            <b>{w.projectId ? w.title : '작품 정보 없는 기록'}</b>
            <span className="who"><Link href={`/admin/members/${w.userId}`}>{w.user}</Link></span>
            <span className="n">글 {num(w.sum.texts)}회</span><span className="n">그림 {num(w.sum.images)}장</span><span className="n c">{won(w.sum.cost)}</span>
          </summary>
          {!w.projectId && <p className="note" style={{ margin: '6px 0 10px' }}>작품 · 회차를 기록하기 전(11월 28일 이전)에 쓴 AI와, 관리자 시험 · 글 AI 비교처럼 작품 밖에서 쓴 AI예요.</p>}
          <div className="tw"><table style={{ minWidth: 760 }}>
            <thead><tr><th>회차</th><th className="r">컷</th><th className="r">글 AI</th><th className="r">그림</th><th>무엇에 썼나</th><th className="r">토큰 (보냄 → 받음)</th><th className="r">비용</th><th>최근</th></tr></thead>
            <tbody>{w.eps.map((e) => (
              <tr key={e.key}><td colSpan={8} style={{ padding: 0 }}>
                <details className="usee">
                  <summary><span className="c1">{e.key === 'x' ? '–' : e.no === 0 ? '표지 · 썸네일' : e.no ? `${e.no}화${e.title && e.title !== `${e.no}화` ? ` · ${e.title}` : ''}` : '회차 밖 (기획 등)'}</span><span className="r">{e.cuts ? `${e.cuts}컷` : '–'}</span><span className="r">{num(e.sum.texts)}회</span><span className="r">{num(e.sum.images)}장</span><span className="t">{tasks(e.sum)}</span><span className="r">{tok(e.sum)}</span><span className="r"><b>{won(e.sum.cost)}</b></span><span>{when(e.sum.last)}</span></summary>
                  <table className="usel"><thead><tr><th>시각</th><th>작업</th><th className="r">컷</th><th>모델</th><th className="r">토큰</th><th className="r">비용</th><th>보낸 내용 (앞부분)</th></tr></thead>
                    <tbody>{e.rows.map((r) => (
                      <tr key={r.id} className={r.ok ? '' : 'fail'}><td>{when(r.created_at)}</td><td>{r.task || (r.kind === 'image' ? '그림' : '글')}{r.ok ? '' : ' (실패)'}</td><td className="r">{r.cut_no ? `S#${r.cut_no}` : ''}</td><td>{r.model || ''}</td><td className="r">{r.in_tokens || r.out_tokens ? `${num(r.in_tokens || 0)} → ${num(r.out_tokens || 0)}` : ''}</td><td className="r">{won(+r.cost_krw)}</td><td className="note" title={r.note || ''}>{r.note || ''}</td></tr>
                    ))}</tbody></table>
                  {e.more > 0 && <p className="note">… 그리고 {num(e.more)}건 더 있어요</p>}
                </details>
              </td></tr>
            ))}</tbody>
          </table></div>
        </details>
      ))}
    </div>
  );
}
