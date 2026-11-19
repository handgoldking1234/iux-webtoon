'use client';
import { useState } from 'react';

type R = { ok: boolean; engine?: string; model?: string; ms: number; data?: unknown; tokens?: [number, number]; image?: string; bytes?: number; code?: string; message?: string };

/** 실제 키로 글 1번 · 그림 1장을 불러 봐요 */
export default function AiTest({ textReady, imageReady }: { textReady: boolean; imageReady: boolean }) {
  const [busy, setBusy] = useState<string | null>(null), [res, setRes] = useState<Record<string, R>>({});
  const run = async (kind: 'text' | 'image') => {
    setBusy(kind);
    try {
      const r = await fetch('/api/admin/ai-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind }) });
      const j = (await r.json()) as R;
      setRes((x) => ({ ...x, [kind]: j }));
    } catch (e) { setRes((x) => ({ ...x, [kind]: { ok: false, ms: 0, message: String(e) } })); }
    setBusy(null);
  };
  const Out = ({ r }: { r?: R }) => !r ? null : r.ok ? (
    <div className="msg ok" style={{ display: 'grid', gap: 6 }}>
      <b>성공 · {r.engine} · {r.model} · {(r.ms / 1000).toFixed(1)}초{r.tokens ? ` · 토큰 ${r.tokens[0]}+${r.tokens[1]}` : ''}{r.bytes ? ` · ${(r.bytes / 1024).toFixed(0)}KB` : ''}</b>
      {r.data !== undefined && <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(r.data, null, 1)}</code>}
      {r.image && <img src={r.image} alt="시험으로 만든 그림" style={{ maxWidth: 240, borderRadius: 8 }} />}
    </div>
  ) : <div className="msg bad"><b>실패 · {r.code || '오류'}</b> {r.message}</div>;
  return (
    <div className="card">
      <div className="hd"><h2>AI 연결 시험</h2><span className="note r">실제로 1번 부르고 사용량에 기록돼요</span></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn pri" disabled={!textReady || !!busy} onClick={() => run('text')}>{busy === 'text' ? '부르는 중…' : '글 AI 시험'}</button>
        <button className="btn pri" disabled={!imageReady || !!busy} onClick={() => run('image')}>{busy === 'image' ? '그리는 중… (10~40초)' : '이미지 AI 시험'}</button>
      </div>
      {!textReady && <p className="note">글 AI 키가 없어요 (ANTHROPIC_API_KEY)</p>}
      {!imageReady && <p className="note">이미지 AI 키가 없어요 (GEMINI_API_KEY)</p>}
      <Out r={res.text} /><Out r={res.image} />
    </div>
  );
}
