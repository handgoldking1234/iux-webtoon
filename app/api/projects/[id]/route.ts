import { NextResponse } from 'next/server';
import { apiMe, err, isRes, safeKey } from '@/lib/api';
import { supabaseServer } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

/** 작품 본문 받기 — Storage 서명 주소(1분)를 돌려줘요 */
export async function GET(_req: Request, { params }: Ctx) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const { id } = await params;
  if (!safeKey(id) || me.mode !== 'cloud') return err('bad_id', '작품을 찾을 수 없어요', 404);
  const sb = await supabaseServer();
  const { data: p } = await sb.from('projects').select('data_path').eq('id', id).maybeSingle();
  if (!p?.data_path) return err('not_found', '작품을 찾을 수 없어요', 404);
  const { data, error } = await sb.storage.from('studio').createSignedUrl(p.data_path, 60);
  if (error) return err('storage', error.message, 500);
  return NextResponse.json({ url: data.signedUrl });
}

/** 올린 뒤 목록 정보 저장 */
export async function POST(req: Request, { params }: Ctx) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const { id } = await params;
  if (!safeKey(id)) return err('bad_id', '작품 id가 올바르지 않아요');
  if (me.mode !== 'cloud') return NextResponse.json({ ok: true, local: true });
  const b = await req.json().catch(() => ({}));
  const meta = typeof b.meta === 'object' && b.meta ? b.meta : {};
  const sb = await supabaseServer();
  const { error } = await sb.from('projects').upsert({
    id, owner_id: me.profile.id,
    title: String(b.title || meta.title || '새 작품').slice(0, 120),
    meta, data_path: `${me.profile.id}/projects/${id}.json`,
    size_bytes: Math.max(0, +b.bytes || 0), episodes: Math.max(0, +b.episodes || 0), cuts: Math.max(0, +b.cuts || 0),
    deleted_at: null, updated_at: new Date().toISOString(),
  });
  if (error) return err('db', error.message, 500);
  return NextResponse.json({ ok: true });
}

/** 지우기 — 30일 동안은 관리자 화면에서 되살릴 수 있게 표시만 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const { id } = await params;
  if (!safeKey(id) || me.mode !== 'cloud') return NextResponse.json({ ok: true });
  const sb = await supabaseServer();
  await sb.from('projects').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true });
}
