import { AGES, GENRES } from '@/lib/read/config';
import { setArt, signArt, updateEpisode, updateSeries, type EpisodePatch, type SeriesPatch } from '@/lib/read/store';
import { body, err, ok, withMe } from '../../_h';

/** 작가가 자기 작품 · 회차 정보를 고쳐요 (제목 · 필명 · 장르 · 연령 · 소개 / 회차 제목 · 작가의 말 · 숨김) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withMe(async (me) => {
    const { id } = await params;
    const b = await body<{ series?: Record<string, unknown>; episode?: Record<string, unknown>; art?: { dir?: string; epNo?: number } }>(req);
    const uid = me.profile.id, adm = me.isAdmin;
    if (b.series) {
      const s = b.series, p: SeriesPatch = {};
      const title = String(s.title ?? '').trim().slice(0, 40), author = String(s.authorName ?? '').trim().slice(0, 20), desc = String(s.description ?? '').trim().slice(0, 300);
      if (!title) return err('bad', '작품 제목을 적어 주세요');
      if (!author) return err('bad', '필명을 적어 주세요');
      if (desc.length < 20) return err('bad', '작품 소개를 20자 이상 적어 주세요');
      if (!GENRES.includes(String(s.genre))) return err('bad', '장르를 골라 주세요');
      const age = AGES.find((a) => a[0] === s.age)?.[0];
      if (!age) return err('bad', '이용 연령을 골라 주세요');
      Object.assign(p, { title, author_name: author, description: desc, genre: String(s.genre), age });
      await updateSeries(uid, adm, id, p);
    }
    if (b.episode) {
      const e = b.episode, no = Number(e.no), p: EpisodePatch = {};
      if (!Number.isInteger(no) || no < 1) return err('bad', '회차를 알려 주세요');
      if (e.title !== undefined) { const t = String(e.title).trim().slice(0, 60); if (!t) return err('bad', '회차 제목을 적어 주세요'); p.title = t; }
      if (e.authorNote !== undefined) p.author_note = String(e.authorNote).trim().slice(0, 500) || null;
      if (e.hidden !== undefined) p.hidden = !!e.hidden;
      await updateEpisode(uid, adm, id, no, p);
    }
    if (b.art) {
      const epNo = b.art.epNo === undefined ? undefined : Number(b.art.epNo);
      if (epNo !== undefined && (!Number.isInteger(epNo) || epNo < 1)) return err('bad', '회차를 알려 주세요');
      await setArt(uid, adm, id, String(b.art.dir || ''), epNo);
    }
    return ok({ ok: true });
  });
}

/** 이미지 다시 올리기 — 올릴 주소 받기 (kind: cover = 대표 이미지 두 장, ep = 회차 썸네일) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withMe(async (me) => {
    const { id } = await params;
    const b = await body<{ kind?: string }>(req);
    try { return ok(await signArt(me.profile.id, me.isAdmin, id, b.kind === 'ep' ? 'ep' : 'cover')); }
    catch (e) { if ((e as Error).message === 'art_demo') return err('bad', '시연 화면에서는 이미지를 바꿀 수 없어요'); throw e; }
  });
}
