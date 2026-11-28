'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AGES, GENRES } from '@/lib/read/config';
import { call, toast } from './client';
import { Ic } from './Icons';
import { k } from './k';

type S = { id: string; title: string; authorName: string; genre: string; age: string; description: string };
type E = { no: number; title: string; authorNote: string; hidden: boolean };

/** 그림 파일을 정해진 크기로 잘라요 (가운데 · 세로 대표 이미지는 위쪽 기준) */
async function cropTo(file: File, W: number, H: number, top = false): Promise<Blob> {
  const im = await createImageBitmap(file);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!, z = Math.max(W / im.width, H / im.height), dw = im.width * z, dh = im.height * z;
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.imageSmoothingQuality = 'high';
  x.drawImage(im, (W - dw) / 2, top ? 0 : (H - dh) / 2, dw, dh);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('img'))), 'image/jpeg', 0.9));
}
const putUp = async (u: { url: string; method: string }, b: Blob) => {
  const r = await fetch(u.url, { method: u.method, headers: { 'content-type': 'image/jpeg', 'x-upsert': 'true' }, body: b, credentials: 'omit' });
  if (!r.ok) throw new Error('upload');
};
type Up = { dir: string; up: Record<string, { url: string; method: string }> };

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className={k('ovl')} role="dialog" aria-modal="true" aria-label={title} onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className={k('osheet')}><h2>{title}</h2>{children}</div>
    </div>
  );
}

/** 작품 정보 고치기 — 작가 본인에게만 보여요 */
export function SeriesEdit({ s, eps }: { s: S; eps: E[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const [f, setF] = useState(s), [ep, setEp] = useState<E | null>(null);
  const set = (key: keyof S, v: string) => setF((x) => ({ ...x, [key]: v }));
  const okS = f.title.trim() && f.authorName.trim() && f.description.trim().length >= 20;
  const save = async (payload: unknown, done: string) => {
    setBusy(true);
    const j = await call(`series/${s.id}`, payload, 'PATCH');
    setBusy(false);
    if (!j) return false;
    toast(done); router.refresh(); return true;
  };
  /** 이미지 다시 올리기 — 대표 이미지(세로 · 정사각형을 한 번에) 또는 회차 썸네일 */
  const reArt = async (file: File | undefined, epNo?: number) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('그림 파일을 골라 주세요'); return; }
    setBusy(true);
    try {
      const j = await call<Up>(`series/${s.id}`, { kind: epNo ? 'ep' : 'cover' });
      if (!j) return;
      if (epNo) await putUp(j.up.ep, await cropTo(file, 404, 180));
      else { await putUp(j.up.vt, await cropTo(file, 1080, 1920, true)); await putUp(j.up.sq, await cropTo(file, 1080, 1080)); }
      if (await call(`series/${s.id}`, { art: { dir: j.dir, epNo } }, 'PATCH')) { toast(epNo ? `${epNo}화 썸네일을 바꿨어요` : '대표 이미지를 바꿨어요'); router.refresh(); }
    } catch { toast('이미지를 올리지 못했어요 · 잠시 뒤 다시 해 주세요'); } finally { setBusy(false); }
  };
  return (
    <>
      <button className={k('editic')} aria-label="연재 수정" title="연재 수정" onClick={() => { setF(s); setOpen(true); }}><Ic n="pen" /></button>
      {open && !ep && (
        <Sheet title="연재 수정" onClose={() => setOpen(false)}>
          <label className={k('field')}><span>작품 제목</span><input type="text" maxLength={40} value={f.title} onChange={(e) => set('title', e.target.value)} /></label>
          <label className={k('field')}><span>필명</span><input type="text" maxLength={20} value={f.authorName} onChange={(e) => set('authorName', e.target.value)} /></label>
          <div className={k('two')}>
            <label className={k('field')}><span>장르</span><select value={f.genre} onChange={(e) => set('genre', e.target.value)}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></label>
            <label className={k('field')}><span>이용 연령</span><select value={f.age} onChange={(e) => set('age', e.target.value)}>{AGES.map((a) => <option key={a[0]} value={a[0]}>{a[1]}{a[0] === 'all' ? '' : ' 이상'}</option>)}</select></label>
          </div>
          <label className={k('field')}><span>작품 소개 <small>{f.description.trim().length} / 300자 · 20자 이상</small></span><textarea maxLength={300} value={f.description} onChange={(e) => set('description', e.target.value)} /></label>
          <div className={k('obtn')}><button className={k('btn')} onClick={() => setOpen(false)}>닫기</button><button className={k('btn go')} disabled={busy || !okS} onClick={async () => { if (await save({ series: f }, '작품 정보를 고쳤어요')) setOpen(false); }}>저장</button></div>
          <h3>대표 이미지</h3>
          <div className={k('oart')}>
            <label className={k('btn')} aria-disabled={busy}>{busy ? '올리는 중…' : '이미지 다시 올리기'}<input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; reArt(f); }} /></label>
            <small>세로로 긴 그림이 좋아요 · 세로(1080×1920)와 정사각형(1080×1080)으로 알아서 잘라 넣어요</small>
          </div>
          <h3>회차</h3>
          {!eps.length && <p className={k('muted')}>아직 올린 회차가 없어요</p>}
          <ul className={k('oeps')}>{eps.map((e) => (
            <li key={e.no}><span><b>{e.no}화</b> {e.title}{e.hidden ? ' · 숨김' : ''}</span>
              <button className={k('btn')} onClick={() => setEp(e)}>고치기</button>
              <label className={k('btn')} title="회차 목록에 보이는 작은 그림 (404×180)">썸네일<input type="file" accept="image/*" hidden disabled={busy} onChange={(ev) => { const f = ev.target.files?.[0]; ev.target.value = ''; reArt(f, e.no); }} /></label>
              <button className={k('btn')} disabled={busy} onClick={() => save({ episode: { no: e.no, hidden: !e.hidden } }, e.hidden ? '다시 공개했어요' : '숨겼어요 · 독자에게 안 보여요')}>{e.hidden ? '다시 공개' : '숨기기'}</button></li>
          ))}</ul>
          <p className={k('muted')} style={{ fontSize: 12.5 }}>본문 컷을 바꾸려면 편집기에서 고친 뒤 새 회차로 올리고, 예전 회차는 숨겨 주세요.</p>
        </Sheet>
      )}
      {open && ep && (
        <Sheet title={`${ep.no}화 고치기`} onClose={() => setEp(null)}>
          <label className={k('field')}><span>회차 제목</span><input type="text" maxLength={60} value={ep.title} onChange={(e) => setEp({ ...ep, title: e.target.value })} /></label>
          <label className={k('field')}><span>작가의 말 <small>{ep.authorNote.trim().length} / 500자</small></span><textarea maxLength={500} value={ep.authorNote} onChange={(e) => setEp({ ...ep, authorNote: e.target.value })} /></label>
          <div className={k('obtn')}><button className={k('btn')} onClick={() => setEp(null)}>뒤로</button><button className={k('btn go')} disabled={busy || !ep.title.trim()} onClick={async () => { if (await save({ episode: { no: ep.no, title: ep.title, authorNote: ep.authorNote } }, '회차를 고쳤어요')) setEp(null); }}>저장</button></div>
        </Sheet>
      )}
    </>
  );
}
