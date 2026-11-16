import Link from 'next/link';
import { redirect } from 'next/navigation';
import { dbReady } from '@/lib/env';
import { getMe } from '@/lib/auth';
import { Logo } from '@/components';
import { testReady } from '@/lib/test-accounts';
import LoginForm from './LoginForm';

export const metadata = { title: '로그인' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith('/') ? sp.next : '/studio';
  if ((dbReady() || testReady()) && (await getMe())) redirect(next);
  return (
    <div className="center">
      <div className="authcard">
        <span className="logo"><Logo size={22} /></span>
        {dbReady() ? (
          <LoginForm next={next} initialMode={sp.mode === 'signup' ? 'signup' : 'login'} error={sp.error} />
        ) : testReady() ? (
          <>
            <h1>시험 계정 로그인</h1>
            <p className="note" style={{ fontSize: 13, lineHeight: 1.6 }}>회원가입을 열기 전이에요. 받은 시험 계정으로 로그인하면 AI 기획 · 콘티 · 이미지를 써 볼 수 있어요. 편집기는 로그인 없이도 쓸 수 있어요.</p>
            <form method="post" action="/auth/test" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="hidden" name="next" value={next} />
              <label className="fld">아이디<input name="id" required autoComplete="username" autoCapitalize="none" /></label>
              <label className="fld">비밀번호<input name="pw" type="password" required autoComplete="current-password" /></label>
              {sp.error && <div className="msg bad" role="alert">아이디나 비밀번호가 맞지 않아요</div>}
              <button className="btn pri lg" type="submit">로그인</button>
            </form>
            <a className="btn" href="/studio">로그인 없이 편집기 열기</a>
          </>
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
