import { NextResponse } from 'next/server';
import { aiBlock, aiMe } from '@/lib/ai-access';
import { err, isRes } from '@/lib/api';
import { aiGate, logUsage } from '@/lib/quota';
import { AiError, claudeModelFor, claudeTextStream, textJson } from '@/lib/ai';
import { env } from '@/lib/env';
import { textCostKrw } from '@/lib/pricing';

export const maxDuration = 300;

/** 글 AI
 *  - { prompt }            한 번 묻기 → { data }
 *  - { prompts: [..4개까지] } 여러 조각을 한꺼번에(동시에) 묻기 → { datas } · 사용 횟수는 1회로 세요 (긴 작업을 나눠 빨리 끝내려고)
 *  - { prompt, stream:true } 쓰는 대로 글자를 흘려보내요 (Claude일 때만 · 아니면 평소처럼 { data }) */
export async function POST(req: Request) {
  const me = await aiMe();
  if (isRes(me)) return me;
  const blocked = aiBlock(me);
  if (blocked) return blocked;
  const body = await req.json().catch(() => ({}));
  const list: unknown[] = Array.isArray(body.prompts) ? body.prompts : [body.prompt];
  if (!list.length || list.length > 4 || list.some((p) => typeof p !== 'string' || !p.trim())) return err('bad_request', '보낼 내용이 없어요');
  const prompts = list as string[];
  if (prompts.reduce((a, p) => a + p.length, 0) > 150_000) return err('prompt_too_large', '한 번에 보내는 양이 너무 커요', 413);
  const g = await aiGate(me.profile, me.isAdmin, 'text');
  if (g.block) return err(...g.block);
  const engine = g.settings.engines.text;
  const model = engine === 'openai' ? env.openaiTextModel : claudeModelFor(prompts[0]);
  const quota = { ...g.quota, text: { ...g.quota.text, used: g.quota.text.used + 1 } };
  try {
    if (body.stream === true && prompts.length === 1 && engine === 'claude') {
      const stream = await claudeTextStream(prompts[0], async (u) => {
        await logUsage(me.profile, { kind: 'text', model, units: 1, in_tokens: u.inTokens, out_tokens: u.outTokens, cost_krw: textCostKrw(model, u.inTokens, u.outTokens) ?? g.settings.cost.text });
      });
      return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no', 'x-quota': JSON.stringify(quota) } });
    }
    const rs = await Promise.all(prompts.map((p) => textJson(engine, p)));
    await logUsage(me.profile, { kind: 'text', model, units: 1, in_tokens: rs.reduce((a, r) => a + r.inTokens, 0), out_tokens: rs.reduce((a, r) => a + r.outTokens, 0), cost_krw: rs.reduce((a, r) => a + (textCostKrw(model, r.inTokens, r.outTokens) ?? g.settings.cost.text), 0) });
    return NextResponse.json({ data: rs[0].data, datas: rs.length > 1 ? rs.map((r) => r.data) : undefined, truncated: rs.some((r) => r.truncated) || undefined, quota });
  } catch (e) {
    const a = e instanceof AiError ? e : new AiError('upstream_error', String(e));
    return err(a.code, a.message, a.status);
  }
}
