import { dbReady, adminReady } from '@/lib/env';
import type { Profile } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSettings, type Settings } from '@/lib/settings';

export type Quota = {
  plan: Profile['plan'];
  text: { used: number; limit: number; period: 'month' };
  image: { used: number; limit: number; period: 'total' | 'month' };
};

/** 로컬 시연 모드 — 서버가 켜져 있는 동안만 세요 */
const local = { text: 0, image: 0, cost: 0 };

export function limitsOf(p: Pick<Profile, 'plan' | 'bonus_images'>, L: Settings['limits']) {
  const pro = p.plan === 'pro' || p.plan === 'edu';
  return {
    text: pro ? L.proText : L.freeText,
    image: (pro ? L.proImage : L.freeImage) + (p.bonus_images || 0),
    imagePeriod: (pro ? 'month' : 'total') as 'month' | 'total',
  };
}

export async function getQuota(p: Profile): Promise<Quota> {
  const L = limitsOf(p, (await getSettings()).limits);
  if (!dbReady() || !adminReady()) {
    return { plan: p.plan, text: { used: local.text, limit: L.text, period: 'month' }, image: { used: local.image, limit: L.image, period: L.imagePeriod } };
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
  monthCostCache = null;
  if (!dbReady() || !adminReady()) {
    if (row.ok !== false) { local[row.kind] += row.units; local.cost += row.cost_krw; }
    return;
  }
  await supabaseAdmin().from('ai_usage').insert({ user_id: p.id, ok: true, ...row });
}

/* ───────── 월 예산 — 넘으면 AI를 멈춰요 (관리자 › 설정에서 끌 수 있어요) */
let monthCostCache: { at: number; v: number } | null = null;
export async function monthCost(): Promise<number> {
  if (monthCostCache && Date.now() - monthCostCache.at < 60_000) return monthCostCache.v;
  let v = local.cost;
  if (adminReady()) {
    const d = new Date(), from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const { data } = await supabaseAdmin().from('ai_usage').select('cost_krw').gte('created_at', from).eq('ok', true).limit(200000);
    v = (data || []).reduce((a, r) => a + +r.cost_krw, 0);
  }
  monthCostCache = { at: Date.now(), v };
  return v;
}

/** AI 호출 전에: 예산 · 한도 확인 — 막히면 [code, message, status] */
export async function aiGate(p: Profile, isAdmin: boolean, kind: 'text' | 'image'): Promise<{ block: [string, string, number] | null; quota: Quota; settings: Settings }> {
  const [quota, settings] = await Promise.all([getQuota(p), getSettings()]);
  if (isAdmin) return { block: null, quota, settings };
  if (settings.budgetStop && (await monthCost()) >= settings.budgetKrw) return { block: ['budget_exceeded', '이번 달 AI 사용량이 많아 잠시 멈췄어요 · 다음 달 1일에 다시 열려요', 503], quota, settings };
  if (kind === 'text' && quota.text.used >= quota.text.limit) return { block: ['quota_exceeded', '이번 달 글 AI를 다 썼어요', 402], quota, settings };
  if (kind === 'image' && quota.image.used >= quota.image.limit) return { block: ['image_quota', 'AI 이미지를 다 썼어요', 402], quota, settings };
  return { block: null, quota, settings };
}
