import { deleteComment } from '@/lib/read/store';
import { ok, withMe } from '../../_h';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  return withMe(async (me) => { await deleteComment(me.profile.id, id, me.isAdmin); return ok({ ok: true }); });
}
