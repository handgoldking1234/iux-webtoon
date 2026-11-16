import { getMe, LOCAL_PROFILE, type Me } from '@/lib/auth';
import { apiMe, err } from '@/lib/api';

/** AI를 누가 쓸 수 있나
 *  - 편집기는 누구나 (로그인 없이)
 *  - AI는 회원만 (AI_ACCESS=member, 기본값)
 *  - 혼자 시험할 때만: 로그인 없이 누구나 (AI_ACCESS=open) — 주소를 아는 사람은 누구나 결제한 AI를 쓰게 되니, 시험이 끝나면 꼭 지우세요
 *  - 나중에: 결제한 회원만 (AI_ACCESS=paid — 플랜이 pro · edu인 회원, 관리자는 항상 가능)
 *  DB 연동 전(회원이 없는 상태)에는 시험 계정(TEST_ACCOUNTS)으로 로그인했거나
 *  SITE_PASSWORD로 잠근 시험 배포에서만 AI가 열려요. */
export type AiNeed = null | 'login' | 'pro' | 'setup';
export const aiAccess = (): 'open' | 'member' | 'paid' => (process.env.AI_ACCESS === 'paid' ? 'paid' : process.env.AI_ACCESS === 'open' ? 'open' : 'member');

/** 로그인 안 한 사람 — AI_ACCESS=open일 때만 AI를 써요 (관리자가 아니라서 무료 한도 · 월 예산이 적용돼요) */
export const GUEST: Me = { mode: 'local', profile: { ...LOCAL_PROFILE, id: 'guest', name: '손님', email: null, provider: 'guest', role: 'user' }, isAdmin: false };

export function aiNeed(me: Me | null): AiNeed {
  if (aiAccess() === 'open') return null;
  if (!me) return 'login';
  if (me.mode === 'local') return process.env.SITE_PASSWORD || me.profile.provider === 'test' ? null : 'setup';
  if (me.isAdmin) return null;
  if (aiAccess() === 'paid' && me.profile.plan === 'free') return 'pro';
  return null;
}

/** API용 — 막히면 응답, 아니면 null */
export function aiBlock(me: Me) {
  const n = aiNeed(me);
  if (n === 'pro') return err('pro_only', 'AI는 유료 회원만 쓸 수 있어요', 402);
  if (n === 'setup') return err('not_configured', 'AI는 회원 기능이 연결된 뒤에 쓸 수 있어요', 503);
  return null;
}

/** AI API용 — 회원(또는 open일 때 손님)을 돌려줘요. 못 쓰면 응답 */
export async function aiMe() {
  if (aiAccess() === 'open') {
    const me = await getMe();
    if (me && me.profile.status === 'suspended') return err('suspended', '이용이 정지된 계정이에요', 403);
    return me || GUEST;
  }
  return apiMe();
}
