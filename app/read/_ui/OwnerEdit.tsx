'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AGES, GENRES, MAX_GENRES, genresOf } from '@/lib/read/config';
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

/** 장르 고르기 — 여러 개(3개까지) */
function GenrePick({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const on = genresOf(value);
  return (
    <div className={k('field')}><span>장르 <small>{on.length} / {MAX_GENRES}개 · 여러 개 고를 수 있어요</small></span>
      <div className={k('ogen')}>{GENRES.map((g) => {
        const sel = on.includes(g);
        return <button type="button" key={g} aria-pressed={sel} className={sel ? k('on') : undefined} onClick={() => { if (!sel && on.length >= MAX_GENRES) { toast(`장르는 ${MAX_GENRES}개까지 고를 수 있어요`); return; } onChange((sel ? on.filter((x) => x !== g) : [...on, g]).join(',')); }}>{g}</button>;
      })}</div>
    </div>
  );
}

/** 창 — 위(제목 · 닫기)와 아래(단추)는 그대로 있고, 가운데만 스크롤돼요 */
function Sheet({ title, children, foot, onClose }: { title: string; children: React.ReactNode; foot?: React.ReactNode; onClose: () => void }) {
  // 화면 맨 위 층에 그려요 — 단추 안쪽에 그리면 그 자리에 갇혀서 창이 깨져 보여요
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => { setHost(document.querySelector('.rd') || document.body); }, []);
  if (!host) return null;
  return createPortal(
    <div className={k('ovl')} role="dialog" aria-modal="true" aria-label={title} onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className={k('osheet')}>
        <div className={k('ohd')}><h2>{title}</h2><button type="button" className={k('ox')} aria-label="닫기" title="닫기" onClick={onClose}><Ic n="x" /></button></div>
        <div className={k('obody')}>{children}</div>
        {foot && <div className={k('ofoot')}>{foot}</div>}
      </div>
    </div>,
    host,
  );
}

/** 그림 준비 → 초안 → 올리기 → 연재(새 회차 · 그림만 다시 올리기 · 새 작품)까지 한 번에 */
async function sendEpisode(o: { files: File[]; thumb?: Blob | null; cover?: File | null; ai: boolean; seriesId?: string; series?: Record<string, unknown>; replaceNo?: number; title: string; note: string; publishAt?: string | null; num?: number; say: (m: string) => void }) {
  o.say('그림 준비 중…');
  const cuts: { blob: Blob; w: number; h: number }[] = [];
  for (const x of o.files) cuts.push(await fitCut(x));
  const th = o.thumb === undefined ? await cropTo(o.files[0], 404, 180, true) : o.thumb;
  const d = await call<{ id: string; uploads: Up[]; art: Record<string, Up> }>('drafts', { ai: o.ai, art: { ep: !!th, sq: !!o.cover, vt: !!o.cover }, source: { ep: { num: o.num, title: o.title } }, cuts: cuts.map((c) => ({ w: c.w, h: c.h, type: c.blob.type || 'image/jpeg', bytes: c.blob.size })) });
  if (!d) return null;
  if (th && d.art?.ep) await putUp(d.art.ep, th);
  if (o.cover && d.art?.vt && d.art?.sq) { await putUp(d.art.vt, await cropTo(o.cover, 1080, 1920, true)); await putUp(d.art.sq, await cropTo(o.cover, 1080, 1080)); }
  for (let i = 0; i < cuts.length; i++) { o.say(`${i + 1} / ${cuts.length} 장 올리는 중…`); await putUp(d.uploads[i], cuts[i].blob); }
  o.say('연재관에 올리는 중…');
  if (!(await call(`drafts/${d.id}`, {}))) return null;
  return call<{ url: string; seriesUrl: string }>('publish', { draftId: d.id, agree: true, ai: o.ai, seriesId: o.seriesId, series: o.series, replaceNo: o.replaceNo, episode: { title: o.title, authorNote: o.note, publishAt: o.publishAt || null } });
}

