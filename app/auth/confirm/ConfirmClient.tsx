'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';

type OtpType = 'email' | 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change';

/** 메일 버튼을 누르면 오는 확인 화면. 한 번 더 눌러야 로그인돼서, 메일 회사가 링크를 미리 열어 봐도 만료되지 않는다. */
export default function ConfirmClient() {
  const q = useSearchParams(), router = useRouter();
  const th = q.get('token_hash') || '';
  const type = (q.get('type') || 'email') as OtpType;
  const nx = q.get('next') || '/studio';
  const next = nx.startsWith('/') ? nx : '/studio';
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function go() {
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().auth.verifyOtp({ token_hash: th, type });
    if (error) { setErr('링크가 만료됐거나 이미 사용됐어요. 로그인 화면에서 다시 받아 주세요.'); setBusy(false); return; }
    router.replace(next);
  }

  return (
    <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>로그인을 마무리할게요</h1>
        <p style={{ color: '#666', margin: '0 0 24px', lineHeight: 1.6 }}>아래 버튼을 누르면 로그인돼요.</p>
        {th ? (
          <button onClick={go} disabled={busy} style={{ width: '100%', padding: '15px 0', borderRadius: 12, border: 0, background: '#111', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
            {busy ? '확인 중…' : '로그인하기'}
          </button>
        ) : (
          <p style={{ color: '#c00' }}>링크 정보가 없어요. 로그인 화면에서 다시 시도해 주세요.</p>
        )}
        {err && <p role="alert" style={{ color: '#c00', marginTop: 16 }}>{err}</p>}
        <p style={{ marginTop: 20 }}><a href="/login" style={{ color: '#666' }}>로그인 화면으로</a></p>
      </div>
    </main>
  );
}
