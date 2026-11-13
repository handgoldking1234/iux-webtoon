import Link from 'next/link';
import { DAYS, dayLabel } from '@/lib/read/config';
import { adminRead } from '@/lib/read/store';
import { avg } from '@/lib/read/types';
import { ago } from '@/lib/fmt';
import { reportDismiss, reportDone, reportHide, seriesApprove, seriesReject, seriesShow } from './actions';

export const metadata = { title: '연재관' };
export const dynamic = 'force-dynamic';

const ST: Record<string, [string, string]> = { open: ['대기', 'p-warn'], done: ['처리함', 'p-ok'], dismissed: ['문제없음', 'p-gray'] };
const TY: Record<string, string> = { series: '작품', episode: '회차', comment: '댓글' };

export default async function AdminRead() {
  const d = await adminRead();
  const open = d.reports.filter((r) => r.status === 'open');
  return (
    <section className="view">
      <header className="ph"><h1>연재관</h1><span className="sub">신고 처리 · 요일연재 심사 · 숨긴 작품 — <a href="/read" target="_blank" rel="noopener">연재관 열기</a></span></header>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))' }}>
        <div className="card"><small className="note">작품</small><b style={{ fontSize: 22 }}>{d.stats.series.toLocaleString()}</b></div>
        <div className="card"><small className="note">회차</small><b style={{ fontSize: 22 }}>{d.stats.episodes.toLocaleString()}</b></div>
        <div className="card"><small className="note">댓글</small><b style={{ fontSize: 22 }}>{d.stats.comments.toLocaleString()}</b></div>
        <div className="card"><small className="note">처리할 신고</small><b style={{ fontSize: 22 }}>{open.length}</b></div>
      </div>

      <div className="card">
        <div className="hd"><h2>신고</h2><span className="r note">최근 100건</span></div>
        {!d.reports.length && <p className="note">신고가 없어요</p>}
        {d.reports.map((r) => (
          <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            <span className={`pill ${ST[r.status][1]}`}>{ST[r.status][0]}</span>
            <span className="pill p-gray">{TY[r.target_type]}</span>
            <span style={{ flex: '1 1 240px', minWidth: 0 }}><b>{r.reason}</b><span className="sub2">{r.href ? <Link href={r.href} target="_blank">{r.label}</Link> : r.label} · {ago(r.created_at)}</span></span>
            {r.status === 'open' && (
              <form style={{ display: 'flex', gap: 6 }}>
                <input type="hidden" name="id" value={r.id} /><input type="hidden" name="type" value={r.target_type} /><input type="hidden" name="target" value={r.target_id} />
                {r.target_type !== 'episode' && <button className="btn sm danger" formAction={reportHide}>숨기기</button>}
                <button className="btn sm" formAction={reportDone}>처리함</button>
                <button className="btn sm" formAction={reportDismiss}>문제없음</button>
              </form>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="hd"><h2>요일연재 신청</h2><span className="r note">요일을 하나 이상 고르고 승인하면 요일연재 목록으로 옮겨요</span></div>
        {!d.pending.length && <p className="note">검토할 신청이 없어요</p>}
        {d.pending.map((s) => (
          <div key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            <span style={{ flex: '1 1 240px', minWidth: 0 }}><b><Link href={`/read/${s.id}`} target="_blank">{s.title}</Link></b><span className="sub2">{s.author_name} · {s.genre} · {s.episodes}화 · 관심 {s.follows} · ★ {avg(s).toFixed(2)} · 희망 요일 {s.days.length ? s.days.map(dayLabel).join('·') : '없음'}{s.ai ? ' · AI 활용' : ''}</span></span>
            <form style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input type="hidden" name="id" value={s.id} />
              <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} aria-label="연재 요일">{DAYS.map(([dk, dl]) => <label key={dk} style={{ display: 'inline-flex', gap: 2, alignItems: 'center', fontSize: 12 }}><input type="checkbox" name="days" value={dk} defaultChecked={s.days.includes(dk)} />{dl}</label>)}</span>
              <button className="btn sm pri" formAction={seriesApprove} data-act="approve" title="고른 요일의 요일연재 목록으로 옮겨요">승인</button>
              <input name="note" placeholder="반려 이유 (선택)" style={{ height: 28, minWidth: 140 }} />
              <button className="btn sm" formAction={seriesReject}>반려</button>
            </form>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="hd"><h2>숨긴 작품</h2></div>
        {!d.hidden.length && <p className="note">숨긴 작품이 없어요</p>}
        {d.hidden.map((s) => (
          <form key={s.id} action={seriesShow} style={{ display: 'flex', gap: 10, alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
            <input type="hidden" name="id" value={s.id} />
            <span style={{ flex: 1 }}><b>{s.title}</b><span className="sub2">{s.author_name}</span></span>
            <button className="btn sm">다시 보이기</button>
          </form>
        ))}
      </div>
    </section>
  );
}
