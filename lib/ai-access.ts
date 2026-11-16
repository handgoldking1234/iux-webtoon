import type { Me } from '@/lib/auth';
import { err } from '@/lib/api';

/** AI를 누가 쓸 수 있나
 *  - 편집기는 누구나 (로그인 없이)
 *  - AI는 회원만 (AI_ACCESS=member, 기본값)
 *  - 나중에: 결제한 회원만 (AI_ACCESS=paid — 플랜이 pro · edu인 회원, 관리자는 항상 가능)
 *  DB 연동 전(회원이 없는 상태)에는 SITE_PASSWORD로 잠근 시험 배포에서만 AI가 열려요. */
export type AiNeed = null | 'login' | 'pro' | 'setup';
export const aiAccess = (): 'member' | 'paid' => (process.env.AI_ACCESS === 'paid' ? 'paid' : 'member');

export function aiNeed(me: Me | null): AiNeed {
  if (!me) return 'login';
  if (me.mode === 'local') return process.env.SITE_PASSWORD ? null : 'setup';
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
