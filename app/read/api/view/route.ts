import { addView } from '@/lib/read/store';
import { body, ok } from '../_h';

/** 조회수 +1 — 로그인 안 해도 돼요 (같은 브라우저는 6시간에 한 번만 보내요) */
export async function POST(req: Request) {
  const b = await body<{ episodeId?: number }>(req);
  if (b.episodeId) await addView(Number(b.episodeId)).catch(() => {});
  return ok({ ok: true });
}
