import { listNotices } from '@/lib/notices';
import { saveNoticeAction, deleteNoticeAction } from '../actions';
import { date } from '@/lib/fmt';

export const metadata = { title: '공지' };

const LV: Record<string, [string, string]> = { info: ['안내', 'p-gray'], warn: ['점검 · 주의', 'p-warn'], event: ['이벤트', 'p-ok'] };
const local = (s: string | null) => (s ? new Date(Date.parse(s) + 9 * 36e5).toISOString().slice(0, 16) : '');

export default async function Notices() {
  const list = await listNotices();
  const Form = ({ n }: { n?: (typeof list)[number] }) => (
    <form action={saveNoticeAction} className="card" style={{ gap: 8 }}>
      {n && <input type="hidden" name="id" value={n.id} />}
      <h2>{n ? '공지 고치기' : '새 공지'}</h2>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 160px', gap: 8 }}>
        <label className="fld">제목<input name="title" required maxLength={120} defaultValue={n?.title} placeholder="예) 11월 10일 새벽 2시 점검" /></label>
        <label className="fld">종류<select name="level" defaultValue={n?.level || 'info'}><option value="info">안내</option><option value="warn">점검 · 주의</option><option value="event">이벤트</option></select></label>
      </div>
      <label className="fld">내용<textarea name="body" rows={2} maxLength={1000} defaultValue={n?.body || ''} /></label>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        <label className="fld">링크 (선택)<input name="link" defaultValue={n?.link || ''} placeholder="https://" /></label>
        <label className="fld">시작 (비우면 바로)<input type="datetime-local" name="starts_at" defaultValue={local(n?.starts_at ?? null)} /></label>
        <label className="fld">끝 (비우면 계속)<input type="datetime-local" name="ends_at" defaultValue={local(n?.ends_at ?? null)} /></label>
      </div>
      <label className="check" style={{ borderBottom: 0 }}><input type="checkbox" name="active" defaultChecked={n ? n.active : true} /><span><b>보이기</b><small>작업실 위쪽 띠와 첫 화면에 보여요 (한 번에 최대 3개)</small></span></label>
      <div style={{ display: 'flex', gap: 8 }}><button className="btn pri">{n ? '저장' : '공지 올리기'}</button></div>
    </form>
  );
  return (
    <section className="view">
      <header className="ph"><h1>공지</h1><span className="sub">점검 · 업데이트 · 이벤트 안내</span></header>
      <Form />
      {list.map((n) => (
        <details key={n.id} className="card">
          <summary style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', listStyle: 'none' }}>
            <span className={`pill ${LV[n.level][1]}`}>{LV[n.level][0]}</span><b style={{ flex: 1 }}>{n.title}</b>
            {n.active ? <span className="pill p-ok">보이는 중</span> : <span className="pill p-gray">숨김</span>}<small className="note">{date(n.created_at)}</small>
          </summary>
          <div style={{ marginTop: 10 }}><Form n={n} /></div>
          <form action={deleteNoticeAction}><input type="hidden" name="id" value={n.id} /><button className="btn sm danger">지우기</button></form>
        </details>
      ))}
      {!list.length && <div className="card"><p className="note">공지가 없어요</p></div>}
    </section>
  );
}
