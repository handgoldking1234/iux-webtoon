import { NextResponse } from 'next/server';
import { apiMe, err, isRes, safeKey } from '@/lib/api';
import { supabaseServer } from '@/lib/supabase/server';

/** 그림 받기 — 서명 주소(10분) */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const { key } = await params;
  if (!safeKey(key) || me.mode !== 'cloud') return err('not_found', '그림을 찾을 수 없어요', 404);
  const sb = await supabaseServer();
  const { data, error } = await sb.storage.from('studio').createSignedUrl(`${me.profile.id}/assets/${key}`, 600);
  if (error || !data) return err('not_found', '그림을 찾을 수 없어요', 404);
  return NextResponse.json({ url: data.signedUrl });
}
