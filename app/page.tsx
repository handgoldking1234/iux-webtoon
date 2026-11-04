import Link from 'next/link';
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
        <h1>웹툰 한 화, 기획부터 말풍선까지</h1>
        <p>로그라인 · 인물 · 회차 시놉시스를 적으면 AI가 콘티(S#) · 컷별 이미지 프롬프트 · 말풍선을 만들어요. 캐릭터 시트로 얼굴을 맞추고, 컷에 그림과 대사를 한 번에 넣어 내보내요.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <a className="btn pri lg" href={me ? '/studio' : '/login?mode=signup'}>{me ? '작업실 열기' : '무료로 시작'}</a>
        </div>
        <div className="feat">
          <div><b>작품 기획</b><small>로그라인 · 인물 · 관계도 · 줄거리 · 화풍을 한 팝업에서. 빈칸은 AI가 채워요.</small></div>
          <div><b>콘티 · AI</b><small>회차마다 콘티 · 이미지 프롬프트 · 말풍선을 만들고, 원고에 컷으로 바로 넣어요.</small></div>
          <div><b>캐릭터 시트</b><small>인물 · 배경 시트를 만들어 컷마다 얼굴과 장소가 흔들리지 않게.</small></div>
          <div><b>클라우드 저장</b><small>로그인하면 작품과 그림이 계정에 저장돼 다른 기기에서도 이어서 작업해요.</small></div>
        </div>
      </div>
    </div>
  );
}
