import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminReady, dbReady, env } from '@/lib/env';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';

export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  provider: string | null;
  role: 'user' | 'admin';
  plan: 'free' | 'pro' | 'edu';
  status: 'active' | 'suspended';
  bonus_images: number;
  pro_notify: boolean;
  created_at: string;
  last_seen_at: string | null;
};

export type Me = { mode: 'cloud' | 'local'; profile: Profile; isAdmin: boolean };

/** DB 연동 전 — 로그인 없이 쓰는 로컬 시연 계정 */
export const LOCAL_PROFILE: Profile = {
  id: 'local',
  email: 'local@webtoonboard.dev',
  name: '로컬 작가',
  avatar_url: null,
  provider: 'local',
  role: 'admin',
  plan: 'free',
  status: 'active',
  bonus_images: 0,
  pro_notify: false,
  created_at: new Date(0).toISOString(),
  last_seen_at: null,
};

/** 지금 로그인한 회원 — 없으면 null */
export async function getMe(): Promise<Me | null> {
  if (!dbReady()) return { mode: 'local', profile: LOCAL_PROFILE, isAdmin: true };
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  let { data: p } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
  if (!p) {
    // 웹툰보드에 처음 들어온 회원 — 여기서 프로필을 만들어요.
    // (auth 트리거를 쓰지 않아요: 공용 Supabase에서 다른 서비스 가입자까지 웹툰보드 회원이 되지 않게)
    const u = data.user, md = (u.user_metadata || {}) as Record<string, string | undefined>;
    let src: string | null = md.signup_source || null;
    try { src = src || (await cookies()).get('wb_src')?.value || null; } catch { /* 쿠키 없음 */ }
    const row = { id: u.id, email: u.email ?? null, name: md.name || md.full_name || u.email?.split('@')[0] || '작가', avatar_url: md.avatar_url ?? null, provider: (u.app_metadata?.provider as string) || 'email', signup_source: src };
    if (adminReady()) {
      const { data: made } = await supabaseAdmin().from('profiles').upsert(row, { onConflict: 'id', ignoreDuplicates: true }).select('*').maybeSingle();
      p = made || (await supabaseAdmin().from('profiles').select('*').eq('id', u.id).maybeSingle()).data;
    }
    if (!p) p = { ...LOCAL_PROFILE, ...row, role: 'user', created_at: u.created_at };
  }
  const isAdmin = p.role === 'admin' || (!!p.email && env.adminEmails.includes(p.email.toLowerCase()));
  return { mode: 'cloud', profile: p as Profile, isAdmin };
}

export async function requireMe(next = '/studio'): Promise<Me> {
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (me.profile.status === 'suspended') redirect('/account?suspended=1');
  return me;
}

export async function requireAdmin(): Promise<Me> {
  const me = await requireMe('/admin');
  if (!me.isAdmin) redirect('/studio');
  return me;
}
