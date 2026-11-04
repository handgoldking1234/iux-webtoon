import { NextResponse } from 'next/server';
import { apiMe, err, isRes } from '@/lib/api';
import { getQuota, logUsage } from '@/lib/quota';
import { AiError, claudeJson } from '@/lib/ai';
import { env } from '@/lib/env';

export const maxDuration = 120;

export async function POST(req: Request) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const { prompt } = await req.json().catch(() => ({}));
  if (typeof prompt !== 'string' || !prompt.trim()) return err('bad_request', '보낼 내용이 없어요');
  if (prompt.length > 150_000) return err('prompt_too_large', '한 번에 보내는 양이 너무 커요', 413);
  const q = await getQuota(me.profile);
  if (!me.isAdmin && q.text.used >= q.text.limit) return err('quota_exceeded', '이번 달 글 AI를 다 썼어요', 402);
  try {
    const r = await claudeJson(prompt);
    await logUsage(me.profile, { kind: 'text', model: env.claudeModel, units: 1, in_tokens: r.inTokens, out_tokens: r.outTokens, cost_krw: env.cost.text });
    return NextResponse.json({ data: r.data, quota: { ...q, text: { ...q.text, used: q.text.used + 1 } } });
  } catch (e) {
    const a = e instanceof AiError ? e : new AiError('upstream_error', String(e));
    return err(a.code, a.message, a.status);
  }
}
