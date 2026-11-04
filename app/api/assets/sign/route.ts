import { NextResponse } from 'next/server';
import { apiMe, err, isRes, safeKey } from '@/lib/api';
import { supabaseServer } from '@/lib/supabase/server';

const MAX = 25 * 1024 * 1024;
const OK_MIME = /^(image\/(png|jpe?g|webp|gif|avif|bmp)|application\/octet-stream)$/;

/** 그림 올릴 서명 주소 (이미 있으면 exists) */
export async function POST(req: Request) {
  const me = await apiMe();
  if (isRes(me)) return me;
  if (me.mode !== 'cloud') return err('local', 'DB 연동 전이에요');
  const b = await req.json().catch(() => ({}));
  const key = String(b.key || ''), mime = String(b.mime || 'application/octet-stream'), bytes = +b.bytes || 0;
  if (!safeKey(key)) return err('bad_key', '그림 키가 올바르지 않아요');
  if (bytes > MAX) return err('too_large', '그림이 25MB를 넘어요', 413);
  if (!OK_MIME.test(mime)) return err('bad_type', '이미지 파일만 올릴 수 있어요');
  const sb = await supabaseServer();
  const path = `${me.profile.id}/assets/${key}`;
  const { data: ex } = await sb.from('assets').select('key').eq('owner_id', me.profile.id).eq('key', key).maybeSingle();
  if (ex) return NextResponse.json({ exists: true });
  const { data, error } = await sb.storage.from('studio').createSignedUploadUrl(path, { upsert: true });
  if (error) return err('storage', error.message, 500);
  await sb.from('assets').upsert({ owner_id: me.profile.id, key, path, bytes, mime });
  return NextResponse.json({ url: data.signedUrl });
}
