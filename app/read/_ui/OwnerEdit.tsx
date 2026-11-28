'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AGES, GENRES } from '@/lib/read/config';
import { call, toast } from './client';
import { Ic } from './Icons';
import { k } from './k';

type S = { id: string; title: string; authorName: string; genre: string; age: string; description: string; paused: boolean; nextNo: number };
type E = { no: number; title: string; authorNote: string; hidden: boolean; publishAt: string };
type Up = { url: string; method: string };

/** 그림을 정해진 크기로 잘라요 (가운데 · 세로 대표 이미지는 위쪽 기준) */
async function cropTo(src: Blob, W: number, H: number, top = false): Promise<Blob> {
  const im = await createImageBitmap(src);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!, z = Math.max(W / im.width, H / im.height), dw = im.width * z, dh = im.height * z;
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.imageSmoothingQuality = 'high';
  x.drawImage(im, (W - dw) / 2, top ? 0 : (H - dh) / 2, dw, dh);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('img'))), 'image/jpeg', 0.9));
}
/** 원고 그림 한 장 — 너비 1380까지 줄이고 JPG로 (GIF는 그대로) */
async function fitCut(f: File): Promise<{ blob: Blob; w: number; h: number }> {
  const im = await createImageBitmap(f);
  if (f.type === 'image/gif') return { blob: f, w: im.width, h: im.height };
  const W = Math.min(1380, im.width), H = Math.round(im.height * W / im.width);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!; x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, W, H);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('img'))), 'image/jpeg', 0.9));
  return { blob, w: W, h: H };
}
const putUp = async (u: Up, b: Blob) => {
  const r = await fetch(u.url, { method: u.method, headers: { 'content-type': b.type || 'image/jpeg', 'x-upsert': 'true' }, body: b, credentials: u.method === 'POST' ? 'same-origin' : 'omit' });
  if (!r.ok) throw new Error('upload');
};
/** datetime-local 칸에 넣을 값 (내 시간대) */
const localDT = (iso: string) => { const d = new Date(iso), p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const whenText = (iso: string) => new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className={k('ovl')} role="dialog" aria-modal="true" aria-label={title} onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className={k('osheet')}><h2>{title}</h2>{children}</div>
    </div>
  );
}

