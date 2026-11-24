import { NextResponse } from 'next/server';
import { err } from '@/lib/api';
import { getMe } from '@/lib/auth';
import { AiError, claudeJson, openaiJson } from '@/lib/ai';
import { logUsage } from '@/lib/quota';
import { textCostKrw, textCostUsd } from '@/lib/pricing';

export const maxDuration = 300;


/** 관리자 › AI 사용 · 비용 › 글 AI 비교 — 같은 요청을 여러 모델에 동시에 보내 결과 · 시간 · 비용을 나란히 봐요 */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.isAdmin) return err('forbidden', '관리자만 비교할 수 있어요', 403);
  const b = await req.json().catch(() => ({}));
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
  const models: string[] = (Array.isArray(b.models) ? b.models : []).map((m: unknown) => String(m || '').trim()).filter(Boolean).slice(0, 3);
  if (!prompt || !models.length) return err('bad_request', '요청 글과 모델을 넣어 주세요');
  const rs = await Promise.all(models.map(async (model) => {
    const t0 = Date.now(), openai = /^(gpt|o\d|chatgpt)/i.test(model);
    try {
      const r = openai ? await openaiJson(prompt, model) : await claudeJson(prompt, model);
      const usd = textCostUsd(model, r.inTokens, r.outTokens), krw = textCostKrw(model, r.inTokens, r.outTokens);
      await logUsage(me.profile, { kind: 'text', model, units: 1, in_tokens: r.inTokens, out_tokens: r.outTokens, cost_krw: krw ?? 0 }).catch(() => {});
      return { model, engine: openai ? 'openai' : 'claude', ok: true, ms: Date.now() - t0, data: r.data, tokens: [r.inTokens, r.outTokens], usd, krw };
    } catch (e) {
      const a = e instanceof AiError ? e : new AiError('upstream_error', String(e));
      return { model, engine: openai ? 'openai' : 'claude', ok: false, ms: Date.now() - t0, code: a.code, message: a.message };
    }
  }));
  return NextResponse.json({ results: rs });
}
