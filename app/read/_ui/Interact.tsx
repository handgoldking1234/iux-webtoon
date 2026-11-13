'use client';
import { useEffect, useState } from 'react';
import { call, toast } from './client';
import { k } from './k';

export function FollowButton({ seriesId, initial }: { seriesId: string; initial: boolean }) {
  const [on, setOn] = useState(initial), [busy, setBusy] = useState(false);
  return (
    <button className={k(`btn big fav ${on ? 'on' : ''}`)} aria-pressed={on} disabled={busy} onClick={async () => {
      setBusy(true);
      const j = await call<{ follows: number }>('follow', { seriesId, on: !on });
      setBusy(false);
      if (j) { setOn(!on); toast(!on ? '관심 작품에 넣었어요 · 새 회차가 올라오면 알려 드려요' : '관심 작품에서 뺐어요'); }
    }}>{on ? '관심 등록됨' : '+ 관심'}</button>
  );
}

export function ShareButton() {
  return <button className={k('btn big')} onClick={() => { const u = location.href; navigator.clipboard?.writeText(u).then(() => toast('주소를 복사했어요'), () => toast('주소창의 주소를 복사해 공유해 주세요')); }}>공유</button>;
}

export function ViewPing({ episodeId }: { episodeId: number }) {
  useEffect(() => {
    const key = 'wb-v-' + episodeId;
    try { const t = +(sessionStorage.getItem(key) || 0); if (Date.now() - t < 6 * 3600e3) return; sessionStorage.setItem(key, String(Date.now())); } catch { /* 저장 안 돼도 괜찮아요 */ }
    fetch(`/read/api/view`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ episodeId }) }).catch(() => {});
  }, [episodeId]);
  return null;
}

export function Rating({ episodeId, mine, avg, count }: { episodeId: number; mine: number; avg: number; count: number }) {
  const [my, setMy] = useState(Math.round(mine / 2)), [a, setA] = useState(avg), [c, setC] = useState(count);
  return (
    <div className={k('rate')}>
      <b>이번 화 별점</b>
      <div className={k('stars')} role="radiogroup" aria-label="별점 주기">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} role="radio" aria-checked={my === s} aria-label={`${s * 2}점`} className={s <= my ? k('on') : undefined} onClick={async () => {
            const j = await call<{ avg: number; count: number }>('rate', { episodeId, score: s * 2 });
            if (j) { setMy(s); setA(j.avg); setC(j.count); toast(`별점 ${s * 2}점을 줬어요`); }
          }}>★</button>
        ))}
      </div>
      <small className={k('muted tnum')}>{my ? `내 별점 ${my * 2}점 · ` : ''}{c ? `평균 ★ ${a.toFixed(2)} · 참여 ${c.toLocaleString()}명` : '아직 별점이 없어요'}</small>
    </div>
  );
}

export function ReportButton({ type, id, label = '신고' }: { type: 'series' | 'episode' | 'comment'; id: string | number; label?: string }) {
  const [open, setOpen] = useState(false);
  const R = ['선정적 · 폭력적', '저작권 침해 (남의 그림 · 글)', '실존 인물 비방', '스팸 · 광고', '스포일러', '기타'];
  if (!open) return <button className={k('linkish')} onClick={() => setOpen(true)}>{label}</button>;
  return (
    <span className={k('reportbox')}>
      {R.map((r) => <button key={r} className={k('chip')} onClick={async () => { const j = await call('report', { type, id: String(id), reason: r }); setOpen(false); if (j) toast('신고를 접수했어요 · 운영팀이 확인해요'); }}>{r}</button>)}
      <button className={k('chip')} onClick={() => setOpen(false)}>취소</button>
    </span>
  );
}
