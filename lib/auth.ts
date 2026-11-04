import { redirect } from 'next/navigation';
import { dbReady, env } from '@/lib/env';
import { supabaseServer } from '@/lib/supabase/server';

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
    // 트리거가 아직 안 돌았으면 최소 정보로
    p = { ...LOCAL_PROFILE, id: data.user.id, email: data.user.email ?? null, name: data.user.email?.split('@')[0] ?? '작가', provider: data.user.app_metadata?.provider ?? 'email', role: 'user', created_at: data.user.created_at };
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
