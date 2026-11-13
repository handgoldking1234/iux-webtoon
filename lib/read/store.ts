import 'server-only';
import { randomBytes } from 'node:crypto';
import { adminReady } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/server';
import { readPublicUrl, signReadUpload } from '@/lib/storage';
import { CUT_WIDTH, MAX_CUTS, RESERVED, readHref } from './config';
import { demo } from './demo';
import { avg, type Comment, type Cut, type Draft, type Episode, type Report, type Series } from './types';

/**
 * 연재관 데이터 — DB 연동 전에는 예시(demo.ts), 연동 후에는 Supabase(webtoon.read_*).
 * 화면 · API는 이 파일의 함수만 불러요. (떼어 낼 때 이 파일만 바꿔 끼우면 돼요)
 */
const live = () => adminReady();
const db = () => supabaseAdmin();
const nowIso = () => new Date().toISOString();
export const newId = (n = 8): string => {
  const a = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  const b = randomBytes(n);
  for (let i = 0; i < n; i++) s += a[b[i] % a.length];
  return RESERVED.has(s) ? newId(n) : s;
};
const visibleEp = (e: Episode) => e.status === 'public' && Date.parse(e.publish_at) <= Date.now();

/* ───────── 그림 주소 */
export function img(path: string | null | undefined): string | null {
  if (!path || path.startsWith('demo:')) return null;
  if (path.startsWith('mem:')) return readHref('api/img/' + encodeURIComponent(path.slice(4)));
  return readPublicUrl(path);
}
export const thumbOf = (s: Series) => img(s.thumb_path);

/* ───────── 목록 */
async function allSeries(): Promise<Series[]> {
  if (!live()) return demo().series.filter((s) => !s.hidden && s.episodes > 0);
  const { data } = await db().from('read_series').select('*').eq('hidden', false).gt('episodes', 0).order('last_episode_at', { ascending: false, nullsFirst: false }).limit(500);
  return (data || []) as Series[];
}
export const rankScore = (s: Series) => avg(s) * Math.log10(s.follows + s.views / 50 + 10);

export async function homeData() {
  const all = await allSeries();
  const daily = all.filter((s) => s.kind === 'daily');
  const free = all.filter((s) => s.kind === 'free').sort((a, b) => Date.parse(b.last_episode_at || b.created_at) - Date.parse(a.last_episode_at || a.created_at));
  const ranking = all.slice().sort((a, b) => rankScore(b) - rankScore(a));
  const featured = ranking.find((s) => s.kind === 'daily') || ranking[0] || null;
  return { all, daily, done: all.filter((s) => s.kind === 'done'), free, ranking, featured };
}
export async function listByDay(day: string) {
  const all = await allSeries();
  if (day === 'done') return all.filter((s) => s.kind === 'done').sort((a, b) => avg(b) - avg(a));
  return all.filter((s) => s.kind === 'daily' && s.days.includes(day)).sort((a, b) => avg(b) - avg(a));
}
export async function listFree(sort: 'new' | 'rate') {
  const L = (await allSeries()).filter((s) => s.kind === 'free');
  return sort === 'rate' ? L.sort((a, b) => avg(b) - avg(a)) : L.sort((a, b) => Date.parse(b.last_episode_at || '') - Date.parse(a.last_episode_at || ''));
}
export async function ranking(limit = 30) {
  return (await allSeries()).sort((a, b) => rankScore(b) - rankScore(a)).slice(0, limit);
}

