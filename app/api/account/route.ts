import { NextResponse } from 'next/server';
import { apiMe, err, isRes } from '@/lib/api';
import { supabaseServer } from '@/lib/supabase/server';

/** 본인 정보 바꾸기 — 이름 · 프로 알림만 */
export async function PATCH(req: Request) {
  const me = await apiMe();
  if (isRes(me)) return me;
  if (me.mode !== 'cloud') return err('local', 'DB 연동 전이라 저장하지 않아요');
  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof b.name === 'string') patch.name = b.name.trim().slice(0, 40) || null;
  if (typeof b.pro_notify === 'boolean') patch.pro_notify = b.pro_notify;
  const sb = await supabaseServer();
  const { error } = await sb.from('profiles').update(patch).eq('id', me.profile.id);
  if (error) return err('db', error.message, 500);
  return NextResponse.json({ ok: true });
}
