import { NextResponse } from 'next/server';
import { getMe, type Me } from '@/lib/auth';

export const err = (code: string, message: string, status = 400) => NextResponse.json({ code, message }, { status });

/** API용 — 로그인 안 했으면 401, 정지면 403 */
export async function apiMe(): Promise<Me | NextResponse> {
  const me = await getMe();
  if (!me) return err('unauthorized', '로그인이 필요해요', 401);
  if (me.profile.status === 'suspended') return err('suspended', '이용이 정지된 계정이에요', 403);
  return me;
}
export const isRes = (x: unknown): x is NextResponse => x instanceof NextResponse;

/** 편집기 키 · 작품 id는 영문 · 숫자 · _ - 만 */
export const safeKey = (k: string) => /^[A-Za-z0-9_\-.:]{1,120}$/.test(k);