/** 제목 옆 연필 · 휴지통 — 작가 본인에게만 보여요 */
export function SeriesEdit({ s, eps }: { s: S; eps: E[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<'' | 'edit' | 'del'>(''), [busy, setBusy] = useState(false);
  const [f, setF] = useState(s), [ep, setEp] = useState<(E & { at: string; later: boolean }) | null>(null);
  const set = (key: 'title' | 'authorName' | 'genre' | 'age' | 'description', v: string) => setF((x) => ({ ...x, [key]: v }));
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
      const j = await call<{ dir: string; up: Record<string, Up> }>(`series/${s.id}`, { kind: epNo ? 'ep' : 'cover' });
      if (!j) return;
      if (epNo) await putUp(j.up.ep, await cropTo(file, 404, 180));
      else { await putUp(j.up.vt, await cropTo(file, 1080, 1920, true)); await putUp(j.up.sq, await cropTo(file, 1080, 1080)); }
      if (await call(`series/${s.id}`, { art: { dir: j.dir, epNo } }, 'PATCH')) { toast(epNo ? `${epNo}화 썸네일을 바꿨어요` : '대표 이미지를 바꿨어요'); router.refresh(); }
    } catch { toast('이미지를 올리지 못했어요 · 잠시 뒤 다시 해 주세요'); } finally { setBusy(false); }
  };
  const epState = (e: E) => (e.hidden ? '숨김' : Date.parse(e.publishAt) > Date.now() ? `${whenText(e.publishAt)} 공개 예약` : '공개 중');
  return (
    <>
      <button className={k('editic')} aria-label="연재 수정" title="연재 수정" onClick={() => { setF(s); setOpen('edit'); }}><Ic n="pen" /></button>
      <button className={k('editic')} aria-label="작품 삭제" title="작품 삭제 · 휴지통으로" onClick={() => setOpen('del')}><Ic n="trash" /></button>
      {open === 'del' && (
        <Sheet title="작품을 휴지통에 넣을까요?" onClose={() => setOpen('')}>
          <p>「{s.title}」과 회차가 모두 독자에게 안 보이게 돼요. <b>30일 안에는</b> 「내 연재 › 휴지통」에서 되살릴 수 있고, 30일이 지나면 완전히 지워져요.</p>
          <p className={k('muted')} style={{ fontSize: 13 }}>잠깐만 내리고 싶다면 삭제 대신 연재 수정의 「작품 잠깐 숨기기」를 쓰세요.</p>
          <div className={k('obtn')}><button className={k('btn')} onClick={() => setOpen('')}>취소</button><button className={k('btn danger')} disabled={busy} onClick={async () => { if (await save({ trash: { on: true } }, '휴지통에 넣었어요 · 내 연재에서 되살릴 수 있어요')) router.push('/read/publish'); }}>휴지통에 넣기</button></div>
        </Sheet>
      )}
      {open === 'edit' && !ep && (
        <Sheet title="연재 수정" onClose={() => setOpen('')}>
          <label className={k('field')}><span>작품 제목</span><input type="text" maxLength={40} value={f.title} onChange={(e) => set('title', e.target.value)} /></label>
          <label className={k('field')}><span>필명</span><input type="text" maxLength={20} value={f.authorName} onChange={(e) => set('authorName', e.target.value)} /></label>
          <div className={k('two')}>
            <label className={k('field')}><span>장르</span><select value={f.genre} onChange={(e) => set('genre', e.target.value)}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></label>
            <label className={k('field')}><span>이용 연령</span><select value={f.age} onChange={(e) => set('age', e.target.value)}>{AGES.map((a) => <option key={a[0]} value={a[0]}>{a[1]}{a[0] === 'all' ? '' : ' 이상'}</option>)}</select></label>
          </div>
          <label className={k('field')}><span>작품 소개 <small>{f.description.trim().length} / 300자 · 20자 이상</small></span><textarea maxLength={300} value={f.description} onChange={(e) => set('description', e.target.value)} /></label>
          <div className={k('obtn')}><button className={k('btn')} onClick={() => setOpen('')}>닫기</button><button className={k('btn go')} disabled={busy || !okS} onClick={async () => { if (await save({ series: { title: f.title, authorName: f.authorName, genre: f.genre, age: f.age, description: f.description } }, '작품 정보를 고쳤어요')) setOpen(''); }}>저장</button></div>
          <h3>대표 이미지</h3>
          <div className={k('oart')}>
            <label className={k('btn')} aria-disabled={busy}>{busy ? '올리는 중…' : '이미지 다시 올리기'}<input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ''; reArt(x); }} /></label>
            <small>세로로 긴 그림이 좋아요 · 세로(1080×1920)와 정사각형(1080×1080)으로 알아서 잘라 넣어요</small>
          </div>
          <h3>공개 상태</h3>
          <div className={k('oart')}>
            <button className={k('btn')} disabled={busy} onClick={() => save({ paused: !s.paused }, s.paused ? '다시 공개했어요' : '작품을 숨겼어요 · 나만 볼 수 있어요')}>{s.paused ? '작품 다시 공개하기' : '작품 잠깐 숨기기'}</button>
            <small>{s.paused ? '지금은 숨김 상태예요 · 독자에게 안 보이고 목록 · 랭킹에서도 빠져 있어요' : '숨기면 독자에게 안 보여요 · 조회수 · 별점 · 댓글 · 관심은 그대로 남아요'}</small>
          </div>
          <h3>회차</h3>
          {!eps.length && <p className={k('muted')}>아직 올린 회차가 없어요</p>}
          <ul className={k('oeps')}>{eps.map((e) => (
            <li key={e.no}><span><b>{e.no}화</b> {e.title} <small>· {epState(e)}</small></span>
              <button className={k('btn')} onClick={() => setEp({ ...e, at: localDT(e.publishAt), later: Date.parse(e.publishAt) > Date.now() })}>고치기 · 예약</button>
              <label className={k('btn')} title="회차 목록에 보이는 작은 그림 (404×180)">썸네일<input type="file" accept="image/*" hidden disabled={busy} onChange={(ev) => { const x = ev.target.files?.[0]; ev.target.value = ''; reArt(x, e.no); }} /></label>
              <button className={k('btn')} disabled={busy} onClick={() => save({ episode: { no: e.no, hidden: !e.hidden } }, e.hidden ? '다시 공개했어요' : '숨겼어요 · 독자에게 안 보여요')}>{e.hidden ? '다시 공개' : '숨기기'}</button>
              <button className={k('btn')} disabled={busy} aria-label={`${e.no}화 삭제`} title="휴지통으로 · 30일 안에 되살릴 수 있어요" onClick={() => { if (window.confirm(`${e.no}화를 휴지통에 넣을까요?\n30일 안에는 「내 연재 › 휴지통」에서 되살릴 수 있어요.`)) save({ trash: { on: true, epNo: e.no } }, `${e.no}화를 휴지통에 넣었어요`); }}><Ic n="trash" /></button></li>
          ))}</ul>
          <p className={k('muted')} style={{ fontSize: 12.5 }}>본문 컷을 바꾸려면 편집기 「연재하기」에서 「N화 그림만 다시 올리기」를 고르세요.</p>
        </Sheet>
      )}
      {open === 'edit' && ep && (
        <Sheet title={`${ep.no}화 고치기`} onClose={() => setEp(null)}>
          <label className={k('field')}><span>회차 제목</span><input type="text" maxLength={60} value={ep.title} onChange={(e) => setEp({ ...ep, title: e.target.value })} /></label>
          <label className={k('field')}><span>작가의 말 <small>{ep.authorNote.trim().length} / 500자</small></span><textarea maxLength={500} value={ep.authorNote} onChange={(e) => setEp({ ...ep, authorNote: e.target.value })} /></label>
          <div className={k('field')}><span>공개 시점</span>
            <div className={k('oseg')}>
              <label><input type="radio" name="oWhen" checked={!ep.later} onChange={() => setEp({ ...ep, later: false })} /> {Date.parse(ep.publishAt) > Date.now() ? '지금 바로 공개' : '그대로 (공개 중)'}</label>
              <label><input type="radio" name="oWhen" checked={ep.later} onChange={() => setEp({ ...ep, later: true })} /> 예약</label>
            </div>
            {ep.later && <input type="datetime-local" value={ep.at} onChange={(e) => setEp({ ...ep, at: e.target.value })} />}
            {ep.later && <small style={{ marginLeft: 0 }}>예약한 시각이 되면 저절로 공개돼요 · 그때까지는 나만 볼 수 있어요</small>}
          </div>
          <div className={k('obtn')}><button className={k('btn')} onClick={() => setEp(null)}>뒤로</button><button className={k('btn go')} disabled={busy || !ep.title.trim() || (ep.later && !ep.at)} onClick={async () => {
            const was = Date.parse(ep.publishAt) > Date.now();
            const publishAt = ep.later ? new Date(ep.at).toISOString() : was ? new Date().toISOString() : undefined;
            if (ep.later && Date.parse(publishAt!) <= Date.now()) { toast('예약은 지금보다 뒤 시각으로 골라 주세요'); return; }
            if (await save({ episode: { no: ep.no, title: ep.title, authorNote: ep.authorNote, publishAt } }, ep.later ? '예약해 두었어요' : '회차를 고쳤어요')) setEp(null);
          }}>저장</button></div>
        </Sheet>
      )}
    </>
  );
}

