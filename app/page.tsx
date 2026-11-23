import Link from 'next/link';
import './legal.css';
import './landing.css';
import { getMe } from '@/lib/auth';
import { dbReady } from '@/lib/env';
import { Logo } from '@/components';
import { activeNotices } from '@/lib/notices';

export const dynamic = 'force-dynamic';

// Lucide 아이콘 (선 굵기 2)
const P: Record<string, string> = {
  pen: 'M12 20h9|M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  grid: 'M3 3h7v7H3z|M14 3h7v7h-7z|M14 14h7v7h-7z|M3 14h7v7H3z',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z|M22 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75',
  cloud: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z',
  spark: 'M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z',
  files: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z|M14 2v4a2 2 0 0 0 2 2h4|M10 13H8|M16 17H8',
  alert: 'M21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3|M12 9v4|M12 17h.01',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 6v6l4 2',
  layers: 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z|M2 12l8.58 3.91a2 2 0 0 0 1.66 0L21 12|M2 17l8.58 3.91a2 2 0 0 0 1.66 0L21 17',
  bubble: 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
  arrow: 'M5 12h14|M12 5l7 7-7 7',
};
function I({ n, s = 20 }: { n: string; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n].split('|').map((d, i) => <path key={i} d={d} />)}</svg>;
}

const FEATS = [
  { n: 'pen', en: 'IDEA & PLANNING', t: '작품 기획', d: '이야기만 있어도 충분해요. 로그라인부터 인물 설정, 관계도, 회차별 줄거리까지 AI와 함께 작품의 세계관을 만들어 보세요.' },
  { n: 'grid', en: 'AI STORYBOARD', t: 'AI 콘티 제작', d: '시나리오를 입력하면 AI가 콘티와 컷별 이미지 프롬프트, 대사를 제안해요. 마음에 들지 않는 부분은 직접 수정하고 자유롭게 완성하세요.' },
  { n: 'users', en: 'CHARACTER & BACKGROUND', t: '캐릭터 & 배경 관리', d: '나만의 캐릭터와 배경을 시트로 관리하세요. 여러 컷에서도 인물의 얼굴과 분위기를 일관되게 유지할 수 있어요.' },
  { n: 'cloud', en: 'CLOUD WORKSPACE', t: '클라우드 저장', d: '작업 중인 작품과 이미지를 안전하게 저장하고, 로그인한 기기 어디서든 이어서 작업하세요.' },
];

