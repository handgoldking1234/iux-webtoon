import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/** 로그인한 사용자 권한으로 (RLS 적용) */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* 서버 컴포넌트에서는 쿠키를 못 써요 — 미들웨어가 갱신해요 */
        }
      },
    },
  });
}

/** 서버 전용 관리자 키 (RLS 무시) — 절대 브라우저로 보내지 않아요 */
export function supabaseAdmin() {
  return createAdmin(env.supabaseUrl, env.serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}
