import Link from 'next/link';
import './legal.css';
import { getMe } from '@/lib/auth';
import { dbReady } from '@/lib/env';
import { Logo } from '@/components';
import { activeNotices } from '@/lib/notices';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [me, notices] = await Promise.all([getMe(), activeNotices()]);
  return (
    <div className="hero">
      <header>
        <span className="brand" style={{ padding: 0 }}><i><Logo /></i><div><b>웹툰보드</b></div></span>
        <span className="sp" />
        {me ? (
          <>
            {me.isAdmin && <Link className="btn" href="/admin">관리자</Link>}
            {me.mode === 'cloud' && <Link className="btn" href="/account">내 계정</Link>}
            <a className="btn pri" href="/studio">작업실 열기</a>
          </>
        ) : (
          <>
            <Link className="btn" href="/login">로그인</Link>
            <Link className="btn pri" href="/login?mode=signup">무료로 시작</Link>
          </>
        )}
      </header>
      <div className="in">
        {notices.map((n) => <div key={n.id} className={`msg ${n.level === 'warn' ? 'bad' : n.level === 'event' ? 'ok' : 'info'}`}><b>{n.title}</b>{n.body ? ` · ${n.body}` : ''}{n.link && /^https?:\/\//.test(n.link) && <> · <a href={n.link} target="_blank" rel="noopener">자세히</a></>}</div>)}
        {!dbReady() && <div className="msg info">DB 연동 전 · 로컬 시연 모드예요. 로그인 없이 작업실을 열 수 있고, 작품은 이 브라우저에만 저장돼요.</div>}
        <h1>상상한 이야기를, 나만의 웹툰으로</h1>
        <p className="lead">웹툰 제작이 처음이라도 괜찮아요. 기획부터 콘티, 캐릭터, 그림, 말풍선까지 AI가 도와드려요.</p>
        <p>AI로 빠르게 만들고, 직접 그리고 자유롭게 편집하세요. 초보자부터 전문 창작자까지, 나만의 방식으로 웹툰 한 편을 완성할 수 있어요.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <a className="btn pri lg" href={me ? '/studio' : '/login?mode=signup'}>{me ? '작업실 열기' : '무료로 시작하기'}</a>
        </div>
        <div className="feat">
          <div><em>IDEA &amp; PLANNING</em><b>작품 기획</b><small>이야기만 있어도 충분해요. 로그라인부터 인물 설정, 관계도, 회차별 줄거리까지 AI와 함께 작품의 세계관을 만들어 보세요.</small></div>
          <div><em>AI STORYBOARD</em><b>AI 콘티 제작</b><small>시나리오를 입력하면 AI가 콘티와 컷별 이미지 프롬프트, 대사를 제안해요. 마음에 들지 않는 부분은 직접 수정하고 자유롭게 완성하세요.</small></div>
          <div><em>CHARACTER &amp; BACKGROUND</em><b>캐릭터 &amp; 배경 관리</b><small>나만의 캐릭터와 배경을 시트로 관리하세요. 여러 컷에서도 인물의 얼굴과 분위기를 일관되게 유지할 수 있어요.</small></div>
          <div><em>CLOUD WORKSPACE</em><b>클라우드 저장</b><small>작업 중인 작품과 이미지를 안전하게 저장하고, 로그인한 기기 어디서든 이어서 작업하세요.</small></div>
        </div>
        <div className="who">
          <div><span className="tag">초보 창작자</span><small>웹툰 제작이 처음이라면</small><b>AI와 함께</b><p>막막한 기획부터 콘티와 그림까지. AI의 도움으로 아이디어를 웹툰으로 만들어 보세요.</p></div>
          <div className="pro"><span className="tag">전문 창작자</span><small>나만의 작업 방식이 있다면</small><b>자유롭게 직접</b><p>AI는 필요한 순간에만 활용하고, 컷 구성부터 그림과 대사까지 원하는 대로 편집하세요.</p></div>
        </div>
      </div>
      <footer className="sitefoot"><Link href="/terms">이용약관</Link><Link href="/privacy"><b>개인정보처리방침</b></Link><a href="mailto:handgoldking@gmail.com">문의</a></footer>
    </div>
  );
}