export default async function Home() {
  const [me, notices] = await Promise.all([getMe(), activeNotices()]);
  const start = me ? '/studio' : '/login?mode=signup';
  const startLbl = me ? '작업실 열기' : '무료로 시작하기';
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-w">
          <Link href="/" className="lp-logo"><i><Logo /></i><b>웹툰보드</b></Link>
          <nav>
            <a href="#why">왜 웹툰보드</a>
            <a href="#feat">기능</a>
            <a href="#who">창작자</a>
            <a href="#how">만드는 순서</a>
          </nav>
          <span className="sp" />
          {me ? (
            <>
              {me.isAdmin && <Link className="lp-txt" href="/admin">관리자</Link>}
              {me.mode === 'cloud' && <Link className="lp-txt" href="/account">내 계정</Link>}
              <a className="lp-pill" href="/studio">작업실 열기</a>
            </>
          ) : (
            <>
              <Link className="lp-txt" href="/login">로그인</Link>
              <Link className="lp-pill" href="/login?mode=signup">무료로 시작</Link>
            </>
          )}
        </div>
      </header>

      {(notices.length > 0 || !dbReady()) && (
        <div className="lp-w lp-notes">
          {notices.map((n) => <div key={n.id} className={`msg ${n.level === 'warn' ? 'bad' : n.level === 'event' ? 'ok' : 'info'}`}><b>{n.title}</b>{n.body ? ` · ${n.body}` : ''}{n.link && /^https?:\/\//.test(n.link) && <> · <a href={n.link} target="_blank" rel="noopener">자세히</a></>}</div>)}
          {!dbReady() && <div className="msg info">DB 연동 전 · 로컬 시연 모드예요. 로그인 없이 작업실을 열 수 있고, 작품은 이 브라우저에만 저장돼요.</div>}
        </div>
      )}

      {/* 1. 첫 화면 */}
      <section className="lp-hero lp-w">
        <h1>Story +<br />Webtoon</h1>
        <h2>상상한 이야기를,<br />나만의 웹툰으로</h2>
        <p>웹툰 제작이 처음이라도 괜찮아요.<br />기획부터 콘티, 캐릭터, 그림, 말풍선까지 AI가 도와드려요.<br />AI로 빠르게 만들고, 직접 그리고 자유롭게 편집하세요.</p>
        <div className="lp-cta">
          <a className="lp-btn pri" href={start}>{startLbl}</a>
          <a className="lp-btn out" href="#feat">기능 둘러보기</a>
        </div>
        <dl className="lp-stats">
          <div><dt>가입하면 바로</dt><dd>20<em>장</em></dd><small>AI 이미지 무료</small></div>
          <div><dt>매달 새로</dt><dd>30<em>회</em></dd><small>글 AI 무료</small></div>
          <div><dt>한 화를 완성하는</dt><dd>5<em>단계</em></dd><small>기획 · 콘티 · 캐릭터 · 그림 · 말풍선</small></div>
          <div><dt>시작 비용</dt><dd>0<em>원</em></dd><small>설치 없이 웹에서</small></div>
        </dl>
      </section>

      {/* 2. 해시태그 */}
      <section className="lp-tags lp-w" aria-label="웹툰보드 키워드">
        {['#작품기획', '#AI콘티', '#캐릭터시트', '#AI이미지', '#말풍선', '#클라우드저장', '#초보환영', '#직접편집'].map((t) => <span key={t}>{t}</span>)}
      </section>

      {/* 3. 비교 */}
      <section className="lp-sec gray" id="why">
        <div className="lp-w">
          <h3 className="lp-h">웹툰 한 화, 아직도 프로그램 여러 개를 오가나요?</h3>
          <div className="lp-vs">
            <div className="col">
              <div className="head">기존 방식</div>
              <div className="row"><i><I n="files" s={16} /></i>기획은 문서, 콘티는 따로, 그림은 또 다른 프로그램</div>
              <div className="row"><i><I n="alert" s={16} /></i>컷마다 달라지는 인물 얼굴</div>
              <div className="row"><i><I n="clock" s={16} /></i>빈 화면 앞에서 길어지는 고민</div>
            </div>
            <div className="col on">
              <div className="head">웹툰보드</div>
              <div className="row"><i><I n="layers" s={16} /></i>기획부터 말풍선까지 한곳에서</div>
              <div className="row"><i><I n="users" s={16} /></i>캐릭터 시트로 얼굴과 분위기 그대로</div>
              <div className="row"><i><I n="spark" s={16} /></i>막히는 칸은 AI가 먼저 채워 줘요</div>
            </div>
          </div>
          <div className="lp-center"><a className="lp-btn pri sm" href={start}>{startLbl}</a></div>
        </div>
      </section>

      {/* 4. 기능 */}
      <section className="lp-sec" id="feat">
        <div className="lp-w">
          <h3 className="lp-eh">OUR FEATURES</h3>
          <p className="lp-sub">한 화를 완성하는 데 필요한 것만<br />한곳에 모았어요</p>
          <div className="lp-feat">
            {FEATS.map((f, i) => (
              <article key={f.t}>
                <span className="no">0{i + 1}</span>
                <div className="art"><span><I n={f.n} s={34} /></span></div>
                <em>{f.en}</em>
                <b>{f.t}</b>
                <p>{f.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 5. 초보 · 전문 */}
      <section className="lp-sec gray" id="who">
        <div className="lp-w">
          <h3 className="lp-eh">FOR CREATORS</h3>
          <p className="lp-sub">초보자부터 전문 창작자까지,<br />나만의 방식으로 완성하세요</p>
          <div className="lp-who">
            <article>
              <div className="art"><span><I n="spark" s={40} /></span></div>
              <span className="tag">초보 창작자</span>
              <small>웹툰 제작이 처음이라면</small>
              <b>AI와 함께</b>
              <p>막막한 기획부터 콘티와 그림까지. AI의 도움으로 아이디어를 웹툰으로 만들어 보세요.</p>
            </article>
            <article className="pro">
              <div className="art"><span><I n="pen" s={40} /></span></div>
              <span className="tag">전문 창작자</span>
              <small>나만의 작업 방식이 있다면</small>
              <b>자유롭게 직접</b>
              <p>AI는 필요한 순간에만 활용하고, 컷 구성부터 그림과 대사까지 원하는 대로 편집하세요.</p>
            </article>
          </div>
        </div>
      </section>

      {/* 6. 만드는 순서 */}
      <section className="lp-sec dark" id="how">
        <div className="lp-w">
          <div className="lp-howtop">
            <div>
              <em>STEP BY STEP</em>
              <h3>웹툰 한 화가 완성되는 과정</h3>
              <p>이야기를 적으면 콘티와 그림, 말풍선까지 차례로 이어져요. 어느 단계든 직접 고칠 수 있어요.</p>
            </div>
            <a className="lp-ghost" href={start}>지금 만들어 보기 <I n="arrow" s={14} /></a>
          </div>
          <div className="lp-steps">
            <div><b>01</b><strong>기획 (이야기 적기)</strong><span>로그라인 · 인물 · 줄거리를 적으면 빈칸은 AI가 채워요.</span></div>
            <div><b>02</b><strong>콘티 (컷 나누기)</strong><span>장면을 컷으로 나누고 컷마다 그림 설명과 대사를 붙여요.</span></div>
            <div><b>03</b><strong>그림 · 말풍선 (완성)</strong><span>컷에 그림을 넣고 말풍선을 얹어 한 화로 내보내요.</span></div>
          </div>
          <div className="lp-hl">
            <div><b>20장</b><span>가입하면 AI 이미지를 무료로 만들어 볼 수 있어요</span></div>
            <div><b>30회</b><span>글 AI(기획 · 콘티)는 매달 새로 채워져요</span></div>
          </div>
        </div>
      </section>

      {/* 7. 마지막 권유 */}
      <section className="lp-sec lp-last">
        <div className="lp-w">
          <h3>머릿속 이야기를 오늘 첫 화로</h3>
          <p>가입은 카카오 · 네이버 · Google로 바로 끝나요.</p>
          <a className="lp-btn pri" href={start}>{startLbl}</a>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-w">
          <Link href="/" className="lp-logo"><i><Logo /></i><b>웹툰보드</b></Link>
          <nav><a href="#why">왜 웹툰보드</a><a href="#feat">기능</a><a href="#who">창작자</a><a href="#how">만드는 순서</a><a href={start}>{startLbl}</a></nav>
          <div className="info">문의 <a href="mailto:handgoldking@gmail.com">handgoldking@gmail.com</a></div>
          <div className="bottom">
            <span><Link href="/terms">이용약관</Link><Link href="/privacy"><b>개인정보처리방침</b></Link></span>
            <span>© 2026 웹툰보드 · webtoon.iux.kr</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
