'use client';
import { useState } from 'react';

type R = { model: string; engine: string; ok: boolean; ms: number; data?: unknown; tokens?: [number, number]; usd?: number | null; krw?: number | null; code?: string; message?: string };

/* 대사 글맛 지침 — 편집기가 보내는 것과 같은 내용 */
const CRAFT = `Dialogue craft (Korean webtoon — this matters most):
- Write like real people talk, not like a narrator explaining. Never state feelings outright; show them with subtext, reactions, interruptions, trailing off (…), a one-word reply, or silence.
- Give each character a distinct voice: speech level (반말/존댓말), habits, era. Historical settings use period speech (e.g. 조선: 하오체/하게체, 전하·소인 호칭); modern slang only for modern characters.
- No exposition dumps: the picture already shows what happens. A line should add what the picture cannot — intent, humor, tension, a secret.
- Vary rhythm: mostly short punchy balloons, one longer line only at an emotional peak. End the episode on a hook.
- Avoid translation-ese and clichés. Prefer natural spoken endings.`;

const SAMPLES: [string, string][] = [
  ['대사 쓰기 (사극 8컷)', `You write dialogue for a Korean vertical-scroll webtoon episode. Write Korean lines for each panel below.
${CRAFT}
Story bible: 세종대왕(위엄 있지만 호기심 많음, 하오체) · 장영실(충직한 발명가, 존댓말·소인) · 라온(경회루 연못에 떨어진 별에서 나온 소녀, 말을 모르고 소리만 따라 함).
Line formats: "이름: 대사", inner voice "이름(속마음): …", shout "이름(외침): …", narration "나레이션: …", sound effect "효과음: 쾅!". Some panels may stay silent. Keep each balloon short (max ~12 Korean characters per line).
Panels (in reading order):
#1 scene: 한밤 경회루, 하늘에서 푸른 빛줄기가 연못으로 떨어진다
#2 scene: 물보라 속에서 빛나는 소녀가 천천히 일어선다
#3 scene: 숨어서 지켜보던 장영실이 놀라 뒷걸음친다
#4 scene: 세종이 등불을 들고 다가온다
#5 scene: 소녀가 세종의 말을 그대로 따라 한다
#6 scene: 세종이 땅에 소리를 그림처럼 그려 보인다
#7 scene: 소녀의 가슴의 빛이 글자 모양으로 깜빡인다
#8 scene: 세종이 미소 지으며 무언가를 결심한다
Answer JSON only: {"panels":[{"no":<panel no>,"lines":["..."]}]}`],
  ['스토리 쓰기 (현대 로맨스 4컷)', `You are a veteran Korean webtoon writer. Write a complete 4-panel Korean webtoon story (기-승-전-결, setup → development → twist → punchline) about two coworkers who keep leaving secret notes on the office fridge.
${CRAFT}
Format — plain text: 4 numbered scenes. Each scene starts with "N. " + one or two sentences of what we see, then dialogue lines under it as "- 이름: 대사".
Answer JSON only: {"title":"","story":"(the whole story text)"}`],
];

const SETS: [string, string[]][] = [
  ['최상위끼리', ['claude-fable-5-2', 'claude-opus-5-5', 'gpt-6.2-astra']],
  ['중간값끼리', ['claude-opus-5-5', 'claude-sonnet-5-5', 'gpt-6.2-sol']],
];
const DEFAULT = SETS[0][1];

function Lines({ data }: { data: unknown }) {
  const d = data as { panels?: { no: number; lines?: string[] }[]; story?: string; title?: string } | undefined;
  if (d?.panels) return <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>{d.panels.map((p) => <li key={p.no}>{(p.lines || []).length ? (p.lines || []).map((l, i) => <div key={i}>{l}</div>) : <span className="note">(대사 없음)</span>}</li>)}</ol>;
  if (d?.story) return <div style={{ whiteSpace: 'pre-wrap' }}>{d.title && <b style={{ display: 'block', marginBottom: 6 }}>{d.title}</b>}{d.story}</div>;
  return <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(data, null, 1)}</code>;
}

/** 같은 요청을 여러 모델에 동시에 보내 나란히 비교해요 (관리자만 · 실제 비용이 들어요) */
export default function Compare() {
  const [prompt, setPrompt] = useState(SAMPLES[0][1]), [models, setModels] = useState(DEFAULT);
  const [busy, setBusy] = useState(false), [res, setRes] = useState<R[] | null>(null), [error, setError] = useState('');
  const run = async () => {
    setBusy(true); setError(''); setRes(null);
    try {
      const r = await fetch('/api/admin/ai-compare', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, models }) });
      const j = await r.json();
      if (!r.ok) setError(j.message || '비교하지 못했어요'); else setRes(j.results);
    } catch (e) { setError(String(e)); }
    setBusy(false);
  };
  return (
    <div className="card">
      <div className="hd"><h2>글 AI 비교</h2><span className="note r">같은 요청을 모델마다 1번씩 보내요 · 실제 비용이 들어요</span></div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {SAMPLES.map(([l, p]) => <button key={l} type="button" className="btn" onClick={() => setPrompt(p)}>{l}</button>)}
        <span style={{ flex: 1 }} />
        {SETS.map(([l, m]) => <button key={l} type="button" className="btn" onClick={() => setModels(m)}>{l}</button>)}
      </div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={8} style={{ width: '100%', font: '12px/1.6 ui-monospace,monospace', padding: 10, border: '1px solid var(--line)', borderRadius: 8 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0' }}>
        {models.map((m, i) => <input key={i} value={m} onChange={(e) => setModels((x) => x.map((v, k) => (k === i ? e.target.value : v)))} placeholder="모델 이름" style={{ flex: '1 1 160px', height: 34, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 8 }} />)}
        <button className="btn pri" disabled={busy || !prompt.trim()} onClick={run}>{busy ? '쓰는 중… (30초~2분)' : '나란히 비교'}</button>
      </div>
      <p className="note">claude-… 는 Claude, gpt-… 는 ChatGPT로 보내요. ChatGPT는 Vercel에 OPENAI_API_KEY가 있어야 해요.</p>
      {error && <div className="msg bad">{error}</div>}
      {res && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${res.length}, minmax(0,1fr))`, gap: 12, marginTop: 10 }}>
        {res.map((r) => <div key={r.model} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, minWidth: 0, fontSize: 13, lineHeight: 1.7 }}>
          <b style={{ display: 'block' }}>{r.model}</b>
          <span className="note">{r.ok ? `${(r.ms / 1000).toFixed(1)}초 · 토큰 ${r.tokens?.[0]}+${r.tokens?.[1]}${r.krw != null ? ` · 약 ${r.krw.toLocaleString()}원 ($${r.usd?.toFixed(3)})` : ' · 가격표에 없는 모델'}` : `실패 · ${r.code}`}</span>
          <div style={{ marginTop: 8 }}>{r.ok ? <Lines data={r.data} /> : <span className="msg bad" style={{ display: 'block' }}>{r.message}</span>}</div>
        </div>)}
      </div>}
    </div>
  );
}
