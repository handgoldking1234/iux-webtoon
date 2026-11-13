import { NextResponse } from 'next/server';
import { err } from '@/lib/api';
import { getMe } from '@/lib/auth';
import { AiError, makeImage, modelOf, textJson } from '@/lib/ai';
import { getSettings } from '@/lib/settings';
import { logUsage } from '@/lib/quota';

export const maxDuration = 120;

/** 관리자 › 설정 › AI 연결 시험 — 짧은 글 1번 · 작은 그림 1장으로 키 · 모델 이름을 확인해요 (사용량에 기록돼요) */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.isAdmin) return err('forbidden', '관리자만 시험할 수 있어요', 403);
  const kind = (await req.json().catch(() => ({}))).kind === 'image' ? 'image' : 'text';
  const st = await getSettings(), t0 = Date.now();
  try {
    if (kind === 'text') {
      const r = await textJson(st.engines.text, '웹툰 로그라인 한 줄을 지어 주세요. 주인공은 혼을 보는 견습 사진사예요. JSON으로만: {"logline":"(한국어 한 문장)"}');
      await logUsage(me.profile, { kind: 'text', model: modelOf(st.engines.text), units: 1, in_tokens: r.inTokens, out_tokens: r.outTokens, cost_krw: st.cost.text });
      return NextResponse.json({ ok: true, engine: st.engines.text, model: modelOf(st.engines.text), ms: Date.now() - t0, data: r.data, tokens: [r.inTokens, r.outTokens] });
    }
    const r = await makeImage(st.engines.image, 'Korean webtoon style panel, a young apprentice photographer in 1940s Seoul standing in a darkroom lit by a red safelight, clean line art, soft cel shading, no text', 768, 1024, [], false, '1K');
    await logUsage(me.profile, { kind: 'image', model: r.model, units: 1, cost_krw: st.cost.image });
    return NextResponse.json({ ok: true, engine: st.engines.image, model: r.model, ms: Date.now() - t0, image: `data:${r.mime};base64,${r.bytes.toString('base64')}`, bytes: r.bytes.length });
  } catch (e) {
    const a = e instanceof AiError ? e : new AiError('upstream_error', String(e));
    return NextResponse.json({ ok: false, code: a.code, message: a.message, ms: Date.now() - t0 }, { status: 200 });
  }
}
