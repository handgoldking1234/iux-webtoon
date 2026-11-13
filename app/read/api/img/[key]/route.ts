import { memImage } from '@/lib/read/store';

/** 로컬 시연 모드의 연재 그림 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const m = memImage(decodeURIComponent((await params).key));
  if (!m) return new Response('not found', { status: 404 });
  return new Response(new Uint8Array(m.data), { headers: { 'content-type': m.type, 'cache-control': 'public, max-age=3600' } });
}
