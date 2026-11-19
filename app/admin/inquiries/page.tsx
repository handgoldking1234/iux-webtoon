import Link from 'next/link';
import { listInquiries } from '@/lib/admin-data';
import { answerInquiry } from '../actions';
import { ago } from '@/lib/fmt';

export const metadata = { title: '문의' };

export default async function Inquiries({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const st = sp.status ?? 'open';
  const r = await listInquiries(st === 'all' ? undefined : st);
  const tabs: [string, string][] = [['open', '답변 대기'], ['answered', '답변 완료'], ['closed', '닫힘'], ['all', '전체']];
  return (
    <section className="view">
      <header className="ph"><h1>문의</h1><span className="sub">회원이 내 계정 화면에서 보낸 문의</span></header>
      <div className="tabs" role="tablist">{tabs.map(([k, l]) => <Link key={k} href={`/admin/inquiries?status=${k}`}><button type="button" role="tab" aria-selected={st === k}>{l}</button></Link>)}</div>
      {r.rows.length ? r.rows.map((q) => (
        <div className="card" key={q.id}>
          <div className="hd"><span className={`pill ${q.status === 'open' ? 'p-warn' : q.status === 'answered' ? 'p-ok' : 'p-gray'}`}>{q.status === 'open' ? '대기' : q.status === 'answered' ? '답변 완료' : '닫힘'}</span><h2>{q.subject}</h2><span className="r note">{q.email} · {ago(q.created_at)}{q.user_id && <> · <Link href={`/admin/members/${q.user_id}`}>회원 보기</Link></>}</span></div>
          <div className="qbody">{q.body}</div>
          {q.answer && <div className="qans"><b>답변</b> · {ago(q.answered_at)}<br />{q.answer}</div>}
          {q.status !== 'closed' && (
            <form action={answerInquiry} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input type="hidden" name="id" value={q.id} />
              <textarea name="answer" rows={3} placeholder="답변을 적으면 회원의 내 계정 화면에 보여요" defaultValue={q.answer || ''} />
              <div style={{ display: 'flex', gap: 8 }}><button className="btn pri" disabled={r.demo}>{q.answer ? '답변 고치기' : '답변 보내기'}</button><button className="btn" name="close" value="1" disabled={r.demo}>닫기</button>{r.demo && <span className="note" style={{ alignSelf: 'center' }}>DB 연동 후 보낼 수 있어요</span>}</div>
            </form>
          )}
        </div>
      )) : <div className="card"><p className="note">문의가 없어요</p></div>}
    </section>
  );
}