/** 고른 파일의 미리보기 주소 (같은 파일은 한 번만 만들어요) */
const urlCache = new WeakMap<File, string>();
const urlOf = (f: File) => { let u = urlCache.get(f); if (!u) { u = URL.createObjectURL(f); urlCache.set(f, u); } return u; };

/** 원고 그림 고르기 — 여러 장 · 작은 그림으로 보기 · 끌어서 순서 바꾸기 · 이어 보기 */
function CutPick({ files, setFiles, busy, label }: { files: File[]; setFiles: (f: (x: File[]) => File[]) => void; busy: boolean; label: string }) {
  const [drag, setDrag] = useState(-1), [over, setOver] = useState(-1), [view, setView] = useState(false);
  const add = (list: FileList | null) => {
    const L = Array.from(list || []).filter((x) => /^image\/(jpeg|png|webp|gif)$/.test(x.type)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (list && L.length < list.length) toast('JPG · PNG · WEBP · GIF만 올릴 수 있어요');
    setFiles((x) => [...x, ...L].slice(0, 120));
  };
  const put = (from: number, to: number) => setFiles((x) => { if (from === to || from < 0 || to < 0 || to >= x.length) return x; const y = x.slice(), [m] = y.splice(from, 1); y.splice(to, 0, m); return y; });
  return (
    <>
      <label className={k('odrop')}><Ic n="image" /><b>{files.length ? '그림 더 넣기' : label}</b><small>여러 장을 한꺼번에 골라도 돼요 · 파일 이름 순서로 놓이고, 위에서 아래로 이어 보여요</small><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden disabled={busy} onChange={(e) => { add(e.target.files); e.target.value = ''; }} /></label>
      {files.length > 0 && <>
        <div className={k('othd')}><b>{files.length}장</b><small>끌어서 순서를 바꿔요 · 화살표로도 옮겨져요</small><button type="button" className={k('btn')} onClick={() => setView(true)}>이어서 미리보기</button></div>
        <ol className={k('othumbs')}>{files.map((x, i) => (
          <li key={x.name + x.size + x.lastModified} draggable={!busy} className={k(`${drag === i ? 'drag' : ''} ${over === i && drag !== i ? 'over' : ''}`) || undefined}
            onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; }} onDragOver={(e) => { e.preventDefault(); if (over !== i) setOver(i); }}
            onDrop={(e) => { e.preventDefault(); put(drag, i); setDrag(-1); setOver(-1); }} onDragEnd={() => { setDrag(-1); setOver(-1); }} title={x.name}>
            <img src={urlOf(x)} alt="" draggable={false} />
            <i className={k('tnum')}>{i + 1}</i>
            <span>
              <button type="button" aria-label="앞으로" disabled={i === 0} onClick={() => put(i, i - 1)}>←</button>
              <button type="button" aria-label="뒤로" disabled={i === files.length - 1} onClick={() => put(i, i + 1)}>→</button>
              <button type="button" aria-label="빼기" onClick={() => setFiles((y) => y.filter((_, n) => n !== i))}>×</button>
            </span>
          </li>
        ))}</ol>
      </>}
      {view && createPortal(
        <div className={k('oview')} role="dialog" aria-modal="true" aria-label="이어서 미리보기" onClick={() => setView(false)}>
          <button type="button" className={k('ox')} aria-label="닫기"><Ic n="x" /></button>
          <div onClick={(e) => e.stopPropagation()}>{files.map((x, i) => <img key={x.name + x.size + i} src={urlOf(x)} alt={`${i + 1}번째 그림`} />)}</div>
        </div>,
        document.querySelector('.rd') || document.body,
      )}
    </>
  );
}

