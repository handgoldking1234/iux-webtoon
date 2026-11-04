import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { getMe } from '@/lib/auth';
import { getQuota } from '@/lib/quota';
import { getSettings } from '@/lib/settings';
import { engineReady } from '@/lib/ai';
import { activeNotices } from '@/lib/notices';

export const dynamic = 'force-dynamic';

let cache: string | null = null;

/** 편집기 페이지 — 회원 정보 · 한도 · AI 연결 여부를 심어서 보내요 */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.redirect(new URL('/login?next=/studio', req.url));
  if (me.profile.status === 'suspended') return NextResponse.redirect(new URL('/account?suspended=1', req.url));
  if (!cache || process.env.NODE_ENV !== 'production') cache = await readFile(join(process.cwd(), 'editor', 'studio.html'), 'utf8');
  const [quota, st, notices] = await Promise.all([getQuota(me.profile), getSettings(), activeNotices()]);
  const p = me.profile;
  const boot = {
    mode: me.mode,
    user: { id: p.id, name: p.name, email: p.email, provider: p.provider, avatar: p.avatar_url },
    isAdmin: me.isAdmin,
    plan: p.plan,
    quota,
    ai: { text: engineReady(st.engines.text), image: engineReady(st.engines.image) },
    notices,
  };
  const json = JSON.stringify(boot).replace(/</g, '\\u003c');
  return new NextResponse(cache.replace('__WB_BOOT_JSON__', json), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
