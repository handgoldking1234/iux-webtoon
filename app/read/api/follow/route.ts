import { setFollow } from '@/lib/read/store';
import { body, err, ok, withMe } from '../_h';

export async function POST(req: Request) {
  return withMe(async (me) => {
    const b = await body<{ seriesId?: string; on?: boolean }>(req);
    if (!b.seriesId) return err('bad', '작품을 알려 주세요');
    return ok({ follows: await setFollow(me.profile.id, b.seriesId, !!b.on) });
  });
}
