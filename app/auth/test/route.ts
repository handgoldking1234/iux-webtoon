import { NextResponse } from 'next/server';
import { dbReady } from '@/lib/env';
import { TEST_COOKIE, testLogin, testReady } from '@/lib/test-accounts';

/** 시험 계정 로그인 (Supabase 연결 전에만) */
export async function POST(req: Request) {
  const f = await req.formData().catch(() => null);
  const next = String(f?.get('next') || '/studio');
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url), { status: 303 });
  const safe = next.startsWith('/') && !next.startsWith('//') ? next : '/studio';
  if (dbReady() || !testReady()) return to('/login');
  const v = testLogin(String(f?.get('id') || '').trim(), String(f?.get('pw') || ''));
  if (!v) {
    await new Promise((r) => setTimeout(r, 800)); // 마구 넣어 보는 것을 늦춰요
    return to(`/login?error=1&next=${encodeURIComponent(safe)}`);
  }
  const res = to(safe);
  res.cookies.set(TEST_COOKIE, v, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return res;
}
