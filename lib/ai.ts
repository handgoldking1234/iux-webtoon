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
export async function geminiImage(prompt: string, w: number, h: number, refs: { mime: string; data: string }[], pro: boolean, res?: string) {
  if (!env.geminiKey) throw new AiError('not_configured', '이미지 AI 키가 없어요', 503);
  const model = pro ? env.geminiModelPro : env.geminiModel;
  const parts = [...refs.slice(0, 3).map((r) => ({ inline_data: { mime_type: r.mime, data: r.data } })), { text: prompt }];
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': env.geminiKey, 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: nearestRatio(w, h), ...(res && /^[124]K$/.test(res) && !/2\.5/.test(model) ? { imageSize: res } : {}) } } }),
  });
  if (r.status === 429) throw new AiError('rate_limited', '요청이 많아요', 429);
  if (!r.ok) throw new AiError('upstream_error', `Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const ps = j.candidates?.[0]?.content?.parts || [];
  const img = ps.map((p: Record<string, { data: string; mimeType?: string; mime_type?: string }>) => p.inlineData || p.inline_data).find(Boolean);
  if (!img) throw new AiError('blocked', j.promptFeedback?.blockReason || '그림을 만들지 못했어요', 422);
  return { bytes: Buffer.from(img.data, 'base64'), mime: img.mimeType || img.mime_type || 'image/png', model };
}

/* ───────── OpenAI (관리자 › 설정에서 엔진을 바꾸면) */
export async function openaiJson(prompt: string) {
  if (!env.openaiKey) throw new AiError('not_configured', 'OpenAI 키가 없어요', 503);
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.openaiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.openaiTextModel,
      messages: [
        { role: 'system', content: 'You are the writing assistant inside 웹툰보드, a Korean webtoon production tool. Follow the user instructions exactly and answer with valid JSON only — no markdown fences, no commentary.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (r.status === 429) throw new AiError('rate_limited', '요청이 많아요', 429);
  if (!r.ok) throw new AiError('upstream_error', `OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const text = j.choices?.[0]?.message?.content || '';
  if (j.choices?.[0]?.message?.refusal) throw new AiError('refused', 'AI가 이 요청은 쓸 수 없다고 했어요', 422);
  return { data: pickJson(text), inTokens: j.usage?.prompt_tokens ?? 0, outTokens: j.usage?.completion_tokens ?? 0 };
}

/** gpt-image 크기: 정사각 · 세로 · 가로 중 가까운 것 */
export const openaiSize = (w: number, h: number) => { const r = w / Math.max(1, h); return r > 1.2 ? '1536x1024' : r < 0.83 ? '1024x1536' : '1024x1024'; };

export async function openaiImage(prompt: string, w: number, h: number, refs: { mime: string; data: string }[], pro: boolean) {
  if (!env.openaiKey) throw new AiError('not_configured', 'OpenAI 키가 없어요', 503);
  const size = openaiSize(w, h), quality = pro ? 'high' : 'medium';
  let r: Response;
  if (refs.length) {
    const fd = new FormData();
    fd.append('model', env.openaiImageModel); fd.append('prompt', prompt); fd.append('size', size); fd.append('quality', quality);
    refs.slice(0, 3).forEach((x, i) => fd.append('image[]', new Blob([Buffer.from(x.data, 'base64')], { type: x.mime }), `ref${i}.jpg`));
    r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { authorization: `Bearer ${env.openaiKey}` }, body: fd });
  } else {
    r = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { authorization: `Bearer ${env.openaiKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ model: env.openaiImageModel, prompt, size, quality, n: 1 }) });
  }
  if (r.status === 429) throw new AiError('rate_limited', '요청이 많아요', 429);
  if (r.status === 400) { const t = await r.text(); if (/safety|moderation|policy/i.test(t)) throw new AiError('blocked', 'AI가 이 장면은 그릴 수 없다고 했어요', 422); throw new AiError('upstream_error', `OpenAI 400: ${t.slice(0, 200)}`); }
  if (!r.ok) throw new AiError('upstream_error', `OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new AiError('blocked', '그림을 만들지 못했어요', 422);
  return { bytes: Buffer.from(b64, 'base64'), mime: 'image/png', model: env.openaiImageModel };
}

/** 설정된 엔진으로 */
export const textJson = (engine: 'claude' | 'openai', prompt: string) => (engine === 'openai' ? openaiJson(prompt) : claudeJson(prompt));
export const makeImage = (engine: 'gemini' | 'openai', prompt: string, w: number, h: number, refs: { mime: string; data: string }[], pro: boolean, res?: string) =>
  engine === 'openai' ? openaiImage(prompt, w, h, refs, pro) : geminiImage(prompt, w, h, refs, pro, res);
export const engineReady = (k: 'claude' | 'openai' | 'gemini') => (k === 'claude' ? !!env.anthropicKey : k === 'openai' ? !!env.openaiKey : !!env.geminiKey);
export const modelOf = (engine: 'claude' | 'openai' | 'gemini', pro = false) => (engine === 'claude' ? env.claudeModel : engine === 'gemini' ? (pro ? env.geminiModelPro : env.geminiModel) : env.openaiImageModel);
