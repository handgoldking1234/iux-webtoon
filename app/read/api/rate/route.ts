import { rate } from '@/lib/read/store';
import { body, err, ok, withMe } from '../_h';

export async function POST(req: Request) {
  return withMe(async (me) => {
    const b = await body<{ episodeId?: number; score?: number }>(req);
    const sc = Math.round(Number(b.score));
    if (!b.episodeId || !(sc >= 1 && sc <= 10)) return err('bad', '별점은 1~10점이에요');
    return ok(await rate(me.profile.id, Number(b.episodeId), sc));
  });
}