/* ───────── 작품 · 회차 */
export async function getSeries(id: string, viewer?: { id: string; isAdmin: boolean } | null) {
  let s: Series | null = null, eps: Episode[] = [], followed = false;
  if (!live()) {
    const M = demo();
    s = M.series.find((x) => x.id === id) || null;
    if (s) { eps = M.episodes.filter((e) => e.series_id === id); followed = !!viewer && M.follows.has(`${id}:${viewer.id}`); }
  } else {
    const { data } = await db().from('read_series').select('*').eq('id', id).maybeSingle();
    s = data as Series | null;
    if (s) {
      const [{ data: e }, f] = await Promise.all([
        db().from('read_episodes').select('id,series_id,no,title,thumb_path,ai,status,publish_at,views,rating_sum,rating_count,comments,created_at,cuts').eq('series_id', id).order('no', { ascending: false }),
        viewer ? db().from('read_follows').select('series_id').eq('series_id', id).eq('user_id', viewer.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      eps = (e || []) as Episode[];
      followed = !!f.data;
    }
  }
  if (!s) return null;
  const owner = !!viewer && (viewer.id === s.author_id || viewer.isAdmin);
  if (s.hidden && !owner) return null;
  eps = eps.filter((e) => owner || visibleEp(e)).sort((a, b) => b.no - a.no);
  return { series: s, episodes: eps, followed, owner };
}

export async function getEpisode(id: string, no: number, viewer?: { id: string; isAdmin: boolean } | null) {
  const got = await getSeries(id, viewer);
  if (!got) return null;
  const ep = got.episodes.find((e) => e.no === no);
  if (!ep) return null;
  const nos = got.episodes.map((e) => e.no).sort((a, b) => a - b), i = nos.indexOf(no);
  let full = ep, myRating = 0, comments: Comment[] = [];
  if (!live()) {
    const M = demo();
    myRating = viewer ? M.ratings.get(`${ep.id}:${viewer.id}`) || 0 : 0;
    comments = M.comments.filter((c) => c.episode_id === ep.id && !c.hidden).map((c) => ({ ...c, liked: !!viewer && M.likes.has(`${c.id}:${viewer.id}`), mine: !!viewer && c.user_id === viewer.id }));
  } else {
    const [{ data: e }, r, { data: c }] = await Promise.all([
      db().from('read_episodes').select('*').eq('id', ep.id).single(),
      viewer ? db().from('read_ratings').select('score').eq('episode_id', ep.id).eq('user_id', viewer.id).maybeSingle() : Promise.resolve({ data: null }),
      db().from('read_comments').select('*').eq('episode_id', ep.id).eq('hidden', false).order('created_at', { ascending: false }).limit(100),
    ]);
    full = (e || ep) as Episode;
    myRating = (r.data as { score: number } | null)?.score || 0;
    comments = (c || []) as Comment[];
    if (viewer && comments.length) {
      const { data: lk } = await db().from('read_comment_likes').select('comment_id').eq('user_id', viewer.id).in('comment_id', comments.map((x) => x.id));
      const set = new Set((lk || []).map((x: { comment_id: number }) => x.comment_id));
      comments = comments.map((x) => ({ ...x, liked: set.has(x.id), mine: x.user_id === viewer.id }));
    }
  }
  // 좋아요 10개 이상 중 상위 2개는 BEST로 위에
  const best = comments.filter((c) => c.likes >= 10).sort((a, b) => b.likes - a.likes).slice(0, 2).map((c) => ({ ...c, best: true }));
  const rest = comments.filter((c) => !best.some((b) => b.id === c.id)).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return { ...got, episode: full, prev: i > 0 ? nos[i - 1] : null, next: i < nos.length - 1 ? nos[i + 1] : null, myRating, comments: [...best, ...rest] };
}

/* ───────── 독자 반응 */
export async function addView(epId: number) {
  if (!live()) { const M = demo(), e = M.episodes.find((x) => x.id === epId); if (e) { e.views++; const s = M.series.find((x) => x.id === e.series_id); if (s) s.views++; } return; }
  await db().rpc('read_add_view', { ep: epId });
}
export async function setFollow(uid: string, sid: string, on: boolean): Promise<number> {
  if (!live()) {
    const M = demo(), k = `${sid}:${uid}`, s = M.series.find((x) => x.id === sid);
    if (!s) throw new Error('not_found');
    if (on && !M.follows.has(k)) { M.follows.add(k); s.follows++; } else if (!on && M.follows.delete(k)) s.follows--;
    return s.follows;
  }
  const { data, error } = await db().rpc('read_follow', { sid, uid, on_: on });
  if (error) throw error;
  return data as number;
}
export async function rate(uid: string, epId: number, score: number) {
  if (!live()) {
    const M = demo(), k = `${epId}:${uid}`, prev = M.ratings.get(k), e = M.episodes.find((x) => x.id === epId);
    if (!e) throw new Error('not_found');
    const s = M.series.find((x) => x.id === e.series_id)!;
    M.ratings.set(k, score);
    for (const t of [e, s]) { t.rating_sum += score - (prev || 0); if (!prev) t.rating_count++; }
    return { avg: avg(e), count: e.rating_count };
  }
  const { error } = await db().rpc('read_rate', { ep: epId, uid, sc: score });
  if (error) throw error;
  const { data } = await db().from('read_episodes').select('rating_sum,rating_count').eq('id', epId).single();
  return { avg: data ? avg(data) : score, count: data?.rating_count || 1 };
}
export async function addComment(uid: string, nickname: string, epId: number, body: string): Promise<Comment> {
  const c: Comment = { id: 0, episode_id: epId, user_id: uid, nickname, body, likes: 0, hidden: false, created_at: nowIso(), mine: true };
  if (!live()) {
    const M = demo(), e = M.episodes.find((x) => x.id === epId);
    if (!e) throw new Error('not_found');
    c.id = ++M.seq; M.comments.push(c); e.comments++;
    return c;
  }
  const { data, error } = await db().rpc('read_add_comment', { ep: epId, uid, nick: nickname, txt: body });
  if (error) throw error;
  return { ...c, id: data as number };
}
export async function likeComment(uid: string, cid: number): Promise<number> {
  if (!live()) {
    const M = demo(), c = M.comments.find((x) => x.id === cid);
    if (!c) throw new Error('not_found');
    if (!M.likes.has(`${cid}:${uid}`)) { M.likes.add(`${cid}:${uid}`); c.likes++; }
    return c.likes;
  }
  const { data, error } = await db().rpc('read_like_comment', { cid, uid });
  if (error) throw error;
  return data as number;
}
export async function deleteComment(uid: string, cid: number, isAdmin: boolean) {
  if (!live()) { const c = demo().comments.find((x) => x.id === cid); if (c && (c.user_id === uid || isAdmin)) c.hidden = true; return; }
  const q = db().from('read_comments').update({ hidden: true }).eq('id', cid);
  await (isAdmin ? q : q.eq('user_id', uid));
}
export async function report(uid: string | null, type: Report['target_type'], targetId: string, reason: string) {
  const r: Report = { id: 0, target_type: type, target_id: targetId, user_id: uid, reason, status: 'open', created_at: nowIso() };
  if (!live()) { const M = demo(); r.id = ++M.seq; M.reports.unshift(r); return; }
  await db().from('read_reports').insert({ target_type: type, target_id: targetId, user_id: uid, reason });
}

/* ───────── 연재하기: 편집기 → 초안 → 공개 */
export type DraftIn = { source: Draft['source']; ai: boolean; cuts: { w: number; h: number; type: string; bytes: number }[] };
const extOf = (t: string) => (t === 'image/png' ? 'png' : t === 'image/gif' ? 'gif' : t === 'image/webp' ? 'webp' : 'jpg');

export async function createDraft(uid: string, d: DraftIn) {
  if (!d.cuts.length || d.cuts.length > MAX_CUTS) throw new Error('bad_cuts');
  const id = newId(12);
  const cuts: Cut[] = d.cuts.map((c, i) => ({ path: `${uid}/${id}/${String(i + 1).padStart(3, '0')}.${extOf(c.type)}`, w: Math.round(c.w) || CUT_WIDTH, h: Math.round(c.h) || 0 }));
  const draft: Draft = { id, user_id: uid, source: d.source, cuts, ai: !!d.ai, ready: false, used: false, created_at: nowIso() };
  if (!live()) {
    demo().drafts.push({ ...draft, cuts: cuts.map((c) => ({ ...c, path: 'mem:' + c.path.replace(/\//g, '_') })) });
    return { id, uploads: cuts.map((_, i) => ({ url: readHref(`api/drafts/${id}/cut/${i}`), method: 'POST' as const })) };
  }
  const { error } = await db().from('read_drafts').insert(draft);
  if (error) throw error;
  const uploads = await Promise.all(cuts.map(async (c) => ({ url: await signReadUpload(c.path), method: 'PUT' as const })));
  return { id, uploads };
}
/** 로컬 시연: 그림을 서버 메모리에 */
export function putMemImage(uid: string, draftId: string, i: number, type: string, data: Buffer) {
  const d = demo().drafts.find((x) => x.id === draftId && x.user_id === uid);
  if (!d || !d.cuts[i]) throw new Error('not_found');
  demo().images.set(d.cuts[i].path.slice(4), { type, data });
}
export const memImage = (key: string) => demo().images.get(key) || null;

export async function getDraft(uid: string, id: string): Promise<Draft | null> {
  if (!live()) return demo().drafts.find((x) => x.id === id && x.user_id === uid) || null;
  const { data } = await db().from('read_drafts').select('*').eq('id', id).eq('user_id', uid).maybeSingle();
  return data as Draft | null;
}
export async function markDraftReady(uid: string, id: string) {
  if (!live()) { const d = demo().drafts.find((x) => x.id === id && x.user_id === uid); if (!d) throw new Error('not_found'); d.ready = true; return; }
  const { error } = await db().from('read_drafts').update({ ready: true }).eq('id', id).eq('user_id', uid);
  if (error) throw error;
}
export async function mySeries(uid: string): Promise<Series[]> {
  if (!live()) return demo().series.filter((s) => s.author_id === uid);
  const { data } = await db().from('read_series').select('*').eq('author_id', uid).order('updated_at', { ascending: false });
  return (data || []) as Series[];
}

export type PublishIn = {
  draftId: string;
  seriesId?: string; // 이어서 올릴 작품 — 없으면 새 작품
  series?: { title: string; description: string; genre: string; age: Series['age']; authorName: string; days: string[]; apply: boolean };
  episode: { title: string; authorNote: string; publishAt?: string | null };
  ai: boolean;
};
export async function publish(uid: string, p: PublishIn): Promise<{ seriesId: string; no: number }> {
  const d = await getDraft(uid, p.draftId);
  if (!d) throw new Error('draft_not_found');
  if (d.used) throw new Error('draft_used');
  if (!d.ready) throw new Error('draft_not_ready');
  const when = p.episode.publishAt && Date.parse(p.episode.publishAt) > Date.now() ? new Date(p.episode.publishAt).toISOString() : nowIso();
  const status: Episode['status'] = Date.parse(when) > Date.now() + 60e3 ? 'scheduled' : 'public';
  let s: Series | null = null;
  if (p.seriesId) {
    s = (await mySeries(uid)).find((x) => x.id === p.seriesId) || null;
    if (!s) throw new Error('series_not_found');
  }
  const base = s ? null : p.series;
  if (!s && !base) throw new Error('series_required');

  if (!live()) {
    const M = demo();
    if (!s) {
      s = { id: newId(), author_id: uid, author_name: base!.authorName, title: base!.title, description: base!.description, genre: base!.genre, age: base!.age, ai: p.ai, kind: 'free', days: base!.days, review: base!.apply ? 'pending' : 'none', hidden: false, thumb_path: d.cuts[0]?.path || null, episodes: 0, follows: 0, views: 0, rating_sum: 0, rating_count: 0, last_episode_at: null, created_at: nowIso() };
      M.series.unshift(s);
    }
    const no = Math.max(0, ...M.episodes.filter((e) => e.series_id === s!.id).map((e) => e.no)) + 1;
    M.episodes.push({ id: ++M.seq, series_id: s.id, no, title: p.episode.title, author_note: p.episode.authorNote || null, cuts: d.cuts, thumb_path: d.cuts[0]?.path || null, ai: p.ai, status, publish_at: when, views: 0, rating_sum: 0, rating_count: 0, comments: 0, created_at: nowIso() });
    s.episodes = no; s.last_episode_at = when; s.ai = s.ai || p.ai; d.used = true;
    return { seriesId: s.id, no };
  }

  const sb = db();
  if (!s) {
    const row = { id: newId(), author_id: uid, author_name: base!.authorName, title: base!.title, description: base!.description, genre: base!.genre, age: base!.age, ai: p.ai, kind: 'free', days: base!.days, review: base!.apply ? 'pending' : 'none', thumb_path: d.cuts[0]?.path || null, source_project: d.source.project || null };
    const { data, error } = await sb.from('read_series').insert(row).select('*').single();
    if (error) throw error;
    s = data as Series;
  }
  const { data: last } = await sb.from('read_episodes').select('no').eq('series_id', s.id).order('no', { ascending: false }).limit(1).maybeSingle();
  const no = ((last as { no: number } | null)?.no || 0) + 1;
  const { error: e2 } = await sb.from('read_episodes').insert({ series_id: s.id, no, title: p.episode.title, author_note: p.episode.authorNote || null, cuts: d.cuts, thumb_path: d.cuts[0]?.path || null, ai: p.ai, status, publish_at: when });
  if (e2) throw e2;
  await Promise.all([
    sb.from('read_series').update({ episodes: no, last_episode_at: when, ai: s.ai || p.ai, updated_at: nowIso() }).eq('id', s.id),
    sb.from('read_drafts').update({ used: true }).eq('id', d.id),
  ]);
  return { seriesId: s.id, no };
}

/* ───────── 관리자 */
export async function adminRead() {
  if (!live()) {
    const M = demo();
    const reports = M.reports.map((r) => withTarget(r, M.series, M.episodes, M.comments));
    return { reports, pending: M.series.filter((s) => s.review === 'pending'), hidden: M.series.filter((s) => s.hidden), stats: { series: M.series.length, episodes: M.episodes.length, comments: M.comments.length } };
  }
  const sb = db();
  const [{ data: r }, { data: p }, { data: h }, a, b, c] = await Promise.all([
    sb.from('read_reports').select('*').order('created_at', { ascending: false }).limit(100),
    sb.from('read_series').select('*').eq('review', 'pending').order('updated_at', { ascending: true }),
    sb.from('read_series').select('*').eq('hidden', true).limit(50),
    sb.from('read_series').select('id', { count: 'exact', head: true }),
    sb.from('read_episodes').select('id', { count: 'exact', head: true }),
    sb.from('read_comments').select('id', { count: 'exact', head: true }),
  ]);
  const reports = (r || []) as Report[];
  const cids = reports.filter((x) => x.target_type === 'comment').map((x) => +x.target_id), eids = reports.filter((x) => x.target_type === 'episode').map((x) => +x.target_id);
  const [{ data: cs }, { data: es }] = await Promise.all([
    cids.length ? sb.from('read_comments').select('id,episode_id,body,nickname,hidden').in('id', cids) : Promise.resolve({ data: [] }),
    eids.length ? sb.from('read_episodes').select('id,series_id,no,title,status').in('id', eids) : Promise.resolve({ data: [] }),
  ]);
  const epOfC = ((cs || []) as Comment[]).map((x) => x.episode_id);
  const { data: es2 } = epOfC.length ? await sb.from('read_episodes').select('id,series_id,no,title,status').in('id', epOfC) : { data: [] };
  const EPS = [...((es || []) as Episode[]), ...((es2 || []) as Episode[])];
  return { reports: reports.map((x) => withTarget(x, [], EPS, (cs || []) as Comment[])), pending: (p || []) as Series[], hidden: (h || []) as Series[], stats: { series: a.count || 0, episodes: b.count || 0, comments: c.count || 0 } };
}
function withTarget(r: Report, S: Series[], E: Episode[], C: Comment[]): Report {
  if (r.target_type === 'series') return { ...r, label: S.find((s) => s.id === r.target_id)?.title || `작품 ${r.target_id}`, href: readHref(r.target_id) };
  if (r.target_type === 'episode') { const e = E.find((x) => String(x.id) === r.target_id); return { ...r, label: e ? `${e.title}` : `회차 ${r.target_id}`, href: e ? readHref(`${e.series_id}/${e.no}`) : undefined }; }
  const c = C.find((x) => String(x.id) === r.target_id), e = c && E.find((x) => x.id === c.episode_id);
  return { ...r, label: c ? `「${c.body.slice(0, 40)}」 — ${c.nickname}${c.hidden ? ' (숨김)' : ''}` : `댓글 ${r.target_id}`, href: e ? readHref(`${e.series_id}/${e.no}`) : undefined };
}
export async function adminSetSeries(id: string, patch: Partial<Pick<Series, 'hidden' | 'kind' | 'review' | 'review_note' | 'days'>>) {
  if (!live()) { const s = demo().series.find((x) => x.id === id); if (s) Object.assign(s, patch); return; }
  await db().from('read_series').update({ ...patch, updated_at: nowIso() }).eq('id', id);
}
export async function adminHideComment(id: number) {
  if (!live()) { const c = demo().comments.find((x) => x.id === id); if (c) c.hidden = true; return; }
  await db().from('read_comments').update({ hidden: true }).eq('id', id);
}
export async function adminSetReport(id: number, status: Report['status']) {
  if (!live()) { const r = demo().reports.find((x) => x.id === id); if (r) r.status = status; return; }
  await db().from('read_reports').update({ status, handled_at: nowIso() }).eq('id', id);
}
