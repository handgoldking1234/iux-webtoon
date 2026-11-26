'use client';
import { useEffect, useState } from 'react';

/** 그림 저장소를 R2로 옮기기 — 버튼 한 번이면 끝까지 이어서 옮겨요 (이미 옮긴 파일은 건너뛰어요) */
export default function R2Move() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false), [log, setLog] = useState(''), [tot, setTot] = useState({ moved: 0, skipped: 0, failed: 0 });
  useEffect(() => { fetch('/api/admin/r2-move').then((r) => r.json()).then((j) => setReady(!!j.ready)).catch(() => setReady(false)); }, []);
  const run = async () => {
    setBusy(true); setLog('옮기는 중…'); let next: string[] | null = null; const t = { moved: 0, skipped: 0, failed: 0 };
    try {
      for (let i = 0; i < 500; i++) {
        const r = await fetch('/api/admin/r2-move', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ next }) });
        const j = await r.json();
        if (!r.ok) { setLog(j.message || '옮기지 못했어요'); break; }
        t.moved += j.moved; t.skipped += j.skipped; t.failed += j.failed.length; setTot({ ...t });
        if (j.done) { setLog(t.failed ? `끝났어요 · 실패 ${t.failed}개는 다시 누르면 다시 시도해요` : '끝났어요 · 모든 그림이 R2에 있어요'); break; }
        next = j.next; setLog(`옮기는 중… (남은 폴더 · 파일 ${j.next.length}개 살펴보는 중)`);
      }
    } catch (e) { setLog(String(e)); }
    setBusy(false);
  };
  return (
    <div className="card">
      <div className="hd"><h2>그림 저장소 · Cloudflare R2</h2><span className="note r">{ready === null ? '확인 중…' : ready ? 'R2 연결됨 · 새 그림은 R2에 저장돼요' : 'R2 연결 전 · Supabase 저장소를 써요'}</span></div>
      <p className="note">예전 그림(Supabase)을 R2로 복사해요. 원본은 지우지 않아요 · 옮기는 동안에도 R2에 없는 그림은 예전 저장소에서 보여 줘요.</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
        <button className="btn pri" disabled={!ready || busy} onClick={run}>{busy ? '옮기는 중…' : '예전 그림 R2로 옮기기'}</button>
        {(tot.moved || tot.skipped || tot.failed) ? <span className="note">옮김 {tot.moved} · 이미 있음 {tot.skipped} · 실패 {tot.failed}</span> : null}
      </div>
      {log && <p className="note" style={{ marginTop: 8 }}>{log}</p>}
    </div>
  );
}
