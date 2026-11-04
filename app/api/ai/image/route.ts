import { apiMe, err, isRes } from '@/lib/api';
import { aiGate, logUsage } from '@/lib/quota';
import { AiError, makeImage } from '@/lib/ai';

export const maxDuration = 120;

export async function POST(req: Request) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const b = await req.json().catch(() => ({}));
  const prompt = String(b.prompt || '').slice(0, 8000);
  if (!prompt.trim()) return err('bad_request', '그릴 내용이 없어요');
  const refs = (Array.isArray(b.refs) ? b.refs : []).filter((r: { mime?: string; data?: string }) => r && /^image\//.test(r.mime || '') && typeof r.data === 'string' && r.data.length < 2_000_000);
  const g = await aiGate(me.profile, me.isAdmin, 'image');
  if (g.block) return err(...g.block);
  const pro = b.model === 'pro', engine = g.settings.engines.image;
  try {
    const r = await makeImage(engine, prompt, +b.width || 768, +b.height || 1024, refs, pro, typeof b.res === 'string' ? b.res : undefined);
    await logUsage(me.profile, { kind: 'image', model: r.model, units: 1, cost_krw: pro ? g.settings.cost.imagePro : g.settings.cost.image });
    const quota = { ...g.quota, image: { ...g.quota.image, used: g.quota.image.used + 1 } };
    return new Response(new Uint8Array(r.bytes), { headers: { 'content-type': r.mime, 'cache-control': 'no-store', 'x-wb-quota': JSON.stringify(quota) } });
  } catch (e) {
    const a = e instanceof AiError ? e : new AiError('upstream_error', String(e));
    return err(a.code, a.message, a.status);
  }
}
