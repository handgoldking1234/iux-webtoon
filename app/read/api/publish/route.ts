import { AGES, DAY_KEYS, GENRES } from '@/lib/read/config';
import { publish, type PublishIn } from '@/lib/read/store';
import { body, err, ok, withMe } from '../_h';

/** 연재하기 마지막 단계 — 초안을 작품의 새 회차로 공개해요 */
export async function POST(req: Request) {
  return withMe(async (me) => {
    const b = await body<PublishIn & { agree?: boolean }>(req);
    if (!b.agree) return err('agree', '운영정책에 동의해 주세요');
    if (!b.draftId) return err('bad', '연재할 회차를 알려 주세요');
    const epTitle = String(b.episode?.title || '').trim().slice(0, 60);
    if (!epTitle) return err('bad', '회차 제목을 적어 주세요');
    let series: PublishIn['series'];
    if (!b.seriesId) {
      const s = b.series;
      const title = String(s?.title || '').trim().slice(0, 40), author = String(s?.authorName || '').trim().slice(0, 20);
      if (!title) return err('bad', '작품 제목을 적어 주세요');
      if (!author) return err('bad', '필명을 적어 주세요');
      series = {
        title, authorName: author,
        description: String(s?.description || '').trim().slice(0, 300),
        genre: GENRES.includes(String(s?.genre)) ? String(s?.genre) : '기타',
        age: (AGES.some((a) => a[0] === s?.age) ? s!.age : 'all') as 'all',
        days: (s?.days || []).filter((d) => (DAY_KEYS as string[]).includes(d)),
        apply: !!s?.apply,
      };
    }
    const r = await publish(me.profile.id, { draftId: String(b.draftId), seriesId: b.seriesId ? String(b.seriesId) : undefined, series, ai: !!b.ai, episode: { title: epTitle, authorNote: String(b.episode?.authorNote || '').trim().slice(0, 500), publishAt: b.episode?.publishAt || null } });
    return ok({ ...r, url: `/read/${r.seriesId}/${r.no}`, seriesUrl: `/read/${r.seriesId}` });
  });
}