/** 회차 고치기 — 제목 · 작가의 말 · 공개 시점 · 썸네일 · 원고 그림 다시 올리기 */
function EpEdit({ seriesId, e, nos, onClose }: { seriesId: string; e: E; nos: number[]; onClose: () => void }) {
  const router = useRouter();
  const was = Date.parse(e.publishAt) > Date.now();
  const [title, setTitle] = useState(e.title), [note, setNote] = useState(e.authorNote), [later, setLater] = useState(was), [at, setAt] = useState(localDT(e.publishAt));
  const [files, setFiles] = useState<File[]>([]), [thumb, setThumb] = useState<File | null>(null), [busy, setBusy] = useState('');
  const sorted = nos.slice().sort((a, b) => a - b), [pos, setPos] = useState(sorted.indexOf(e.no) + 1);
  const save = async () => {
    const publishAt = later ? new Date(at).toISOString() : was ? new Date().toISOString() : undefined;
    if (later && Date.parse(publishAt!) <= Date.now()) { toast('예약은 지금보다 뒤 시각으로 골라 주세요'); return; }
    try {
      if (files.length) {
        const j = await sendEpisode({ files, thumb: thumb ? await cropTo(thumb, 404, 180) : null, ai: false, seriesId, replaceNo: e.no, title, note, num: e.no, say: setBusy });
        if (!j) return;
      } else if (thumb) {
        setBusy('썸네일 올리는 중…');
        const j = await call<{ dir: string; up: Record<string, Up> }>(`series/${seriesId}`, { kind: 'ep' });
        if (!j) return;
        await putUp(j.up.ep, await cropTo(thumb, 404, 180));
        if (!(await call(`series/${seriesId}`, { art: { dir: j.dir, epNo: e.no } }, 'PATCH'))) return;
      }
      setBusy('저장 중…');
      if (!(await call(`series/${seriesId}`, { episode: { no: e.no, title, authorNote: note, publishAt } }, 'PATCH'))) return;
      // 번호가 비어 있으면(예: 1화를 지워 2화만 남음) 저장할 때 1화부터 다시 매겨요
      if (pos !== sorted.indexOf(e.no) + 1 || sorted.some((n, i) => n !== i + 1)) {
        const order = sorted.filter((n) => n !== e.no); order.splice(pos - 1, 0, e.no);
        if (!(await call(`series/${seriesId}`, { order }, 'PATCH'))) return;
      }
      toast(files.length ? `${e.no}화 그림을 다시 올렸어요` : later ? '예약해 두었어요' : '회차를 고쳤어요');
      router.refresh(); onClose();
    } catch { toast('저장하지 못했어요 · 잠시 뒤 다시 해 주세요'); } finally { setBusy(''); }
  };
  return (
    <Sheet title={`${e.no}화 고치기`} onClose={() => { if (!busy) onClose(); }} foot={<><small className={k('muted')}>{busy}</small><button className={k('btn go')} disabled={!!busy || !title.trim() || (later && !at)} onClick={save}>저장</button></>}>
      <div className={k('two')}>
        <label className={k('field')}><span>몇 화</span><select value={pos} onChange={(ev) => setPos(+ev.target.value)}>{sorted.map((_, n) => <option key={n} value={n + 1}>{n + 1}화{n + 1 === sorted.indexOf(e.no) + 1 ? ' (지금)' : ''}</option>)}</select></label>
        <label className={k('field')}><span>회차 제목</span><input type="text" maxLength={60} value={title} onChange={(ev) => setTitle(ev.target.value)} /></label>
      </div>
      {pos !== sorted.indexOf(e.no) + 1 && <p className={k('muted')} style={{ fontSize: 13 }}>{pos}화 자리로 옮기면 그 사이 회차 번호가 한 칸씩 밀려요.</p>}
      <label className={k('field')}><span>작가의 말 <small>{note.trim().length} / 500자</small></span><textarea maxLength={500} value={note} onChange={(ev) => setNote(ev.target.value)} /></label>
      <div className={k('field')}><span>공개 시점</span>
        <div className={k('oseg')}>
          <label><input type="radio" name="oWhen" checked={!later} onChange={() => setLater(false)} /> {was ? '지금 바로 공개' : '그대로 (공개 중)'}</label>
          <label><input type="radio" name="oWhen" checked={later} onChange={() => setLater(true)} /> 예약</label>
        </div>
        {later && <input type="datetime-local" value={at} onChange={(ev) => setAt(ev.target.value)} />}
        {later && <small style={{ marginLeft: 0 }}>예약한 시각이 되면 저절로 공개돼요 · 그때까지는 나만 볼 수 있어요</small>}
      </div>
      <h3>회차 썸네일</h3>
      <div className={k('oart')}>
        <label className={k('btn')}>{thumb ? '다른 그림 고르기' : '썸네일 다시 올리기'}<input type="file" accept="image/*" hidden onChange={(ev) => { setThumb(ev.target.files?.[0] || null); ev.target.value = ''; }} /></label>
        <small>{thumb ? `${thumb.name} · 저장하면 바뀌어요` : '회차 목록에 보이는 작은 그림 (404×180) · 안 고르면 지금 것 그대로'}</small>
      </div>
      <h3>원고 그림 다시 올리기</h3>
      <p className={k('muted')} style={{ fontSize: 13 }}>그림을 고르면 이 회차의 원고가 통째로 새 그림으로 바뀌어요. 조회수 · 별점 · 댓글은 그대로 남아요. 안 고르면 원고는 그대로예요.</p>
      <CutPick files={files} setFiles={setFiles} busy={!!busy} label="새 원고 그림 고르기" />
    </Sheet>
  );
}

