import { NextResponse } from 'next/server';
import { apiMe, err, isRes } from '@/lib/api';
import { aiGate, logUsage } from '@/lib/quota';
import { AiError, textJson } from '@/lib/ai';
import { env } from '@/lib/env';

export const maxDuration = 120;

export async function POST(req: Request) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const { prompt } = await req.json().catch(() => ({}));
  if (typeof prompt !== 'string' || !prompt.trim()) return err('bad_request', '보낼 내용이 없어요');
  if (prompt.length > 150_000) return err('prompt_too_large', '한 번에 보내는 양이 너무 커요', 413);
  const g = await aiGate(me.profile, me.isAdmin, 'text');
  if (g.block) return err(...g.block);
  const engine = g.settings.engines.text;
  try {
    const r = await textJson(engine, prompt);
    await logUsage(me.profile, { kind: 'text', model: engine === 'openai' ? env.openaiTextModel : env.claudeModel, units: 1, in_tokens: r.inTokens, out_tokens: r.outTokens, cost_krw: g.settings.cost.text });
    return NextResponse.json({ data: r.data, quota: { ...g.quota, text: { ...g.quota.text, used: g.quota.text.used + 1 } } });
  } catch (e) {
    const a = e instanceof AiError ? e : new AiError('upstream_error', String(e));
    return err(a.code, a.message, a.status);
  }
}
