import { NextResponse } from 'next/server';
import { apiMe, err, isRes, safeKey } from '@/lib/api';
import { signUpload } from '@/lib/storage';

const MAX = 50 * 1024 * 1024;

/** 작품 본문 올릴 서명 주소 — 브라우저가 Storage로 바로 올려요(서버 용량 제한 피하기) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const { id } = await params;
  if (!safeKey(id) || me.mode !== 'cloud') return err('bad_id', '작품 id가 올바르지 않아요');
  const b = await req.json().catch(() => ({}));
  if (+b.bytes > MAX) return err('too_large', '작품 파일이 50MB를 넘어요', 413);
  try {
    return NextResponse.json({ url: await signUpload(`${me.profile.id}/projects/${id}.json`) });
  } catch (e) {
    return err('storage', String(e), 500);
  }
}
