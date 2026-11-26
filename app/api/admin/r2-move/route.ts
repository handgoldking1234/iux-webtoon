import { NextResponse } from 'next/server';
import { err } from '@/lib/api';
import { getMe } from '@/lib/auth';
import { moveToR2, r2Ready } from '@/lib/storage';

export const maxDuration = 300;

/** 관리자 › 설정: 그림 저장소를 Supabase → Cloudflare R2로 옮겨요 (한 번에 40개씩, 끝날 때까지 화면이 이어서 불러요) */
export async function GET() {
  const me = await getMe();
  if (!me?.isAdmin) return err('forbidden', '관리자만 볼 수 있어요', 403);
  return NextResponse.json({ ready: r2Ready() });
}
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.isAdmin) return err('forbidden', '관리자만 옮길 수 있어요', 403);
  if (!r2Ready()) return err('not_ready', 'R2 환경 변수(R2_ACCOUNT_ID · R2_ACCESS_KEY_ID · R2_SECRET_ACCESS_KEY · R2_BUCKET)를 먼저 넣어 주세요', 400);
  const b = await req.json().catch(() => ({}));
  const next = Array.isArray(b.next) ? b.next.map(String) : null;
  try { return NextResponse.json(await moveToR2(next)); } catch (e) { return err('storage', String(e), 500); }
}
