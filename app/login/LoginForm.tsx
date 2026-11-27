'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

type Mode = 'login' | 'signup' | 'magic' | 'reset';
const ERR: Record<string, string> = {
  'Invalid login credentials': '이메일이나 비밀번호가 맞지 않아요',
  'User already registered': '이미 가입한 이메일이에요 · 로그인해 주세요',
  'Email not confirmed': '메일함에서 인증 코드를 먼저 확인해 주세요',
};
/** Supabase 영어 오류를 쉬운 한국어로 */
function korErr(m: string) {
  if (ERR[m]) return ERR[m];
  const sec = m.match(/after (\d+) seconds?/i);
  if (sec) return `잠시 후 다시 시도해 주세요 (${sec[1]}초 뒤에 다시 보낼 수 있어요)`;
  if (/rate limit|too many/i.test(m)) return '요청이 많아요 · 잠시 후 다시 시도해 주세요';
  if (/expired|invalid.*(otp|token)|token.*(expired|invalid)/i.test(m)) return '코드가 맞지 않거나 만료됐어요 · 다시 확인하거나 새 코드를 받아 주세요';
  if (/invalid.*email|email.*invalid/i.test(m)) return '이메일 주소를 확인해 주세요';
  if (/network|fetch/i.test(m)) return '인터넷 연결을 확인하고 다시 시도해 주세요';
  return /[가-힣]/.test(m) ? m : '잠시 후 다시 시도해 주세요';
}
/** 메일 언어: 브라우저가 한국어면 ko, 아니면 en (메일 양식이 이 값으로 언어를 고름) */
const mailLang = () => (/^ko/i.test((typeof navigator !== 'undefined' && (navigator.languages?.[0] || navigator.language)) || 'ko') ? 'ko' : 'en');

