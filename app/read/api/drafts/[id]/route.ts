import { markDraftReady } from '@/lib/read/store';
import { ok, withMe } from '../../_h';

/** 편집기 「연재하기」 2단계 — 그림을 다 올렸다고 알려요 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  return withMe(async (me) => { await markDraftReady(me.profile.id, id); return ok({ ok: true, next: `/read/publish?draft=${encodeURIComponent(id)}` }); });
}
