import { env } from '@/lib/env';

export class AiError extends Error {
  constructor(public code: string, message: string, public status = 502) { super(message); }
}

/** 응답 글에서 JSON만 뽑기 (```json 감싸기 · 앞뒤 설명 허용) */
export function pickJson(text: string): unknown {
  const t = text.replace(/^﻿/, '').trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : t;
  try { return JSON.parse(body); } catch { /* 아래에서 다시 */ }
  const s = Math.min(...['{', '['].map((c) => { const i = body.indexOf(c); return i < 0 ? Infinity : i; }));
  const e = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
  if (s !== Infinity && e > s) { try { return JSON.parse(body.slice(s, e + 1)); } catch { /* fallthrough */ } }
  throw new AiError('invalid_json', 'AI 답을 읽지 못했어요');
}

/** 글 AI — Claude Messages API, 편집기가 보내는 프롬프트는 "JSON만 답해" 형식이에요 */
export async function claudeJson(prompt: string) {
  if (!env.anthropicKey) throw new AiError('not_configured', '글 AI 키가 없어요', 503);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.claudeModel,
      max_tokens: 8000,
      system: 'You are the writing assistant inside 웹툰보드, a Korean webtoon production tool. Follow the user instructions exactly and answer with valid JSON only — no markdown fences, no commentary.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (r.status === 429) throw new AiError('rate_limited', '요청이 많아요', 429);
  if (!r.ok) throw new AiError('upstream_error', `Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const text = (j.content || []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('');
  if (j.stop_reason === 'refusal') throw new AiError('refused', 'AI가 이 요청은 쓸 수 없다고 했어요', 422);
  return { data: pickJson(text), inTokens: j.usage?.input_tokens ?? 0, outTokens: j.usage?.output_tokens ?? 0 };
}

const RATIOS: [string, number][] = [['1:1', 1], ['2:3', 2 / 3], ['3:2', 1.5], ['3:4', 0.75], ['4:3', 4 / 3], ['4:5', 0.8], ['5:4', 1.25], ['9:16', 9 / 16], ['16:9', 16 / 9], ['21:9', 21 / 9]];
export const nearestRatio = (w: number, h: number) => {
  const r = w > 0 && h > 0 ? w / h : 0.75;
  return RATIOS.reduce((a, b) => (Math.abs(Math.log(b[1] / r)) < Math.abs(Math.log(a[1] / r)) ? b : a))[0];
};

/** 이미지 AI — Gemini(나노바나나), 참고 그림은 최대 3장 */
export async function geminiImage(prompt: string, w: number, h: number, refs: { mime: string; data: string }[], pro: boolean) {
  if (!env.geminiKey) throw new AiError('not_configured', '이미지 AI 키가 없어요', 503);
  const model = pro ? env.geminiModelPro : env.geminiModel;
  const parts = [...refs.slice(0, 3).map((r) => ({ inline_data: { mime_type: r.mime, data: r.data } })), { text: prompt }];
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': env.geminiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: nearestRatio(w, h) } } }),
  });
  if (r.status === 429) throw new AiError('rate_limited', '요청이 많아요', 429);
  if (!r.ok) throw new AiError('upstream_error', `Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const ps = j.candidates?.[0]?.content?.parts || [];
  const img = ps.map((p: Record<string, { data: string; mimeType?: string; mime_type?: string }>) => p.inlineData || p.inline_data).find(Boolean);
  if (!img) throw new AiError('blocked', j.promptFeedback?.blockReason || '그림을 만들지 못했어요', 422);
  return { bytes: Buffer.from(img.data, 'base64'), mime: img.mimeType || img.mime_type || 'image/png', model };
}
