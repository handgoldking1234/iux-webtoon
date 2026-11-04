import { dbReady, adminReady, env } from '@/lib/env';
import type { Profile } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export type Quota = {
  plan: Profile['plan'];
  text: { used: number; limit: number; period: 'month' };
  image: { used: number; limit: number; period: 'total' | 'month' };
};

/** 로컬 시연 모드 — 서버가 켜져 있는 동안만 세요 */
const localUse = { text: 0, image: 0 };

export function limitsOf(p: Profile) {
  const pro = p.plan === 'pro' || p.plan === 'edu';
  return {
    text: pro ? env.limits.proText : env.limits.freeText,
    image: (pro ? env.limits.proImage : env.limits.freeImage) + (p.bonus_images || 0),
    imagePeriod: (pro ? 'month' : 'total') as 'month' | 'total',
  };
}

export async function getQuota(p: Profile): Promise<Quota> {
  const L = limitsOf(p);
  if (!dbReady() || !adminReady()) {
    return { plan: p.plan, text: { used: localUse.text, limit: L.text, period: 'month' }, image: { used: localUse.image, limit: L.image, period: L.imagePeriod } };
  }
  const sb = supabaseAdmin();
  const [{ data: m }, { data: t }] = await Promise.all([
    sb.from('usage_month').select('text_used,image_used').eq('user_id', p.id).maybeSingle(),
    sb.from('usage_total').select('image_used_total').eq('user_id', p.id).maybeSingle(),
  ]);
  const imgUsed = L.imagePeriod === 'month' ? m?.image_used ?? 0 : t?.image_used_total ?? 0;
  return { plan: p.plan, text: { used: m?.text_used ?? 0, limit: L.text, period: 'month' }, image: { used: imgUsed, limit: L.image, period: L.imagePeriod } };
}

export async function logUsage(p: Profile, row: { kind: 'text' | 'image'; model: string; units: number; in_tokens?: number; out_tokens?: number; cost_krw: number; ok?: boolean }) {
  if (!dbReady() || !adminReady()) {
    if (row.ok !== false) localUse[row.kind] += row.units;
    return;
  }
  await supabaseAdmin().from('ai_usage').insert({ user_id: p.id, ok: true, ...row });
}

/** 관리자는 한도 없이 */
export const unlimited = (isAdmin: boolean) => isAdmin;
