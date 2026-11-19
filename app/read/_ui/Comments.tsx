'use client';
import { useState } from 'react';
import type { Comment } from '@/lib/read/types';
import { call, toast } from './client';
import { ReportButton } from './Interact';
import { k } from './k';

const ago = (iso: string) => { const m = (Date.now() - Date.parse(iso)) / 60e3; if (m < 1) return '방금'; if (m < 60) return `${Math.floor(m)}분 전`; if (m < 1440) return `${Math.floor(m / 60)}시간 전`; return `${Math.floor(m / 1440)}일 전`; };

export default function Comments({ episodeId, initial, signedIn }: { episodeId: number; initial: Comment[]; signedIn: boolean }) {
  const [list, setList] = useState(initial), [txt, setTxt] = useState(''), [busy, setBusy] = useState(false);
  return (
    <section className={k('cmts')} aria-label="댓글">
      <b>댓글 {list.length.toLocaleString()}</b>
      <form onSubmit={async (e) => {
        e.preventDefault(); const v = txt.trim(); if (!v || busy) return;
        setBusy(true); const j = await call<{ comment: Comment }>('comments', { episodeId, body: v }); setBusy(false);
        if (j) { const best = list.filter((c) => c.best); setList([...best, j.comment, ...list.filter((c) => !c.best)]); setTxt(''); toast('댓글을 남겼어요'); }
      }}>
        <label htmlFor="cmIn" className={k('sr')}>댓글 쓰기</label>
        <input id="cmIn" maxLength={500} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={signedIn ? '따뜻한 댓글을 남겨 주세요' : '로그인하면 댓글을 쓸 수 있어요'} autoComplete="off" />
        <button className={k('btn go')} disabled={busy}>등록</button>
      </form>
      {!list.length && <p className={k('muted')}>첫 댓글을 남겨 주세요.</p>}
      {list.map((c) => (
        <div className={k('cmt')} key={c.id}>
          <div className={k('h')}>{c.best && <span className={k('best')}>BEST</span>}<b>{c.nickname}</b><span>{ago(c.created_at)}</span></div>
          <p>{c.body}</p>
          <div className={k('f')}>
            <button disabled={c.liked} onClick={async () => { const j = await call<{ likes: number }>(`comments/${c.id}/like`, {}); if (j) setList((L) => L.map((x) => (x.id === c.id ? { ...x, likes: j.likes, liked: true } : x))); }}>좋아요 <span className={k('tnum')}>{c.likes}</span></button>
            {c.mine ? <button onClick={async () => { const j = await call(`comments/${c.id}`, undefined, 'DELETE'); if (j) { setList((L) => L.filter((x) => x.id !== c.id)); toast('댓글을 지웠어요'); } }}>삭제</button> : <ReportButton type="comment" id={c.id} />}
          </div>
        </div>
      ))}
    </section>
  );
}
