import { NextResponse } from 'next/server';
import { getMe } from '@/lib/auth';
import { engineReady } from '@/lib/ai';
import { aiAccess, aiNeed } from '@/lib/ai-access';
import { dbReady, env } from '@/lib/env';
import { getSettings } from '@/lib/settings';
import { testReady } from '@/lib/test-accounts';

export const dynamic = 'force-dynamic';

/** AI 연결 상태 — 왜 안 되는지 한눈에 보는 용도 (키 값은 절대 내보내지 않고, 들어 있는지만 알려 줘요) */
export async function GET() {
  const [me, st] = await Promise.all([getMe(), getSettings()]);
  const need = aiNeed(me);
  const why = { login: '로그인해야 AI를 쓸 수 있어요', pro: '유료 회원만 AI를 쓸 수 있어요', setup: 'AI_ACCESS=open 이나 TEST_ACCOUNTS 가 없어서 AI가 닫혀 있어요' };
  return NextResponse.json({
    버전: (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7),
    브랜치: process.env.VERCEL_GIT_COMMIT_REF || '',
    'AI_ACCESS': aiAccess(),
    회원기능: dbReady() ? 'Supabase 연결됨' : testReady() ? '시험 계정' : '없음',
    나: me ? (me.profile.provider === 'test' ? '시험 계정 로그인' : me.mode === 'local' ? '로그인 없음(시연 모드)' : '회원 로그인') : '손님',
    AI_사용: need ? `불가 — ${why[need]}` : '가능',
    글: { 엔진: st.engines.text, 키_있음: engineReady(st.engines.text), 모델: st.engines.text === 'openai' ? env.openaiTextModel : env.claudeModel },
    그림: { 엔진: st.engines.image, 키_있음: engineReady(st.engines.image), 모델: st.engines.image === 'openai' ? env.openaiImageModel : env.geminiModel },
    키: { ANTHROPIC: !!env.anthropicKey, GEMINI: !!env.geminiKey, OPENAI: !!env.openaiKey },
  }, { headers: { 'cache-control': 'no-store' } });
}
