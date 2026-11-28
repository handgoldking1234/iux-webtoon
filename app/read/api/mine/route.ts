import { AGES, DAYS, GENRES } from '@/lib/read/config';
import { img, myEpisodes, mySeries, squareOf } from '@/lib/read/store';
import { ok, withMe } from '../_h';

/** 편집기 「연재하기」 팝업 — 내 연재 작품 목록과 고를 수 있는 값들 */
export async function GET() {
  return withMe(async (me) => {
    const list = await mySeries(me.profile.id);
    const eps = await myEpisodes(list.map((s) => s.id));
    return ok({
      penName: list[0]?.author_name || me.profile.name || '',
      genres: GENRES, ages: AGES, days: DAYS,
      series: list.map((s) => ({ id: s.id, title: s.title, episodes: s.episodes, cover: img(s.thumb_path), hasCover: !!squareOf(s.thumb_path), eps: eps.filter((e) => e.series_id === s.id).map((e) => ({ no: e.no, title: e.title, note: e.author_note || '' })) })),
    });
  });
}
