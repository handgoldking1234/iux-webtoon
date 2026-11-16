import { NextResponse, type NextRequest } from 'next/server';

// 편집기(/studio)는 누구나 열 수 있어요 — AI · 클라우드 저장 · 연재만 회원 기능
const PROTECTED = ['/admin', '/account', '/read/publish'];

export async function middleware(req: NextRequest) {
  try {
    return await run(req);
  } catch (e) {
    // 여기서 멈추면 사이트 전체가 500이 돼요 — 무슨 일이 있어도 페이지는 열리게
    console.error('[웹툰보드] middleware', e);
    return NextResponse.next();
  }
}

async function run(req: NextRequest) {
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
  // 주소가 올바르지 않으면(자리표시 값 등) 연결 안 된 것으로 봐요 — 여기서 멈추면 사이트 전체가 500이 돼요
  if (!url || !anon || !/^https?:\/\/[^\s]+\.[^\s]+$/.test(url.trim())) return NextResponse.next();
  try {
  // Supabase를 쓸 때만 불러와요 (연결 전에는 이 모듈 때문에 미들웨어가 멈추지 않게)
  const { createServerClient } = await import('@supabase/ssr');

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(url.trim(), anon.trim(), {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
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
  } catch (e) {
    console.error('[웹툰보드] middleware', e);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|studio-assets/|.*\\.(?:png|jpg|svg|webp|ico|js|css)$).*)'],
};