export default function LoginForm({ next, initialMode, error, providers = ['google', 'kakao', 'email'] }: { next: string; initialMode: Mode; error?: string; providers?: string[] }) {
  const has = (p: string) => providers.includes(p), useEmail = has('email'), social = has('google') || has('kakao') || has('naver');
  const [mode, setMode] = useState<Mode>(providers.includes('email') && initialMode !== 'signup' ? (initialMode === 'login' ? 'magic' : initialMode) : 'magic');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(initialMode === 'signup' && !social);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'' | 'magic' | 'signup'>(''); // 메일을 보낸 뒤 코드 입력 단계
  const [msg, setMsg] = useState<{ t: 'ok' | 'bad'; s: string } | null>(error ? { t: 'bad', s: '로그인하지 못했어요 · 다시 시도해 주세요' } : null);
  const sb = supabaseBrowser();
  const cb = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const src = () => (typeof document !== 'undefined' ? document.cookie.match(/(?:^|; )wb_src=([^;]+)/)?.[1] : undefined);

  async function oauth(provider: 'google' | 'kakao' | 'custom:naver') {
    setBusy(true);
    const { error } = await sb.auth.signInWithOAuth({ provider: provider as 'google', options: { redirectTo: cb() } });
    if (error) { setMsg({ t: 'bad', s: korErr(error.message) }); setBusy(false); }
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
        const { data, error } = await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: cb(), data: { name: name || email.split('@')[0], signup_source: src(), lang: mailLang() } } });
        if (error) throw error;
        if (data.session) { location.href = next; return; }
        setStep('signup'); setCode('');
      }
      if (mode === 'magic') {
        const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: cb(), data: { signup_source: src(), lang: mailLang() } } });
        if (error) throw error;
        setStep('magic'); setCode('');
      }
      if (mode === 'reset') {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/account?reset=1` });
        if (error) throw error;
        setMsg({ t: 'ok', s: '비밀번호를 바꿀 수 있는 링크를 메일로 보냈어요' });
      }
    } catch (x) {
      const m = x instanceof Error ? x.message : String(x);
      setMsg({ t: 'bad', s: korErr(m) });
    }
    setBusy(false);
  }

  /** 메일로 받은 숫자 코드로 로그인 (링크가 메일 검사기에 먼저 열려 만료돼도 코드는 그대로 쓸 수 있음) */
  async function verify(c: string) {
    const token = c.replace(/\D/g, '');
    if (token.length < 6) { setMsg({ t: 'bad', s: '메일에 있는 숫자 코드를 넣어 주세요' }); return; }
    setBusy(true); setMsg(null);
    let { error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
    if (error && step === 'signup') ({ error } = await sb.auth.verifyOtp({ email, token, type: 'signup' }));
    if (error) { setMsg({ t: 'bad', s: korErr(error.message) }); setBusy(false); return; }
    location.href = next;
  }
  function putCode(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 8);
    setCode(d);
    if (d.length === 6) verify(d);
  }
  async function pasteCode() {
    try {
      const t = (await navigator.clipboard.readText()).replace(/\D/g, '');
      if (t.length < 6) { setMsg({ t: 'bad', s: '복사한 내용에 숫자 코드가 없어요 · 메일에서 코드를 복사해 주세요' }); return; }
      putCode(t);
    } catch { setMsg({ t: 'bad', s: '코드 칸을 길게 눌러 붙여넣어 주세요' }); }
  }
  async function resend() {
    setBusy(true); setMsg(null);
    const { error } = step === 'signup'
      ? await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: cb() } })
      : await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: cb(), data: { signup_source: src(), lang: mailLang() } } });
    setMsg(error ? { t: 'bad', s: korErr(error.message) } : { t: 'ok', s: '새 코드를 보냈어요' });
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
      {useEmail && open && step && (
        <form className="authform" onSubmit={(e) => { e.preventDefault(); verify(code); }}>
          <p className="authnote" style={{ textAlign: 'left', fontSize: 14 }}><b>{email}</b> 으로 메일을 보냈어요.<br />메일에 있는 숫자 코드를 넣어 주세요. 안 보이면 스팸함도 확인해 주세요.</p>
          <label className="fld">메일의 숫자 코드
            <span className="otp">
              <span className="otp-box" aria-hidden="true">{Array.from({ length: Math.max(6, code.length) }, (_, i) => <span key={i} className={(code[i] ? 'fill' : '') + (i === code.length ? ' on' : '')}>{code[i] || ''}</span>)}</span>
              <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={8} value={code} onChange={(e) => putCode(e.target.value)} autoFocus aria-label="메일의 숫자 코드" />
            </span>
          </label>
          <button className="authwide email" type="button" onClick={pasteCode} disabled={busy}><ClipIc /><span>복사한 코드 붙여넣기</span></button>
          {msg && <div className={`msg ${msg.t}`} role={msg.t === 'bad' ? 'alert' : 'status'}>{msg.s}</div>}
          <button className="authwide pri" type="submit" disabled={busy}>{busy ? '확인 중…' : step === 'signup' ? '가입 마치기' : '로그인'}</button>
          <p className="authnote">메일의 버튼을 눌러도 로그인돼요.</p>
        </form>
      )}
      {useEmail && open && step && (
        <div className="authlinks">
          <button className="lnk" type="button" onClick={resend} disabled={busy}>코드 다시 받기</button>
          <button className="lnk" type="button" onClick={() => { setStep(''); setCode(''); setMsg(null); }}>다른 이메일로</button>
        </div>
      )}
      {useEmail && open && !step && (<>
      <form onSubmit={submit} className="authform">
        {mode === 'signup' && <label className="fld">이름(필명)<input value={name} onChange={(e) => setName(e.target.value)} placeholder="작가 이름" autoComplete="nickname" /></label>}
        <label className="fld">이메일<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus /></label>
        {(mode === 'login' || mode === 'signup') && (
          <label className="fld">비밀번호<input type="password" required minLength={mode === 'signup' ? 8 : 1} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? '8자 이상' : ''} /></label>
        )}
        {msg && <div className={`msg ${msg.t}`} role={msg.t === 'bad' ? 'alert' : 'status'}>{msg.s}</div>}
        <button className="authwide pri" type="submit" disabled={busy}>{busy ? '잠시만요…' : mode === 'signup' ? '가입하기' : mode === 'login' ? '로그인' : mode === 'magic' ? '로그인 코드 받기' : '메일 보내기'}</button>
        {mode === 'magic' && !msg && <p className="authnote">비밀번호 없이, 메일로 받은 숫자 코드를 넣으면 로그인돼요.<br />처음이면 그대로 가입돼요.</p>}
      </form>
      <div className="authlinks">
        {mode === 'magic' && <button className="lnk" type="button" onClick={() => { setMode('login'); setMsg(null); }}>비밀번호로 로그인</button>}
        {mode === 'login' && <button className="lnk" type="button" onClick={() => { setMode('magic'); setMsg(null); }}>이메일 코드로 로그인</button>}
        {mode === 'login' && <button className="lnk" type="button" onClick={() => { setMode('reset'); setMsg(null); }}>비밀번호 찾기</button>}
        {mode === 'login' && <button className="lnk" type="button" onClick={() => { setMode('signup'); setMsg(null); }}>비밀번호로 가입하기</button>}
        {(mode === 'signup' || mode === 'reset') && <button className="lnk" type="button" onClick={() => { setMode('magic'); setMsg(null); }}>이메일 코드로 시작하기</button>}
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
function ClipIc() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /><path d="M16 4h2a2 2 0 0 1 2 2v4" /><path d="M21 14H11" /><path d="m15 10-4 4 4 4" /></svg>;
}
function MailIc() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
}
