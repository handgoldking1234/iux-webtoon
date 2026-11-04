import Link from 'next/link';
import { redirect } from 'next/navigation';
import { dbReady } from '@/lib/env';
import { getMe } from '@/lib/auth';
import { Logo } from '@/components';
import LoginForm from './LoginForm';

export const metadata = { title: '로그인' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') ? sp.next : '/studio';
  if (dbReady() && (await getMe())) redirect(next);
  return (
    <div className="center">
      <div className="authcard">
        <span className="logo"><Logo size={22} /></span>
        {dbReady() ? (
          <LoginForm next={next} initialMode={sp.mode === 'signup' ? 'signup' : 'login'} error={sp.error} />
        ) : (
          <>
            <h1>로컬 시연 모드</h1>
            <p className="note" style={{ fontSize: 13, lineHeight: 1.6 }}>아직 DB(Supabase)가 연결되지 않아 로그인 없이 시작해요. 작품은 이 브라우저에만 저장돼요. <code>.env.local</code>에 Supabase 키를 넣으면 회원 로그인이 켜져요.</p>
            <a className="btn pri lg" href={next}>작업실 열기</a>
            <Link className="btn" href="/">처음으로</Link>
          </>
        )}
      </div>
    </div>
  );
}
