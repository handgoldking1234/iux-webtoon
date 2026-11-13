'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AGES, CUT_WIDTH, DAYS, GENRES } from '@/lib/read/config';
import type { Draft } from '@/lib/read/types';
import type { SV } from '@/lib/read/view';
import Card from './Card';
import { call } from './client';
import { Ic } from './Icons';
import { k } from './k';

type D = { id: string; ai: boolean; source: Draft['source']; cuts: { url: string | null; w: number; h: number }[] };

export default function PublishFlow({ draft, mine, penName }: { draft: D; mine: SV[]; penName: string }) {
  const src = draft.source;
  const [step, setStep] = useState(1);
  const [target, setTarget] = useState<string>(mine[0]?.id || 'new'); // 'new' 또는 작품 id
  const [f, setF] = useState({
    title: src.workTitle || '', authorName: penName, description: src.logline || '', genre: GENRES.includes(src.genre || '') ? src.genre! : '드라마', age: 'all' as string,
    epTitle: src.ep?.title && !/^\d+화$/.test(src.ep.title) && src.ep.title !== '새 회차' ? src.ep.title : '', note: '',
    apply: false, days: [] as string[], ai: draft.ai, when: 'now' as 'now' | 'later', at: '',
  });
  const [agree, setAgree] = useState([false, false, false]);
  const [busy, setBusy] = useState(false), [done, setDone] = useState<{ url: string; seriesUrl: string } | null>(null);
  const isNew = target === 'new', cur = mine.find((s) => s.id === target);
  const set = <K extends keyof typeof f>(key: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [key]: v }));
  const checks = useMemo(() => {
    const w = draft.cuts.map((c) => c.w), off = w.filter((x) => x !== CUT_WIDTH).length;
    return [
      { ok: off === 0, t: off ? `${off}개 컷의 가로가 ${CUT_WIDTH}px이 아니에요 · 화면 폭에 맞춰 늘려 보여 줘요` : `가로 ${CUT_WIDTH}px로 맞춰져 있어요` },
      { ok: draft.cuts.length <= 120, t: `컷 ${draft.cuts.length}개` },
      { ok: !!draft.cuts.length && draft.cuts.every((c) => c.url), t: '그림이 모두 올라가 있어요' },
    ];
  }, [draft.cuts]);
  const L = ['작품', '정보', '공개 설정', '확인'];
  const canNext = step === 1 ? true : step === 2 ? !!f.epTitle.trim() && (!isNew || (!!f.title.trim() && !!f.authorName.trim())) : true;

  if (done) return (
    <div className={k('pub wrap')}>
      <div className={k('panel done')}>
        <span className={k('bigck')}><svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg></span>
        <h2 style={{ fontSize: 22 }}>{f.when === 'later' ? '예약해 두었어요' : '연재관에 올라갔어요'}</h2>
        <p className={k('muted')}>{isNew && f.apply ? '요일연재 검토를 신청했어요. 그동안은 자유연재로 보여요. ' : ''}다음 회차도 편집기에서 「연재하기」를 누르면 이어서 올라가요.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}><Link className={k('btn go big')} href={done.url}>올린 회차 보기</Link><Link className={k('btn big')} href={done.seriesUrl}>작품 페이지</Link><a className={k('btn big')} href="/studio">편집기로</a></div>
      </div>
    </div>
  );

  return (
    <div className={k('pub wrap')}>
      <h1>연재하기</h1>
      <div className={k('steps')} aria-label="진행 단계">{L.map((l, i) => <span key={l} className={step === i + 1 ? k('on') : step > i + 1 ? k('done') : undefined}><i>{step > i + 1 ? '✓' : i + 1}</i>{l}</span>)}</div>

      {step === 1 && (
        <div className={k('panel')}>
          <h2>올릴 회차</h2>
          <p className={k('muted')} style={{ marginTop: -10 }}>{src.workTitle ? `「${src.workTitle}」 ` : ''}{src.ep?.num ? `${src.ep.num}화` : ''} · 컷 {draft.cuts.length}개</p>
          <div className={k('cutgrid')} aria-label="컷 미리보기">{draft.cuts.slice(0, 24).map((c, i) => <span key={i}>{c.url && <img src={c.url} alt={`${i + 1}번째 컷`} loading="lazy" />}</span>)}</div>
          <div className={k('field')}>
            <span className={k('lb')}>어느 작품에 올릴까요?</span>
            <div className={k('src')}>
              {mine.map((s) => (
                <label key={s.id} className={k('srcw')}><span className={k('mini')} style={{ aspectRatio: '3/4' }} /><span style={{ minWidth: 0 }}><b>{s.title}</b><br /><small>{s.episodes}화까지 올림 · 다음은 {s.episodes + 1}화</small></span><input type="radio" name="tgt" checked={target === s.id} onChange={() => setTarget(s.id)} style={{ accentColor: 'var(--green)', width: 18, height: 18 }} /></label>
              ))}
              <label className={k('srcw')}><span className={k('mini')} style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>＋</span><span><b>새 작품으로 시작</b><br /><small>1화로 올라가요</small></span><input type="radio" name="tgt" checked={isNew} onChange={() => setTarget('new')} style={{ accentColor: 'var(--green)', width: 18, height: 18 }} /></label>
            </div>
          </div>
          <div className={k('pfoot')}><a className={k('btn big')} href="/studio">취소</a><button className={k('btn go big')} onClick={() => setStep(2)}>다음</button></div>
        </div>
      )}

      {step === 2 && (
        <div className={k('panel')}>
          {isNew ? (
            <>
              <h2>작품 정보</h2>
              <div className={k('two')}>
                <div className={k('field')}><label htmlFor="pTitle">작품 제목</label><input type="text" id="pTitle" maxLength={40} value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
                <div className={k('field')}><label htmlFor="pName">필명</label><input type="text" id="pName" maxLength={20} value={f.authorName} onChange={(e) => set('authorName', e.target.value)} /><small>작품 페이지에 「글/그림」으로 보여요</small></div>
              </div>
              <div className={k('two')}>
                <div className={k('field')}><label htmlFor="pGenre">장르</label><select id="pGenre" value={f.genre} onChange={(e) => set('genre', e.target.value)}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></div>
                <div className={k('field')}><span className={k('lb')}>이용 연령</span><div className={k('seg')}>{AGES.map(([a, l]) => <label key={a}><input type="radio" name="age" checked={f.age === a} onChange={() => set('age', a)} />{l}{a === 'all' ? '' : ' 이상'}</label>)}</div></div>
              </div>
              <div className={k('field')}><label htmlFor="pDesc">작품 소개</label><textarea id="pDesc" maxLength={300} value={f.description} onChange={(e) => set('description', e.target.value)} /><small>{src.logline ? '기획의 로그라인을 가져왔어요. ' : ''}300자까지 써요.</small></div>
            </>
          ) : <h2>「{cur?.title}」 {(cur?.episodes || 0) + 1}화</h2>}
          <div className={k('field')}><label htmlFor="pEp">회차 제목</label><input type="text" id="pEp" maxLength={60} value={f.epTitle} onChange={(e) => set('epTitle', e.target.value)} placeholder="예) 붉은 등 아래" /></div>
          <div className={k('field')}><label htmlFor="pNote">작가의 말 <small>(선택)</small></label><textarea id="pNote" maxLength={500} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="회차 끝에 보여요" /></div>
          <div className={k('pfoot')}><button className={k('btn big')} onClick={() => setStep(1)}>이전</button><button className={k('btn go big')} disabled={!canNext} onClick={() => setStep(3)}>다음</button></div>
        </div>
      )}

      {step === 3 && (
        <div className={k('panel')}>
          <h2>공개 설정</h2>
          <div className={k('field')}><span className={k('lb')}>공개 시점</span><div className={k('seg')}><label><input type="radio" name="when" checked={f.when === 'now'} onChange={() => set('when', 'now')} />지금 바로</label><label><input type="radio" name="when" checked={f.when === 'later'} onChange={() => set('when', 'later')} />예약</label></div>
            {f.when === 'later' && <input type="datetime-local" aria-label="공개 일시" value={f.at} onChange={(e) => set('at', e.target.value)} style={{ maxWidth: 260, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', borderRadius: 10, padding: '9px 12px', font: 'inherit' }} />}</div>
          {isNew && <>
            <div className={k('field')}><span className={k('lb')}>연재 방식</span><div className={k('seg')}><label><input type="radio" name="mode" checked={!f.apply} onChange={() => set('apply', false)} />자유연재 — 바로 공개</label><label><input type="radio" name="mode" checked={f.apply} onChange={() => set('apply', true)} />요일연재 신청 — 검토 후 이동</label></div><small>{f.apply ? '운영팀이 검토해요. 그동안은 자유연재로 보여요.' : '올리면 자유연재 목록에 바로 보여요.'}</small></div>
            <div className={k('field')}><span className={k('lb')}>연재 요일 <small>(선택)</small></span><div className={k('seg')}>{DAYS.map(([d, l]) => <label key={d}><input type="checkbox" checked={f.days.includes(d)} onChange={(e) => set('days', e.target.checked ? [...f.days, d] : f.days.filter((x) => x !== d))} />{l}</label>)}</div><small>요일연재가 되면 그 요일 목록에 보이고 「UP」 표시가 붙어요.</small></div>
          </>}
          <div className={k('field')}><span className={k('lb')}>AI 활용 표시</span><div className={k('seg')}><label><input type="radio" name="ai" checked={f.ai} onChange={() => set('ai', true)} />AI 그림 · 글을 썼어요</label><label><input type="radio" name="ai" checked={!f.ai} disabled={draft.ai} onChange={() => set('ai', false)} />직접 그렸어요</label></div>{draft.ai && <small>이 회차에는 웹툰보드 AI 이미지가 들어 있어서 「AI 활용」으로 표시돼요.</small>}</div>
          <div className={k('pfoot')}><button className={k('btn big')} onClick={() => setStep(2)}>이전</button><button className={k('btn go big')} disabled={f.when === 'later' && !f.at} onClick={() => setStep(4)}>다음</button></div>
        </div>
      )}

      {step === 4 && (
        <div className={k('panel')}>
          <h2>올리기 전에 확인해요</h2>
          <div style={{ width: 160, pointerEvents: 'none' }} aria-label="미리보기">{isNew ? <Card s={{ id: 'preview', title: f.title || '제목', author: f.authorName, genre: f.genre, age: f.age as 'all', ai: f.ai, kind: 'free', days: f.days, episodes: 1, follows: 0, rating: 0, thumb: draft.cuts[0]?.url || null, art: null, isNew: true, up: false, description: '' }} /> : cur && <Card s={cur} />}</div>
          <ul className={k('chk')}>{checks.map((c) => <li key={c.t}><i className={c.ok ? undefined : k('w')}>{c.ok ? '✓' : '!'}</i><span>{c.t}</span><span className={k(c.ok ? 'ok' : 'warn')}>{c.ok ? '통과' : '확인'}</span></li>)}</ul>
          <div className={k('agree')}>
            {['제가 만들었거나 쓸 권리가 있는 그림과 글만 올려요.', '선정적 · 폭력적인 내용은 이용 연령에 맞게 표시했어요.', '운영정책을 어기면 신고를 받아 숨김 처리될 수 있다는 걸 알아요.'].map((t, i) => (
              <label key={i}><input type="checkbox" checked={agree[i]} onChange={(e) => setAgree((a) => a.map((x, j) => (j === i ? e.target.checked : x)))} /><span>{t}{i === 2 && <> <Link href="/read/policy" target="_blank" style={{ textDecoration: 'underline' }}>운영정책 보기</Link></>}</span></label>
            ))}
          </div>
          <div className={k('pfoot')}><button className={k('btn big')} onClick={() => setStep(3)}>이전</button>
            <button className={k('btn go big')} disabled={busy || !agree.every(Boolean)} onClick={async () => {
              setBusy(true);
              const j = await call<{ url: string; seriesUrl: string }>('publish', {
                draftId: draft.id, agree: true, ai: f.ai, seriesId: isNew ? undefined : target,
                series: isNew ? { title: f.title, authorName: f.authorName, description: f.description, genre: f.genre, age: f.age, days: f.days, apply: f.apply } : undefined,
                episode: { title: f.epTitle, authorNote: f.note, publishAt: f.when === 'later' && f.at ? new Date(f.at).toISOString() : null },
              });
              setBusy(false);
              if (j) setDone(j);
            }}><Ic n="up" />{busy ? '올리는 중…' : f.when === 'later' ? '예약하기' : '지금 연재하기'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