/** 회차 목록 한 줄의 연필 · 휴지통 — 작가 본인에게만 보여요 */
export function EpTools({ seriesId, e, nos }: { seriesId: string; e: E; nos: number[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false), [busy, setBusy] = useState(false);
  return (
    <span className={k('eptools')}>
      <button type="button" aria-label={`${e.no}화 고치기`} title="고치기 · 예약 · 그림 다시 올리기" onClick={() => setEdit(true)}><Ic n="pen" /></button>
      <button type="button" aria-label={`${e.no}화 삭제`} title="휴지통으로 · 30일 안에 되살릴 수 있어요" disabled={busy} onClick={async () => {
        if (!window.confirm(`${e.no}화를 휴지통에 넣을까요?\n뒤 회차 번호가 한 칸씩 당겨져요. 30일 안에는 「연재 올리기 › 휴지통」에서 되살릴 수 있어요(맨 뒤 회차로 들어가요).`)) return;
        setBusy(true); const j = await call(`series/${seriesId}`, { trash: { on: true, epNo: e.no } }, 'PATCH'); setBusy(false);
        if (j) { toast(`${e.no}화를 휴지통에 넣었어요`); router.refresh(); }
      }}><Ic n="trash" /></button>
      {edit && <EpEdit seriesId={seriesId} e={e} nos={nos} onClose={() => setEdit(false)} />}
    </span>
  );
}

/** 제목 옆 연필 · 휴지통 — 작가 본인에게만 보여요 */
export function SeriesEdit({ s, eps }: { s: S; eps: E[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<'' | 'edit' | 'del'>(''), [busy, setBusy] = useState(false);
  const [f, setF] = useState(s), [ep, setEp] = useState<E | null>(null);
  const set = (key: 'title' | 'authorName' | 'genre' | 'age' | 'description', v: string) => setF((x) => ({ ...x, [key]: v }));
  const okS = f.title.trim() && f.authorName.trim() && f.description.trim().length >= 20 && genresOf(f.genre).length > 0;
  const save = async (payload: unknown, done: string) => {
    setBusy(true);
    const j = await call(`series/${s.id}`, payload, 'PATCH');
    setBusy(false);
    if (!j) return false;
    toast(done); router.refresh(); return true;
  };
  const reCover = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('그림 파일을 골라 주세요'); return; }
    setBusy(true);
    try {
      const j = await call<{ dir: string; up: Record<string, Up> }>(`series/${s.id}`, { kind: 'cover' });
      if (!j) return;
      await putUp(j.up.vt, await cropTo(file, 1080, 1920, true)); await putUp(j.up.sq, await cropTo(file, 1080, 1080));
      if (await call(`series/${s.id}`, { art: { dir: j.dir } }, 'PATCH')) { toast('대표 이미지를 바꿨어요'); router.refresh(); }
    } catch { toast('이미지를 올리지 못했어요 · 잠시 뒤 다시 해 주세요'); } finally { setBusy(false); }
  };
  const epState = (e: E) => (e.hidden ? '숨김' : Date.parse(e.publishAt) > Date.now() ? `${whenText(e.publishAt)} 공개 예약` : '공개 중');
  return (
    <>
      <button className={k('editic')} aria-label="연재 수정" title="연재 수정" onClick={() => { setF(s); setOpen('edit'); }}><Ic n="pen" /></button>
      <button className={k('editic')} aria-label="작품 삭제" title="작품 삭제 · 휴지통으로" onClick={() => setOpen('del')}><Ic n="trash" /></button>
      {open === 'del' && (
        <Sheet title="작품을 휴지통에 넣을까요?" onClose={() => setOpen('')} foot={<><button className={k('btn')} onClick={() => setOpen('')}>취소</button><button className={k('btn danger')} disabled={busy} onClick={async () => { if (await save({ trash: { on: true } }, '휴지통에 넣었어요 · 연재 올리기에서 되살릴 수 있어요')) router.push('/read/publish'); }}>휴지통에 넣기</button></>}>
          <p>「{s.title}」과 회차가 모두 독자에게 안 보이게 돼요. <b>30일 안에는</b> 「연재 올리기 › 휴지통」에서 되살릴 수 있고, 30일이 지나면 완전히 지워져요.</p>
          <p className={k('muted')} style={{ fontSize: 13 }}>잠깐만 내리고 싶다면 삭제 대신 연재 수정의 「작품 잠깐 숨기기」를 쓰세요.</p>
        </Sheet>
      )}
      {open === 'edit' && !ep && (
        <Sheet title="연재 수정" onClose={() => setOpen('')} foot={<><small className={k('muted')}>작품 정보는 「저장」을 눌러야 바뀌어요 · 이미지 · 숨기기 · 회차는 누르는 즉시 바뀌어요</small><button className={k('btn go')} disabled={busy || !okS} onClick={async () => { if (await save({ series: { title: f.title, authorName: f.authorName, genre: f.genre, age: f.age, description: f.description } }, '작품 정보를 고쳤어요')) setOpen(''); }}>저장</button></>}>
          <label className={k('field')}><span>작품 제목</span><input type="text" maxLength={40} value={f.title} onChange={(e) => set('title', e.target.value)} /></label>
          <label className={k('field')}><span>필명</span><input type="text" maxLength={20} value={f.authorName} onChange={(e) => set('authorName', e.target.value)} /></label>
          <GenrePick value={f.genre} onChange={(v) => set('genre', v)} />
          <div className={k('two')}>
            <label className={k('field')}><span>이용 연령</span><select value={f.age} onChange={(e) => set('age', e.target.value)}>{AGES.map((a) => <option key={a[0]} value={a[0]}>{a[1]}{a[0] === 'all' ? '' : ' 이상'}</option>)}</select></label>
          </div>
          <label className={k('field')}><span>작품 소개 <small>{f.description.trim().length} / 300자 · 20자 이상</small></span><textarea maxLength={300} value={f.description} onChange={(e) => set('description', e.target.value)} /></label>
          <h3>대표 이미지</h3>
          <div className={k('oart')}>
            <label className={k('btn')} aria-disabled={busy}>{busy ? '올리는 중…' : '이미지 다시 올리기'}<input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ''; reCover(x); }} /></label>
            <small>세로로 긴 그림이 좋아요 · 세로(1080×1920)와 정사각형(1080×1080)으로 알아서 잘라 넣어요</small>
          </div>
          <h3>공개 상태</h3>
          <div className={k('oart')}>
            <button className={k('btn')} disabled={busy} onClick={() => save({ paused: !s.paused }, s.paused ? '다시 공개했어요' : '작품을 숨겼어요 · 나만 볼 수 있어요')}>{s.paused ? '작품 다시 공개하기' : '작품 잠깐 숨기기'}</button>
            <small>{s.paused ? '지금은 숨김 상태예요 · 독자에게 안 보이고 목록 · 랭킹에서도 빠져 있어요' : '숨기면 독자에게 안 보여요 · 조회수 · 별점 · 댓글 · 관심은 그대로 남아요'}</small>
          </div>
          <h3>회차</h3>
          {!eps.length && <p className={k('muted')}>아직 올린 회차가 없어요</p>}
          {eps.length > 1 && <p className={k('muted')} style={{ fontSize: 12.5 }}>↑ ↓ 로 순서를 바꾸면 회차 번호가 그 순서대로 다시 매겨져요.</p>}
          <ul className={k('oeps')}>{eps.slice().sort((a, b) => a.no - b.no).map((e, i, L) => (
            <li key={e.no}><span><b>{e.no}화</b> {e.title} <small>· {epState(e)}</small></span>
              {L.length > 1 && <><button className={k('btn')} disabled={busy || i === 0} aria-label="앞 회차로" title="앞 회차로" onClick={() => { const o = L.map((x) => x.no); [o[i - 1], o[i]] = [o[i], o[i - 1]]; save({ order: o }, '순서를 바꿨어요'); }}>↑</button>
              <button className={k('btn')} disabled={busy || i === L.length - 1} aria-label="뒤 회차로" title="뒤 회차로" onClick={() => { const o = L.map((x) => x.no); [o[i + 1], o[i]] = [o[i], o[i + 1]]; save({ order: o }, '순서를 바꿨어요'); }}>↓</button></>}
              <button className={k('btn')} onClick={() => setEp(e)}>고치기 · 그림 · 예약</button>
              <button className={k('btn')} disabled={busy} onClick={() => save({ episode: { no: e.no, hidden: !e.hidden } }, e.hidden ? '다시 공개했어요' : '숨겼어요 · 독자에게 안 보여요')}>{e.hidden ? '다시 공개' : '숨기기'}</button>
              <button className={k('btn')} disabled={busy} aria-label={`${e.no}화 삭제`} title="휴지통으로 · 30일 안에 되살릴 수 있어요" onClick={() => { if (window.confirm(`${e.no}화를 휴지통에 넣을까요?\n30일 안에는 「연재 올리기 › 휴지통」에서 되살릴 수 있어요.`)) save({ trash: { on: true, epNo: e.no } }, `${e.no}화를 휴지통에 넣었어요`); }}><Ic n="trash" /></button></li>
          ))}</ul>
        </Sheet>
      )}
      {open === 'edit' && ep && <EpEdit seriesId={s.id} e={ep} nos={eps.map((x) => x.no)} onClose={() => setEp(null)} />}
    </>
  );
}

