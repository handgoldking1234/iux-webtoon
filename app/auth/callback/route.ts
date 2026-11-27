import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** 메일 링크 · 카카오 · 구글 로그인 후 돌아오는 곳 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const nx = url.searchParams.get('next') || '/studio';
  const next = nx.startsWith('/') ? nx : '/studio';
  // 메일의 '로그인하기' 버튼(token_hash): 메일 회사가 링크를 미리 열어도 쓰이지 않게, 바로 처리하지 않고 확인 화면으로 보낸다
  const th = url.searchParams.get('token_hash');
  if (th) {
    const to = new URL('/auth/confirm', url.origin);
    to.searchParams.set('token_hash', th);
    to.searchParams.set('type', url.searchParams.get('type') || 'email');
    to.searchParams.set('next', next);
    return NextResponse.redirect(to);
  }
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/login?error=callback', url.origin));
}
