import { apiMe, err, isRes } from '@/lib/api';
import { getQuota, logUsage } from '@/lib/quota';
import { AiError, geminiImage } from '@/lib/ai';
import { env } from '@/lib/env';

export const maxDuration = 120;

export async function POST(req: Request) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const b = await req.json().catch(() => ({}));
  const prompt = String(b.prompt || '').slice(0, 8000);
  if (!prompt.trim()) return err('bad_request', '그릴 내용이 없어요');
  const refs = (Array.isArray(b.refs) ? b.refs : []).filter((r: { mime?: string; data?: string }) => r && /^image\//.test(r.mime || '') && typeof r.data === 'string' && r.data.length < 2_000_000);
  const q = await getQuota(me.profile);
  if (!me.isAdmin && q.image.used >= q.image.limit) return err('image_quota', 'AI 이미지를 다 썼어요', 402);
  const pro = b.model === 'pro';
  try {
    const r = await geminiImage(prompt, +b.width || 768, +b.height || 1024, refs, pro);
    await logUsage(me.profile, { kind: 'image', model: r.model, units: 1, cost_krw: pro ? env.cost.imagePro : env.cost.image });
    const quota = { ...q, image: { ...q.image, used: q.image.used + 1 } };
    return new Response(new Uint8Array(r.bytes), { headers: { 'content-type': r.mime, 'cache-control': 'no-store', 'x-wb-quota': JSON.stringify(quota) } });
  } catch (e) {
    const a = e instanceof AiError ? e : new AiError('upstream_error', String(e));
    return err(a.code, a.message, a.status);
  }
}
