import { report } from '@/lib/read/store';
import { body, err, ok, withMe } from '../_h';

export async function POST(req: Request) {
  return withMe(async (me) => {
    const b = await body<{ type?: string; id?: string; reason?: string }>(req);
    if (!['series', 'episode', 'comment'].includes(b.type || '') || !b.id) return err('bad', '신고할 대상을 알려 주세요');
    await report(me.profile.id, b.type as 'series', String(b.id).slice(0, 40), String(b.reason || '기타').slice(0, 200));
    return ok({ ok: true });
  });
}
