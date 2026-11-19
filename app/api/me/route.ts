import { NextResponse } from 'next/server';
import { apiMe, isRes } from '@/lib/api';
import { getQuota } from '@/lib/quota';
import { adminReady } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET() {
  const me = await apiMe();
  if (isRes(me)) return me;
  return NextResponse.json({ mode: me.mode, profile: me.profile, isAdmin: me.isAdmin, quota: await getQuota(me.profile) });
}

/** 편집기를 열 때마다 — 마지막 접속 시각 */
export async function POST() {
  const me = await apiMe();
  if (isRes(me)) return me;
  if (me.mode === 'cloud' && adminReady()) await supabaseAdmin().from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', me.profile.id);
  return NextResponse.json({ ok: true });
}
