'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

type Mode = 'login' | 'signup' | 'magic' | 'reset';
const ERR: Record<string, string> = {
  'Invalid login credentials': '이메일이나 비밀번호가 맞지 않아요',
  'User already registered': '이미 가입한 이메일이에요 · 로그인해 주세요',
  'Email not confirmed': '메일함에서 인증 링크를 먼저 눌러 주세요',
};

export default function LoginForm({ next, initialMode, error, providers = ['google', 'kakao', 'email'] }: { next: string; initialMode: Mode; error?: string; providers?: string[] }) {
  const has = (p: string) => providers.includes(p), useEmail = has('email'), social = has('google') || has('kakao') || has('naver');
  const [mode, setMode] = useState<Mode>(providers.includes('email') && initialMode !== 'signup' ? (initialMode === 'login' ? 'magic' : initialMode) : 'magic');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(initialMode === 'signup' && !social);
  const [msg, setMsg] = useState<{ t: 'ok' | 'bad'; s: string } | null>(error ? { t: 'bad', s: '로그인하지 못했어요 · 다시 시도해 주세요' } : null);
  const sb = supabaseBrowser();
  const cb = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const src = () => (typeof document !== 'undefined' ? document.cookie.match(/(?:^|; )wb_src=([^;]+)/)?.[1] : undefined);

  async function oauth(provider: 'google' | 'kakao' | 'custom:naver') {
    setBusy(true);
    const { error } = await sb.auth.signInWithOAuth({ provider: provider as 'google', options: { redirectTo: cb() } });
    if (error) { setMsg({ t: 'bad', s: error.message }); setBusy(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        location.href = next;
        return;
      }
      if (mode === 'signup') {
        if (pw.length < 8) throw new Error('비밀번호는 8자 이상이에요');
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: cb(), data: { name: name || email.split('@')[0], signup_source: src() } } });
        if (error) throw error;
        if (data.session) { location.href = next; return; }
        setMsg({ t: 'ok', s: '인증 메일을 보냈어요 · 메일함에서 링크를 누르면 바로 시작돼요' });
      }
      if (mode === 'magic') {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: cb(), data: { signup_source: src() } } });
        if (error) throw error;
        setMsg({ t: 'ok', s: `${email}로 로그인 링크를 보냈어요 · 메일함에서 링크를 눌러 주세요 (안 보이면 스팸함도 확인해 주세요)` });
      }
      if (mode === 'reset') {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/account?reset=1` });
        if (error) throw error;
        setMsg({ t: 'ok', s: '비밀번호를 바꿀 수 있는 링크를 메일로 보냈어요' });
      }
    } catch (x) {
      const m = x instanceof Error ? x.message : String(x);
      setMsg({ t: 'bad', s: ERR[m] || m });
    }
    setBusy(false);
  }

  const title = useEmail ? { login: '비밀번호로 로그인', signup: '비밀번호로 가입하기', magic: '이메일로 시작하기', reset: '비밀번호 찾기' }[mode] : '로그인 · 가입';
  const ok = (p: string) => has(p) && !busy;
  return (
    <>
      <h1 className="authtitle">{useEmail && open ? title : '로그인'}</h1>
      {!(useEmail && open) && <p className="authsub">{social ? '처음이면 누르는 것만으로 가입돼요' : '이메일로 로그인하거나 가입하세요'}</p>}
      {useEmail && !open && (
        <button className="authwide email" type="button" onClick={() => { setOpen(true); setMsg(null); }}>
          <MailIc /><span>이메일로 시작하기</span>
        </button>
      )}
      {useEmail && open && (<>
      <form onSubmit={submit} className="authform">
        {mode === 'signup' && <label className="fld">이름(필명)<input value={name} onChange={(e) => setName(e.target.value)} placeholder="작가 이름" autoComplete="nickname" /></label>}
        <label className="fld">이메일<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus /></label>
        {(mode === 'login' || mode === 'signup') && (
          <label className="fld">비밀번호<input type="password" required minLength={mode === 'signup' ? 8 : 1} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? '8자 이상' : ''} /></label>
        )}
        {msg && <div className={`msg ${msg.t}`} role={msg.t === 'bad' ? 'alert' : 'status'}>{msg.s}</div>}
        <button className="authwide pri" type="submit" disabled={busy}>{busy ? '잠시만요…' : mode === 'signup' ? '가입하기' : mode === 'login' ? '로그인' : mode === 'magic' ? '로그인 링크 받기' : '메일 보내기'}</button>
        {mode === 'magic' && !msg && <p className="authnote">메일로 받은 링크를 누르면 바로 로그인돼요. 처음이면 그대로 가입돼요.<br />링크는 이 브라우저에서 열어 주세요.</p>}
      </form>
      <div className="authlinks">
        {mode === 'magic' && <button className="lnk" type="button" onClick={() => { setMode('login'); setMsg(null); }}>비밀번호로 로그인</button>}
        {mode === 'login' && <button className="lnk" type="button" onClick={() => { setMode('magic'); setMsg(null); }}>이메일 링크로 로그인</button>}
        {mode === 'login' && <button className="lnk" type="button" onClick={() => { setMode('reset'); setMsg(null); }}>비밀번호 찾기</button>}
        {mode === 'login' && <button className="lnk" type="button" onClick={() => { setMode('signup'); setMsg(null); }}>비밀번호로 가입하기</button>}
        {(mode === 'signup' || mode === 'reset') && <button className="lnk" type="button" onClick={() => { setMode('magic'); setMsg(null); }}>이메일 링크로 시작하기</button>}
      </div>
      </>)}
      {social && (
        <>
          {useEmail && <div className="author">{open ? '또는 간편 로그인' : '또는'}</div>}
          <div className="authround">
            {has('kakao') && <button className="kakao" type="button" disabled={!ok('kakao')} onClick={() => oauth('kakao')} aria-label="카카오로 시작하기"><KakaoIc /><small>카카오</small></button>}
            {has('naver') && <button className="naver" type="button" disabled={!ok('naver')} onClick={() => oauth('custom:naver')} aria-label="네이버로 시작하기"><NaverIc /><small>네이버</small></button>}
            {has('google') && <button className="google" type="button" disabled={!ok('google')} onClick={() => oauth('google')} aria-label="Google로 시작하기"><GoogleIc /><small>Google</small></button>}
          </div>
          {busy && !open && <p className="authsub" role="status">로그인 화면으로 이동하는 중…</p>}
          {!open && msg && <div className={`msg ${msg.t}`} role="alert">{msg.s}</div>}
        </>
      )}
      <div className="authbox">
        <div><span>처음이신가요?</span><b>AI 이미지 10장 무료</b></div>
        <div><span>로그인 없이 먼저 써 볼래요?</span><a href="/studio">편집기 둘러보기</a></div>
      </div>
      <p className="authhelp">로그인에 어려움이 있나요? <a href="mailto:help@iux.kr?subject=%5B%EB%B0%94%EB%A1%9C%EC%9B%B9%ED%88%B0%5D%20%EB%A1%9C%EA%B7%B8%EC%9D%B8%20%EB%AC%B8%EC%9D%98">문의하기</a></p>
      <p className="authlegal">계속하면 <a href="/terms" target="_blank">이용약관</a>과 <a href="/privacy" target="_blank">개인정보처리방침</a>에 동의하는 것으로 봐요.</p>
    </>
  );
}

function KakaoIc() {
  return <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#191919" d="M12 3.5C6.8 3.5 2.6 6.8 2.6 10.9c0 2.6 1.7 4.9 4.3 6.2l-1 3.7c-.1.3.3.6.6.4l4.3-2.9c.4 0 .8.1 1.2.1 5.2 0 9.4-3.3 9.4-7.4S17.2 3.5 12 3.5z" /></svg>;
}
function NaverIc() {
  return <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#03C75A" d="M14.4 12.6 9.3 5H5v14h4.6v-7.6L14.7 19H19V5h-4.6z" /></svg>;
}
function GoogleIc() {
  return <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>;
}
function MailIc() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
}
