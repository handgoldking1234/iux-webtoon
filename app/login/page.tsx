import Link from 'next/link';
import '../legal.css';
import { redirect } from 'next/navigation';
import { dbReady, env } from '@/lib/env';
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
    <div className="authpage">
      <Link href="/" className="authbrand" aria-label="바로웹툰 첫 화면"><i><Logo size={20} /></i><b>바로웹툰</b></Link>
      <div className="authcard">
        {dbReady() ? (
          <LoginForm next={next} initialMode={sp.mode === 'signup' ? 'signup' : 'login'} error={sp.error} providers={env.authProviders} />
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
            <h1>로그인 준비 중이에요</h1>
            <p className="note" style={{ fontSize: 13, lineHeight: 1.6 }}>회원가입 · 로그인을 곧 열어요. 그 전까지 편집기는 로그인 없이 쓸 수 있고, 작품은 이 브라우저에 저장돼요. AI 기획 · 콘티 · 이미지는 로그인이 열리면 쓸 수 있어요.</p>
            <a className="btn pri lg" href={next}>편집기 열기</a>
            <Link className="btn" href="/">처음으로</Link>
          </>
        )}
      </div>
      <footer className="authfoot">
        <nav><Link href="/">서비스 소개</Link><Link href="/terms">이용약관</Link><Link href="/privacy"><b>개인정보처리방침</b></Link></nav>
        <p>문의 help@iux.kr</p>
        <p>© 2026 바로웹툰 · webtoon.iux.kr</p>
      </footer>
    </div>
  );
}
