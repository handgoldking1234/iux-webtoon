import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED = ['/studio', '/admin', '/account', '/read/publish'];

export async function middleware(req: NextRequest) {
  // 시험 배포: SITE_PASSWORD가 있으면 사이트 전체를 비밀번호로 잠가요 (아이디는 아무거나)
  const pw = process.env.SITE_PASSWORD;
  if (pw) {
    const h = req.headers.get('authorization') || '';
    let given = '';
    try { given = h.startsWith('Basic ') ? atob(h.slice(6)).split(':').slice(1).join(':') : ''; } catch { /* 잘못된 값 */ }
    if (given !== pw) return new NextResponse('비밀번호가 필요해요', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="webtoonboard-beta", charset="UTF-8"' } });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // DB 연동 전(로컬 시연 모드): 로그인 없이 통과
  if (!url || !anon) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  const p = req.nextUrl.pathname;
  if (!data.user && PROTECTED.some((x) => p === x || p.startsWith(x + '/'))) {
    const to = req.nextUrl.clone();
    to.pathname = '/login';
    to.search = `?next=${encodeURIComponent(p + req.nextUrl.search)}`;
    return NextResponse.redirect(to);
  }
  // 유입 채널 기억 (가입할 때 프로필에 남겨요)
  const src = req.nextUrl.searchParams.get('utm_source');
  if (src && !req.cookies.get('wb_src')) res.cookies.set('wb_src', src.slice(0, 40), { maxAge: 60 * 60 * 24 * 30, path: '/' });
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|studio-assets/|.*\\.(?:png|jpg|svg|webp|ico|js|css)$).*)'],
};
