import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** 메일 링크 · 카카오 · 구글 로그인 후 돌아오는 곳 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const nx = url.searchParams.get('next') || '/studio';
  const next = nx.startsWith('/') ? nx : '/studio';
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=callback', url.origin));
}