/** 다음 화 올리기 — 편집기에서 올리거나, 갖고 있는 그림 파일만으로 바로 올려요 */
export function NextEpisode({ seriesId, nextNo }: { seriesId: string; nextNo: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState('');
  const [files, setFiles] = useState<File[]>([]), [thumb, setThumb] = useState<File | null>(null);
  const [title, setTitle] = useState(''), [note, setNote] = useState(''), [ai, setAi] = useState(''), [later, setLater] = useState(false), [at, setAt] = useState(''), [agree, setAgree] = useState(false);
  const add = (list: FileList | null) => {
    const L = Array.from(list || []).filter((x) => /^image\/(jpeg|png|webp|gif)$/.test(x.type)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (list && L.length < list.length) toast('JPG · PNG · WEBP · GIF만 올릴 수 있어요');
    setFiles((x) => [...x, ...L].slice(0, 120));
  };
  const move = (i: number, d: number) => setFiles((x) => { const y = x.slice(), j = i + d; if (j < 0 || j >= y.length) return x; [y[i], y[j]] = [y[j], y[i]]; return y; });
  const miss = !files.length ? '원고 그림' : !title.trim() ? '회차 제목' : note.trim().length < 10 ? '작가의 말 10자 이상' : !ai ? 'AI 활용 표시' : later && !at ? '공개 일시' : !agree ? '확인' : '';
  const go = async () => {
    if (miss) { toast('아직 채울 게 있어요 · ' + miss); return; }
    if (later && Date.parse(at) <= Date.now()) { toast('예약은 지금보다 뒤 시각으로 골라 주세요'); return; }
    try {
      setBusy('그림 준비 중…');
      const cuts: { blob: Blob; w: number; h: number }[] = [];
      for (const x of files) cuts.push(await fitCut(x));
      const th = await cropTo(thumb || files[0], 404, 180, !thumb);
      const d = await call<{ id: string; uploads: Up[]; art: Record<string, Up> }>('drafts', { ai: ai === 'yes', art: { ep: true }, source: { ep: { num: nextNo, title } }, cuts: cuts.map((c) => ({ w: c.w, h: c.h, type: c.blob.type || 'image/jpeg', bytes: c.blob.size })) });
      if (!d) return;
      if (d.art?.ep) await putUp(d.art.ep, th);
      for (let i = 0; i < cuts.length; i++) { setBusy(`${i + 1} / ${cuts.length} 장 올리는 중…`); await putUp(d.uploads[i], cuts[i].blob); }
      setBusy('연재관에 올리는 중…');
      if (!(await call(`drafts/${d.id}`, {}))) return;
      const j = await call<{ url: string }>('publish', { draftId: d.id, agree: true, ai: ai === 'yes', seriesId, episode: { title, authorNote: note, publishAt: later ? new Date(at).toISOString() : null } });
      if (!j) return;
      toast(later ? '예약해 두었어요' : `${nextNo}화를 올렸어요`);
      setOpen(false); setFiles([]); setThumb(null); setTitle(''); setNote(''); setAgree(false);
      router.refresh();
    } catch { toast('올리지 못했어요 · 잠시 뒤 다시 해 주세요'); } finally { setBusy(''); }
  };
  return (
    <>
      <button className={k('btn big')} onClick={() => setOpen(true)}>다음 화 올리기</button>
      {open && (
        <Sheet title={`${nextNo}화 올리기`} onClose={() => { if (!busy) setOpen(false); }}>
          <div className={k('oway')}>
            <a className={k('btn')} href="/studio"><Ic n="pen" />편집기에서 만들어 올리기</a>
            <small>말풍선 · 콘티 · AI 그림까지 편집기에서 만들고 「연재하기」로 올려요</small>
          </div>
          <h3>그림 파일로 바로 올리기</h3>
          <p className={k('muted')} style={{ fontSize: 13, margin: 0 }}>다 그려 둔 원고가 있으면 그림만 골라 올려요. 위에서 아래 순서로 이어 붙여 보여요 · JPG · PNG · WEBP · GIF · 최대 120장</p>
          <label className={k('odrop')}><Ic n="image" /><b>원고 그림 고르기</b><small>여러 장을 한꺼번에 골라도 돼요 · 파일 이름 순서로 놓여요</small><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden disabled={!!busy} onChange={(e) => { add(e.target.files); e.target.value = ''; }} /></label>
          {files.length > 0 && <ol className={k('ofiles')}>{files.map((x, i) => (
            <li key={x.name + x.size + i}><span className={k('tnum')}>{i + 1}</span><span className={k('nm')}>{x.name}</span>
              <button type="button" aria-label="위로" disabled={i === 0} onClick={() => move(i, -1)}>↑</button><button type="button" aria-label="아래로" disabled={i === files.length - 1} onClick={() => move(i, 1)}>↓</button><button type="button" aria-label="빼기" onClick={() => setFiles((y) => y.filter((_, j) => j !== i))}>×</button></li>
          ))}</ol>}
          <label className={k('field')}><span>회차 제목</span><input type="text" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 붉은 등 아래" /></label>
          <label className={k('field')}><span>작가의 말 <small>{note.trim().length} / 500자 · 10자 이상</small></span><textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="회차 끝에 보여요 · 이번 화 이야기, 다음 화 예고" /></label>
          <div className={k('oart')}>
            <label className={k('btn')}>{thumb ? '썸네일 바꾸기' : '회차 썸네일 고르기'}<input type="file" accept="image/*" hidden onChange={(e) => { setThumb(e.target.files?.[0] || null); e.target.value = ''; }} /></label>
            <small>{thumb ? thumb.name : '안 고르면 첫 그림의 윗부분으로 만들어요 (404×180)'}</small>
          </div>
          <div className={k('field')}><span>공개 시점</span>
            <div className={k('oseg')}><label><input type="radio" name="nWhen" checked={!later} onChange={() => setLater(false)} /> 지금 바로</label><label><input type="radio" name="nWhen" checked={later} onChange={() => setLater(true)} /> 예약</label></div>
            {later && <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />}
          </div>
          <div className={k('field')}><span>AI 활용 표시</span>
            <div className={k('oseg')}><label><input type="radio" name="nAi" checked={ai === 'yes'} onChange={() => setAi('yes')} /> AI 그림 · 글을 썼어요</label><label><input type="radio" name="nAi" checked={ai === 'no'} onChange={() => setAi('no')} /> 직접 그렸어요</label></div>
          </div>
          <label className={k('oagree')}><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>제가 만들었거나 쓸 권리가 있는 그림만 올리고, 이용 연령에 맞게 표시했어요. <a href="/read/policy" target="_blank">운영정책</a>을 어기면 숨김 처리될 수 있어요.</span></label>
          <div className={k('obtn')}><small className={k('muted')} style={{ marginRight: 'auto', alignSelf: 'center' }}>{busy || (miss ? `남은 항목 · ${miss}` : '올릴 준비 끝')}</small><button className={k('btn')} disabled={!!busy} onClick={() => setOpen(false)}>취소</button><button className={k('btn go')} disabled={!!busy} style={miss ? { opacity: 0.55 } : undefined} onClick={go}>{later ? '예약하기' : '올리기'}</button></div>
        </Sheet>
      )}
    </>
  );
}

/** 내 연재 › 휴지통 — 되살리기 · 완전히 지우기 */
export function TrashRow({ seriesId, epNo, label, left }: { seriesId: string; epNo?: number; label: string; left: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (payload: unknown, done: string) => { setBusy(true); const j = await call(`series/${seriesId}`, payload, 'PATCH'); setBusy(false); if (j) { toast(done); router.refresh(); } };
  return (
    <li className={k('trow')}>
      <span><b>{label}</b><small>{left}일 뒤 완전히 지워져요</small></span>
      <button className={k('btn')} disabled={busy} onClick={() => run({ trash: { on: false, epNo } }, '되살렸어요')}>되살리기</button>
      <button className={k('btn danger')} disabled={busy} onClick={() => { if (window.confirm(`「${label}」을(를) 완전히 지울까요?\n되살릴 수 없어요.`)) run({ trash: { purge: true, epNo } }, '완전히 지웠어요'); }}>완전히 지우기</button>
    </li>
  );
}
