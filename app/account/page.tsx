import Link from 'next/link';
import { requireMe } from '@/lib/auth';
import { getQuota } from '@/lib/quota';
import { supabaseServer } from '@/lib/supabase/server';
import { Logo } from '@/components';
import AccountClient from './AccountClient';
import { mailReady } from '@/lib/mail';

export const metadata = { title: '내 계정' };
export const dynamic = 'force-dynamic';

const PLAN = { free: '무료', pro: '프로', edu: '교육' } as const;

export default async function Account({ searchParams }: { searchParams: Promise<{ suspended?: string; reset?: string }> }) {
  const sp = await searchParams;
  const me = await requireMe('/account').catch(() => null);
  if (!me) return null;
  const p = me.profile, q = await getQuota(p);
  let inquiries: { id: number; subject: string; status: string; answer: string | null; created_at: string }[] = [];
  let works = 0;
  if (me.mode === 'cloud') {
    const sb = await supabaseServer();
    const [{ data: iq }, { count }] = await Promise.all([
      sb.from('inquiries').select('id,subject,status,answer,created_at').order('created_at', { ascending: false }).limit(20),
      sb.from('projects').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    ]);
    inquiries = iq || []; works = count || 0;
  }
  const bar = (u: number, l: number) => <div className="meter"><i style={{ width: `${Math.min(100, (u / Math.max(1, l)) * 100)}%` }} /></div>;
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="wrap">
        <header className="ph"><span className="brand" style={{ padding: 0 }}><i><Logo /></i></span><h1>내 계정</h1><div className="act"><a className="btn pri" href="/studio">작업실로</a><a className="btn" href="/auth/signout">로그아웃</a></div></header>
        {sp.suspended && <div className="callout w">이용이 정지된 계정이에요. 아래 문의로 알려 주시면 확인해 드려요.</div>}
        {me.mode === 'local' && <div className="msg info">DB 연동 전 · 로컬 시연 모드예요. 계정 정보는 저장되지 않아요.</div>}
        <div className="grid g-2">
          <div className="card">
            <h2>회원 정보</h2>
            <dl className="kv"><dt>이메일</dt><dd>{p.email}</dd><dt>로그인</dt><dd>{{ email: '이메일', google: 'Google', kakao: '카카오', local: '로컬' }[p.provider || 'email'] || p.provider}</dd><dt>등급</dt><dd><span className={`pill ${p.plan === 'free' ? 'p-gray' : 'p-ok'}`}>{PLAN[p.plan]}</span>{me.isAdmin && <span className="pill p-dark" style={{ marginLeft: 6 }}>관리자</span>}</dd><dt>작품</dt><dd>{works}개</dd><dt>가입</dt><dd>{me.mode === 'local' ? '—' : new Date(p.created_at).toLocaleDateString('ko-KR')}</dd></dl>
            <AccountClient part="profile" name={p.name || ''} proNotify={p.pro_notify} reset={!!sp.reset} local={me.mode !== 'cloud'} />
          </div>
          <div className="card">
            <h2>AI 사용량</h2>
            <div className="mini"><span>글 AI · 이번 달</span><b className="r">{q.text.used} / {q.text.limit}회</b></div>{bar(q.text.used, q.text.limit)}
            <div className="mini"><span>AI 이미지 · {q.image.period === 'total' ? '가입 선물' : '이번 달'}</span><b className="r">{q.image.used} / {q.image.limit}장</b></div>{bar(q.image.used, q.image.limit)}
            <p className="note">글 AI는 매달 1일에 다시 채워져요.{q.image.period === 'total' ? ' 무료 이미지는 가입 선물이라 다시 채워지지 않아요.' : ''}</p>
            {me.isAdmin && <p className="note">관리자 계정은 한도 없이 써요.</p>}
          </div>
        </div>
        <div className="card">
          <div className="hd"><h2>문의</h2><span className="note">{mailReady() ? '답변은 여기와 이메일로 알려 드려요' : '답변은 이 화면에서 확인할 수 있어요'}</span></div>
          <AccountClient part="inquiry" local={me.mode !== 'cloud'} />
          {inquiries.length > 0 && (
            <div className="qlist">{inquiries.map((x) => (
              <div key={x.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--line2)' }}>
                <div className="t" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className={`pill ${x.status === 'answered' ? 'p-ok' : 'p-warn'}`}>{x.status === 'answered' ? '답변 완료' : x.status === 'closed' ? '닫힘' : '확인 중'}</span><b>{x.subject}</b><small style={{ marginLeft: 'auto', color: 'var(--mute)' }}>{new Date(x.created_at).toLocaleDateString('ko-KR')}</small></div>
                {x.answer && <div className="qans" style={{ marginTop: 8 }}>{x.answer}</div>}
              </div>
            ))}</div>
          )}
        </div>
        <p className="note"><Link href="/">처음으로</Link></p>
      </div>
    </div>
  );
}
