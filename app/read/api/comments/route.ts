import { addComment } from '@/lib/read/store';
import { body, err, ok, withMe } from '../_h';

export async function POST(req: Request) {
  return withMe(async (me) => {
    const b = await body<{ episodeId?: number; body?: string }>(req);
    const t = String(b.body || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    if (!b.episodeId || !t) return err('bad', '댓글 내용을 적어 주세요');
    const nick = (me.profile.name || me.profile.email?.split('@')[0] || '독자').slice(0, 20);
    return ok({ comment: await addComment(me.profile.id, nick, Number(b.episodeId), t) });
  });
}
