import 'server-only';
import { adminReady, env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/server';

/** 관리자 › 설정에서 바꾸는 운영 값 — DB에 없으면 환경 변수 기본값 */
export type Settings = {
  engines: { text: 'claude' | 'openai'; image: 'gemini' | 'openai' };
  limits: { freeText: number; freeImage: number; proText: number; proImage: number };
  budgetKrw: number;
  budgetStop: boolean; // 월 예산을 넘으면 AI를 멈출지
  cost: { text: number; image: number; imagePro: number };
};

export function defaults(): Settings {
  return {
    engines: { text: env.textEngine, image: env.imageEngine },
    limits: { ...env.limits },
    budgetKrw: env.budgetKrw,
    budgetStop: true,
    cost: { ...env.cost },
  };
}

let cache: { at: number; v: Settings } | null = null;
let localOverride: Partial<Settings> = {}; // DB 연동 전: 서버가 켜져 있는 동안만

const merge = (a: Settings, b: Partial<Settings>): Settings => ({
  engines: { ...a.engines, ...(b.engines || {}) },
  limits: { ...a.limits, ...(b.limits || {}) },
  budgetKrw: b.budgetKrw ?? a.budgetKrw,
  budgetStop: b.budgetStop ?? a.budgetStop,
  cost: { ...a.cost, ...(b.cost || {}) },
});

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.v;
  let v = defaults();
  if (adminReady()) {
    const { data } = await supabaseAdmin().from('app_settings').select('value').eq('key', 'main').maybeSingle();
    if (data?.value) v = merge(v, data.value as Partial<Settings>);
  } else v = merge(v, localOverride);
  cache = { at: Date.now(), v };
  return v;
}

export async function saveSettings(patch: Partial<Settings>, by?: string) {
  const next = merge(await getSettings(), patch);
  if (adminReady()) await supabaseAdmin().from('app_settings').upsert({ key: 'main', value: next, updated_at: new Date().toISOString(), updated_by: by && by !== 'local' ? by : null });
  else localOverride = next;
  cache = null;
  return next;
}
