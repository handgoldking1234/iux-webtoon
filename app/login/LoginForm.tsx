'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

type Mode = 'login' | 'signup' | 'magic' | 'reset';
const ERR: Record<string, string> = {
  'Invalid login credentials': '이메일이나 비밀번호가 맞지 않아요',
  'User already registered': '이미 가입한 이메일이에요 · 로그인해 주세요',
  'Email not confirmed': '메일함에서 인증 링크를 먼저 눌러 주세요',
};

export default function LoginForm({ next, initialMode, error }: { next: string; initialMode: Mode; error?: string }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: 'ok' | 'bad'; s: string } | null>(error ? { t: 'bad', s: '로그인하지 못했어요 · 다시 시도해 주세요' } : null);
  const sb = supabaseBrowser();
  const cb = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const src = () => (typeof document !== 'undefined' ? document.cookie.match(/(?:^|; )wb_src=([^;]+)/)?.[1] : undefined);

  async function oauth(provider: 'google' | 'kakao') {
    setBusy(true);
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: cb() } });
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
        setMsg({ t: 'ok', s: '로그인 링크를 메일로 보냈어요' });
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

  const title = { login: '로그인', signup: '무료로 시작하기', magic: '메일 링크로 로그인', reset: '비밀번호 찾기' }[mode];
  return (
    <>
      <h1>{title}</h1>
      {(mode === 'login' || mode === 'signup') && (
        <>
          <div className="oauth">
            <button className="btn kakao" type="button" disabled={busy} onClick={() => oauth('kakao')}>카카오로 계속하기</button>
            <button className="btn" type="button" disabled={busy} onClick={() => oauth('google')}>Google로 계속하기</button>
          </div>
          <div className="or">또는 이메일</div>
        </>
      )}
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {mode === 'signup' && <label className="fld">이름(필명)<input value={name} onChange={(e) => setName(e.target.value)} placeholder="작가 이름" autoComplete="nickname" /></label>}
        <label className="fld">이메일<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        {(mode === 'login' || mode === 'signup') && (
          <label className="fld">비밀번호<input type="password" required minLength={mode === 'signup' ? 8 : 1} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? '8자 이상' : ''} /></label>
        )}
        {msg && <div className={`msg ${msg.t}`} role={msg.t === 'bad' ? 'alert' : 'status'}>{msg.s}</div>}
        <button className="btn pri lg" type="submit" disabled={busy}>{busy ? '잠시만요…' : mode === 'signup' ? '가입하기' : mode === 'login' ? '로그인' : '메일 보내기'}</button>
      </form>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
        {mode !== 'signup' ? <button className="lnk" onClick={() => { setMode('signup'); setMsg(null); }}>처음이에요 · 가입하기</button> : <button className="lnk" onClick={() => { setMode('login'); setMsg(null); }}>이미 계정이 있어요</button>}
        {mode === 'login' && <button className="lnk" onClick={() => { setMode('magic'); setMsg(null); }}>비밀번호 없이 메일 링크로</button>}
        {mode === 'login' && <button className="lnk" onClick={() => { setMode('reset'); setMsg(null); }}>비밀번호 찾기</button>}
        {(mode === 'magic' || mode === 'reset') && <button className="lnk" onClick={() => { setMode('login'); setMsg(null); }}>비밀번호로 로그인</button>}
      </div>
      <p className="note">가입하면 AI 이미지 10장 · 글 AI 매달 30회를 무료로 쓸 수 있어요.</p>
    </>
  );
}
