'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type P =
  | { part: 'profile'; name: string; proNotify: boolean; reset: boolean; local: boolean }
  | { part: 'inquiry'; local: boolean };

export default function AccountClient(props: P) {
  return props.part === 'profile' ? <ProfileBox {...props} /> : <InquiryBox />;
}

function ProfileBox(props: { name: string; proNotify: boolean; reset: boolean; local: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  {
    const [name, setName] = useState(props.name);
    const [pn, setPn] = useState(props.proNotify);
    const [pw, setPw] = useState('');
    const save = async (patch: Record<string, unknown>) => {
      setBusy(true);
      const r = await fetch('/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) });
      const j = await r.json().catch(() => ({}));
      setMsg(r.ok ? '저장했어요' : j.message || '저장하지 못했어요');
      setBusy(false);
      router.refresh();
    };
    const changePw = async () => {
      if (pw.length < 8) { setMsg('비밀번호는 8자 이상이에요'); return; }
      const { supabaseBrowser } = await import('@/lib/supabase/browser');
      const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
      setMsg(error ? error.message : '비밀번호를 바꿨어요'); setPw('');
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <label className="fld">이름(필명)<div style={{ display: 'flex', gap: 6 }}><input value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1 }} /><button className="btn" disabled={busy || props.local} onClick={() => save({ name })}>저장</button></div></label>
        <label className="tg" style={{ borderBottom: 0, padding: 0 }}><span><b>프로 알림 받기</b><small>유료 요금제가 열리면 가장 먼저 알려 드려요</small></span><input className="sw" type="checkbox" checked={pn} disabled={props.local} onChange={(e) => { setPn(e.target.checked); save({ pro_notify: e.target.checked }); }} /></label>
        {!props.local && (
          <details open={props.reset}><summary className="note" style={{ cursor: 'pointer' }}>비밀번호 바꾸기</summary>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="새 비밀번호 8자 이상" style={{ flex: 1 }} autoComplete="new-password" /><button className="btn" onClick={changePw}>바꾸기</button></div>
          </details>
        )}
        {msg && <div className="msg ok" role="status">{msg}</div>}
      </div>
    );
  }
}

function InquiryBox() {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const r = await fetch('/api/inquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subject, body }) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? (j.local ? '로컬 시연 모드라 저장하지 않았어요' : '문의를 보냈어요 · 답변이 오면 알려 드려요') : j.message || '보내지 못했어요');
    if (r.ok) { setSubject(''); setBody(''); router.refresh(); }
    setBusy(false);
  };
  return (
    <form onSubmit={send} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="제목" required maxLength={120} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="무엇을 도와 드릴까요?" required rows={4} maxLength={4000} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button className="btn pri" disabled={busy}>문의 보내기</button>{msg && <span className="note">{msg}</span>}</div>
    </form>
  );
}
