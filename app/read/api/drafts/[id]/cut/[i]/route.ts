import { adminReady } from '@/lib/env';
import { putMemImage } from '@/lib/read/store';
import { err, ok, withMe } from '../../../../_h';

/** 로컬 시연 모드에서만 — 그림을 서버 메모리에 받아요 (DB 연동 후에는 저장소로 바로 올라가요) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; i: string }> }) {
  if (adminReady()) return err('gone', '저장소로 바로 올려 주세요', 410);
  const p = await params;
  return withMe(async (me) => {
    const buf = Buffer.from(await req.arrayBuffer());
    if (buf.length > 20 * 1048576) return err('too_big', '그림 한 장은 20MB까지예요');
    putMemImage(me.profile.id, p.id, Number(p.i), req.headers.get('content-type') || 'image/jpeg', buf);
    return ok({ ok: true });
  });
}
