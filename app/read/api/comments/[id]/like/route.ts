import { likeComment } from '@/lib/read/store';
import { ok, withMe } from '../../../_h';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  return withMe(async (me) => ok({ likes: await likeComment(me.profile.id, id) }));
}