type Tgt = { id: string; title: string; nextNo: number };
/** 연재 올리기 — 다른 곳에서 그린 그림 파일만으로 새 회차(또는 새 작품)를 올려요. fixed가 있으면 그 작품의 다음 화 */
export function UploadEpisode({ fixed, list = [], label, cls = 'btn big', author = '' }: { fixed?: Tgt; list?: Tgt[]; label: string; cls?: string; author?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false), [busy, setBusy] = useState('');
  const [target, setTarget] = useState(fixed ? fixed.id : list[0]?.id || 'new');
  const [files, setFiles] = useState<File[]>([]), [thumb, setThumb] = useState<File | null>(null), [cover, setCover] = useState<File | null>(null);
  const [w, setW] = useState({ title: '', authorName: author, genre: '', age: '', description: '' });
  const [title, setTitle] = useState(''), [note, setNote] = useState(''), [ai, setAi] = useState(''), [later, setLater] = useState(false), [at, setAt] = useState(''), [agree, setAgree] = useState(false);
  const isNew = target === 'new', cur = fixed || list.find((x) => x.id === target), no = isNew ? 1 : cur?.nextNo || 1;
  const miss = (isNew ? (!w.title.trim() ? '작품 제목' : !w.authorName.trim() ? '필명' : !w.genre ? '장르' : !w.age ? '이용 연령' : w.description.trim().length < 20 ? '작품 소개 20자 이상' : !cover ? '대표 이미지' : '') : '')
    || (!files.length ? '원고 그림' : !title.trim() ? '회차 제목' : note.trim().length < 10 ? '작가의 말 10자 이상' : !ai ? 'AI 활용 표시' : later && !at ? '공개 일시' : !agree ? '확인' : '');
  const go = async () => {
    if (miss) { toast('아직 채울 게 있어요 · ' + miss); return; }
    if (later && Date.parse(at) <= Date.now()) { toast('예약은 지금보다 뒤 시각으로 골라 주세요'); return; }
    try {
      const j = await sendEpisode({ files, thumb: thumb ? await cropTo(thumb, 404, 180) : undefined, cover: isNew ? cover : null, ai: ai === 'yes', seriesId: isNew ? undefined : target, series: isNew ? { ...w, days: [], apply: false } : undefined, title, note, publishAt: later ? new Date(at).toISOString() : null, num: no, say: setBusy });
      if (!j) return;
      toast(later ? '예약해 두었어요' : `${no}화를 올렸어요`);
      setOpen(false); setFiles([]); setThumb(null); setCover(null); setTitle(''); setNote(''); setAgree(false);
      if (fixed) router.refresh(); else router.push(j.seriesUrl);
    } catch { toast('올리지 못했어요 · 잠시 뒤 다시 해 주세요'); } finally { setBusy(''); }
  };
  return (
    <>
      <button className={k(cls)} onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <Sheet title={isNew ? '새 작품 올리기' : `${no}화 올리기`} onClose={() => { if (!busy) setOpen(false); }} foot={<><small className={k('muted')}>{busy || (miss ? `남은 항목 · ${miss}` : '올릴 준비 끝')}</small><button className={k('btn go')} disabled={!!busy} style={miss ? { opacity: 0.55 } : undefined} onClick={go}>{later ? '예약하기' : '올리기'}</button></>}>
          <p className={k('muted')} style={{ fontSize: 13 }}>다른 곳에서 그린 원고를 그림 파일로 올려요 · JPG · PNG · WEBP · GIF · 최대 120장. 바로웹툰 편집기로 만들려면 <a href="/studio" style={{ textDecoration: 'underline' }}>웹툰 만들기</a>로 가세요.</p>
          {!fixed && <label className={k('field')}><span>올릴 작품</span><select value={target} onChange={(e) => setTarget(e.target.value)}>{list.map((x) => <option key={x.id} value={x.id}>{x.title} · {x.nextNo}화로 이어서</option>)}<option value="new">새 작품으로 시작하기</option></select></label>}
          {isNew && <>
            <label className={k('field')}><span>작품 제목</span><input type="text" maxLength={40} value={w.title} onChange={(e) => setW({ ...w, title: e.target.value })} /></label>
            <label className={k('field')}><span>필명</span><input type="text" maxLength={20} value={w.authorName} onChange={(e) => setW({ ...w, authorName: e.target.value })} /></label>
            <GenrePick value={w.genre} onChange={(v) => setW({ ...w, genre: v })} />
            <div className={k('two')}>
              <label className={k('field')}><span>이용 연령</span><select value={w.age} onChange={(e) => setW({ ...w, age: e.target.value })}><option value="">고르기</option>{AGES.map((a) => <option key={a[0]} value={a[0]}>{a[1]}{a[0] === 'all' ? '' : ' 이상'}</option>)}</select></label>
            </div>
            <label className={k('field')}><span>작품 소개 <small>{w.description.trim().length} / 300자 · 20자 이상</small></span><textarea maxLength={300} value={w.description} onChange={(e) => setW({ ...w, description: e.target.value })} /></label>
            <div className={k('oart')}>
              <label className={k('btn')}>{cover ? '대표 이미지 바꾸기' : '대표 이미지 고르기'}<input type="file" accept="image/*" hidden onChange={(e) => { setCover(e.target.files?.[0] || null); e.target.value = ''; }} /></label>
              <small>{cover ? cover.name : '세로로 긴 그림이 좋아요 · 세로 · 정사각형으로 알아서 잘라 넣어요'}</small>
            </div>
            <h3>1화</h3>
          </>}
          <CutPick files={files} setFiles={setFiles} busy={!!busy} label="원고 그림 고르기" />
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
        </Sheet>
      )}
    </>
  );
}

/** 연재 올리기 › 휴지통 — 되살리기 · 완전히 지우기 */
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
