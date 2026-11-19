import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { getMe } from '@/lib/auth';
import { getQuota } from '@/lib/quota';
import { getSettings } from '@/lib/settings';
import { engineReady } from '@/lib/ai';
import { aiNeed, GUEST } from '@/lib/ai-access';
import { activeNotices } from '@/lib/notices';

export const dynamic = 'force-dynamic';

let cache: string | null = null;

/** 편집기 페이지 — 누구나 열 수 있어요. 회원 정보 · 한도 · AI를 쓸 수 있는지를 심어서 보내요 */
export async function GET(req: Request) {
  const me = await getMe();
  if (me && me.profile.status === 'suspended') return NextResponse.redirect(new URL('/account?suspended=1', req.url));
  if (!cache || process.env.NODE_ENV !== 'production') cache = await readFile(join(process.cwd(), 'editor', 'studio.html'), 'utf8');
  const [st, notices] = await Promise.all([getSettings(), activeNotices()]);
  const need = aiNeed(me);
  const ai = { text: !need && engineReady(st.engines.text), image: !need && engineReady(st.engines.image) };
  let boot;
  if (!me) {
    // 손님: 편집기는 그대로 쓰고(이 브라우저에만 저장), AI · 클라우드 저장 · 연재는 가입하면 열려요
    boot = {
      mode: 'guest', user: null, isAdmin: false, plan: 'free',
      quota: need ? { plan: 'free', text: { used: 0, limit: st.limits.freeText, period: 'month' }, image: { used: 0, limit: st.limits.freeImage, period: 'total' } } : await getQuota(GUEST.profile),
      ai, aiNeed: need, notices,
    };
  } else {
    const p = me.profile;
    boot = {
      mode: me.mode,
      user: { id: p.id, name: p.name, email: p.email, provider: p.provider, avatar: p.avatar_url },
      isAdmin: me.isAdmin,
      plan: p.plan,
      quota: await getQuota(p),
      ai, aiNeed: need, notices,
    };
  }
  const json = JSON.stringify(boot).replace(/</g, '\\u003c');
  return new NextResponse(cache.replace('__WB_BOOT_JSON__', json), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
