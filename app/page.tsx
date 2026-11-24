import Link from 'next/link';
import './legal.css';
import './landing.css';
import { getMe } from '@/lib/auth';
import { dbReady } from '@/lib/env';
import { Logo } from '@/components';
import { activeNotices } from '@/lib/notices';
import LandingFx from './LandingFx';
import type { Metadata } from 'next';
import { SITE_DESC, SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = { alternates: { canonical: '/' } };

// 검색 결과에 서비스 정보가 잘 나오도록 알려 주는 구조화 데이터
const LD = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', name: SITE_NAME, alternateName: ['바로 웹툰', 'BaroWebtoon'], url: SITE_URL, inLanguage: 'ko-KR' },
    { '@type': 'WebApplication', name: SITE_NAME, url: SITE_URL, applicationCategory: 'DesignApplication', operatingSystem: 'Web', inLanguage: 'ko-KR', description: SITE_DESC, offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' } },
    { '@type': 'Organization', name: 'IUX', url: 'https://iux.kr', email: 'handgoldking@gmail.com' },
  ],
};

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
  arrow: 'M5 12h14|M12 5l7 7-7 7',
  left: 'M15 18l-6-6 6-6',
  arrow2: 'M9 18l6-6-6-6',
  check: 'M20 6 9 17l-5-5',
  smile: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M8 14s1.5 2 4 2 4-2 4-2|M9 9h.01|M15 9h.01',
  zap: 'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z',
  heart: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
  wand: 'M15 4V2|M15 16v-2|M8 9h2|M20 9h2|M17.8 11.8 19 13|M15 9h.01|M17.8 6.2 19 5|M3 21l9-9|M12.2 6.2 11 5',
  coffee: 'M10 2v2|M14 2v2|M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1|M6 2v2',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z|M12 18h.01',
  book: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z|M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
  plus: 'M12 5v14|M5 12h14',
  imgin: 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7|M16 5h6|M19 2v6|M21 15l-5-5L5 21',
  layout: 'M3 3h18v18H3z|M3 9h18|M9 21V9',
  sliders: 'M4 21v-7|M4 10V3|M12 21v-9|M12 8V3|M20 21v-5|M20 12V3|M1 14h6|M9 8h6|M17 16h6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M7 10l5 5 5-5|M12 15V3',
};
function I({ n, s = 20 }: { n: string; s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n].split('|').map((d, i) => <path key={i} d={d} />)}</svg>;
}

// 컷 미리보기 띠 (그림 대신 색면 + 말풍선)
// 첫 화면 그림 위에 차례로 떠오르는 말풍선 (x · y는 % 위치, m = 휴대폰에서도 보임, tr = 꼬리가 오른쪽)
const HERO_TALK: { k: 'say' | 'nar' | 'oval'; s: string; x: number; y: number; mx?: number; tr?: boolean; m?: boolean }[] = [
  { k: 'oval', s: '어떻게 시작하지…', x: 68, y: -12, mx: 50, m: true },
  { k: 'say', s: '그림과 말풍선은 따로예요!', x: 35, y: 8, mx: 13, m: true },
  { k: 'say', s: '대사만 고치면 AI 비용 0원', x: 3, y: 9, tr: true },
  { k: 'say', s: '마음에 안 드는 컷만 다시 그려요', x: 70, y: 48, mx: 46, tr: true, m: true },
  { k: 'say', s: '기획부터 말풍선까지 한곳에서', x: 36, y: 66, tr: true },
  { k: 'nar', s: '상상한 이야기를, 바로 웹툰으로.', x: 3, y: 86, m: true },
];

// 편집기의 기본 말풍선 모양: 동그란 몸통 + 뾰족한 꼬리 (왼쪽 아래를 가리킴)
function OvalBubble() {
  const tail = 'M58 78 Q40 98 18 112 Q52 104 84 86 Z';
  return (
    <svg viewBox="0 0 220 120" preserveAspectRatio="none" aria-hidden="true">
      <g stroke="#111" strokeWidth="5" strokeLinejoin="round" fill="none"><path d={tail} /><ellipse cx="116" cy="52" rx="100" ry="46" /></g>
      <g fill="#fff"><path d={tail} /><ellipse cx="116" cy="52" rx="100" ry="46" /></g>
    </svg>
  );
}

// 바로웹툰을 쓰는 이유 (옆으로 넘기는 카드)
const VALS: { img?: string; ic?: string; t: string; en: string; alt?: string; p: string; href?: string; go?: string }[] = [
  { img: 'val-mine', t: '나만의 웹툰', en: 'MY OWN WEBTOON', alt: '등불 아래에서 자기 이야기를 읽는 인물', p: 'AI에 전부 맡기지 않아요. AI는 초안을 돕고, 이야기 · 연출 · 대사의 마지막 결정은 내가 해요. 그래서 끝까지 내 웹툰이에요.' },
  { ic: 'imgin', t: '어떤 AI 이미지든 가져오기', en: 'BRING ANY IMAGE', p: '나노바나나 · GPT 이미지 · 미드저니 등 다른 도구에서 만든 그림이나 직접 그린 그림을 불러와 컷에 바로 넣어요.' },
  { img: 'val-consist', t: '일관성', en: 'CONSISTENCY', alt: '여러 컷에서 같은 얼굴로 이어지는 주인공', p: '캐릭터 시트와 그림체 설정을 모든 컷에 함께 넘겨요. 1화의 주인공이 10화에서도 같은 얼굴로 나와요.' },
  { ic: 'layout', t: '레이아웃 · 말풍선 · 글꼴', en: 'LAYOUT & LETTERING', p: '칸을 나눈 레이아웃 컷, 여러 모양의 말풍선과 글꼴로 대사와 효과음까지 작품 분위기에 맞게 꾸며요.' },
  { img: 'val-speed', t: '속도', en: 'SPEED', alt: '태블릿 주위로 컷들이 빠르게 떠오르는 작업 모습', p: '버튼 한 번이면 콘티 초안이 나오고, 바로 다음 컷으로 넘어가요. 남는 시간은 이야기 다듬기에 쓰세요.' },
  { ic: 'sliders', t: '보정부터 AI 수정까지', en: 'ADJUST & RETOUCH', p: '가져온 그림은 밝기 · 색을 보정하고, 바꾸고 싶은 점을 적으면 AI가 그 컷만 고쳐 그려요.' },
  { ic: 'phone', t: '휴대폰에서도 작업', en: 'ANYWHERE', p: '휴대폰 브라우저로 그대로 열려요. 이동 중에 대사를 고치고, 집에서 PC로 이어서 다듬으세요.' },
  { ic: 'download', t: '완성본 바로 내보내기', en: 'EXPORT', p: '세로로 긴 그림 한 장이나 컷별 묶음(ZIP)으로 내려받아 원하는 곳에 바로 올려요.' },
  { ic: 'book', t: '연재관에 올리기', en: 'PUBLISH', p: '완성한 회차를 「연재하기」 한 번으로 연재관에 올려 다른 사람과 함께 볼 수 있어요.', href: '/read', go: '연재관 둘러보기' },
];

// 기능 아래 '그리고 이것도' 카드

// 자주 묻는 질문
const FAQ = [
  ['그림을 못 그려도 만들 수 있나요?', '네. 이야기만 적으면 AI가 콘티와 그림을 함께 만들어요. 직접 그린 그림이나 사진을 불러와 컷에 넣고 말풍선만 얹을 수도 있어요.'],
  ['무료로 어디까지 쓸 수 있나요?', '가입하면 AI 이미지 20장을 무료로 만들 수 있고, 글 AI(기획 · 콘티)는 매달 30회가 새로 채워져요. 대사 고치기 · 말풍선 편집 · 직접 올린 그림 쓰기는 AI를 쓰지 않아서 횟수와 상관없어요.'],
  ['내가 만든 웹툰은 누구 것인가요?', '만든 작품의 권리는 만든 사람에게 있어요. 다만 AI로 만든 그림의 권리와 쓸 수 있는 범위는 법과 각 AI 업체의 정책에 따라 달라질 수 있어요. 자세한 내용은 이용약관을 봐 주세요.'],
  ['작품은 어디에 저장되나요?', '쓰는 기기의 브라우저에 먼저 저장돼요. 로그인하면 바뀐 작품이 내 계정 저장소에도 올라가서 다른 기기에서 이어서 작업할 수 있어요. 로그인하지 않으면 브라우저에만 있어서 방문 기록을 지우면 사라질 수 있어요.'],
  ['휴대폰에서도 되나요?', '네. 휴대폰 브라우저에서 기획 · 콘티 · 대사 고치기까지 할 수 있어요. 컷을 세밀하게 다듬는 작업은 화면이 넓은 PC가 더 편해요.'],
];

const CUTS = [
  ['s1', '비 오는 밤 아파트 옥상 난간 앞에 선 주인공'],
  ['s2', '네온 빛 고층 빌딩 꼭대기에 웅크린 주인공'],
  ['s3', '오래된 사진관 문 앞에 들이닥친 사람들'],
  ['cut3', '편의점 앞에서 이어폰을 나눠 끼운 두 사람'],
  ['s5', '노을 진 바닷가에 나란히 앉은 두 사람'],
  ['s6', '푸른 빛 창을 든 무사와 맞서는 주인공'],
  ['s7', '비 내리는 육교 위에서 마주친 세 사람'],
  ['cut4', '새벽 사무실에서 야근하는 직장인'],
  ['s9', '안개 낀 절벽 길을 오르는 주인공'],
  ['s10', '불타는 도시를 내려다보는 검객'],
  ['s11', '기와 지붕 골목에서 몸을 숨긴 두 사람'],
  ['s12', '붉은 번개 속 사진관 앞에 선 사람들'],
];

// 휴대폰 예시 한 화: 바로웹툰으로 만든 「현상」 1화의 컷 (말풍선 · 나레이션 · 효과음까지 얹은 완성본)
const EP: { n: number; h: number; alt: string }[] = [
  { n: 1, h: 752, alt: '문을 부수고 들어온 조사관이 "한 장 남았군"이라고 말하는 컷' },
  { n: 2, h: 752, alt: '사진관 주인이 "손님을 받기엔 늦은 시간입니다"라고 답하는 컷' },
  { n: 3, h: 752, alt: '조사관의 안경에 사진관 주인이 비친 클로즈업과 나레이션' },
  { n: 4, h: 752, alt: '사진기를 든 주인의 속마음 "마지막 손님은 저입니다"' },
  { n: 5, h: 752, alt: '사진기의 종을 당기며 "어머니, 부탁드립니다"라고 말하는 컷' },
  { n: 6, h: 752, alt: '검은 개가 달려들고 조사관이 "그만둬라!"라고 외치는 컷' },
  { n: 7, h: 752, alt: '섬광 속에 개가 튕겨 나가는 효과음 컷' },
  { n: 8, h: 752, alt: '쓰러진 조사관과 "그러나 그의 혼은 죽지 않았다" 나레이션' },
  { n: 9, h: 626, alt: '붉은 눈의 사내가 "아직 끝나지 않았다"며 웃는 마지막 컷' },
];

const FEATS = [
  { img: 'feat-plan', n: 'pen', en: 'IDEA & PLANNING', t: '작품 기획', d: '이야기만 있어도 충분해요. 로그라인부터 인물 설정, 관계도, 회차별 줄거리까지 AI와 함께 작품의 세계관을 만들어 보세요.' },
  { img: 'feat-conti', n: 'grid', en: 'AI STORYBOARD', t: 'AI 콘티 제작', d: '시나리오를 입력하면 AI가 콘티와 컷별 이미지 프롬프트, 대사를 제안해요. 마음에 들지 않는 부분은 직접 수정하세요.' },
  { img: 'feat-char', n: 'users', en: 'CHARACTER & BACKGROUND', t: '캐릭터 & 배경 관리', d: '나만의 캐릭터와 배경을 시트로 관리하세요. 여러 컷에서도 인물의 얼굴과 분위기를 일관되게 유지할 수 있어요.' },
  { img: 'feat-cloud', n: 'cloud', en: 'CLOUD WORKSPACE', t: '클라우드 저장', d: '작업 중인 작품과 이미지를 안전하게 저장하고, 로그인한 기기 어디서든 이어서 작업하세요.' },
];

const GENRES = ['#로맨스', '#판타지', '#일상툰', '#학원물', '#액션', '#스릴러', '#코미디', '#회귀물', '#힐링', '#직장물', '#SF', '#무협'];
const IDEAS = [
  { img: 'genre-romance', n: 'heart', g: '로맨스', en: 'ROMANCE', line: '매일 같은 버스를 타는 두 사람, 한 사람만 그 사실을 알고 있다.', tags: ['설렘', '오해', '고백'] },
  { img: 'genre-fantasy', n: 'wand', g: '판타지', en: 'FANTASY', line: '마법을 못 쓰는 마법학교 낙제생이 금지된 책을 열어 버린다.', tags: ['성장', '모험', '비밀'] },
  { img: 'genre-daily', n: 'coffee', g: '일상툰', en: 'DAILY', line: '회사 앞 작은 카페 사장님이 손님들의 고민을 한 잔씩 들어 준다.', tags: ['공감', '힐링', '짧은 화'] },
];

export default async function Home() {
  const [me, notices] = await Promise.all([getMe(), activeNotices()]);
  // 로그인 없이도 바로 편집기로 — 편집기 안에서 '저장하려면 로그인' 안내를 보여 줘요
  const start = '/studio';
  const startLbl = me ? '작업실 열기' : '무료로 시작하기';
  return (
    <div className="lp">
      <LandingFx />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ ...LD, '@graph': [...LD['@graph'], { '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] }).replace(/</g, '\\u003c') }} />
      <header className="lp-nav">
        <div className="lp-w">
          <a href="#top" className="lp-logo"><i><Logo /></i><b>바로웹툰</b></a>
          <nav>
            <a href="/studio" title="작품 제작 시작">웹툰 만들기</a>
            <a href={me ? '/studio' : '/login?next=%2Fstudio'} title="작품 및 작업 관리">내 작품</a>
            <a href="#how" title="사용 방법 안내">제작 가이드</a>
            <a href="#price" title="무료 및 유료 플랜">요금제</a>
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
              <a className="lp-pill" href="/studio">무료로 시작하기</a>
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
      <section className="lp-hero lp-w" id="top">
        <h1 data-r>Story +<br />Webtoon</h1>
        <h2 data-r style={{ ['--d' as string]: 1 }}>상상한 이야기를,<br />나만의 웹툰으로</h2>
        <p data-r style={{ ['--d' as string]: 2 }}>웹툰 제작이 처음이라도 괜찮아요. <br />기획부터 콘티, 캐릭터, 그림, 말풍선까지 AI가 도와드려요. <br />AI가 그려도 그림과 말풍선은 따로라서, 대사는 바로 고치고 마음에 안 드는 컷만 다시 그려요.</p>
        <div className="lp-cta" data-r style={{ ['--d' as string]: 3 }}>
          <a className="lp-btn pri" href={start}>{startLbl}</a>
          <a className="lp-btn out" href="#feat">기능 둘러보기</a>
        </div>
        <div className="lp-heroimg" data-r style={{ ['--d' as string]: 4 }}>
          <img src="/lp/hero.webp" alt="상상한 인물들이 화면 밖으로 뛰어나오는 웹툰 작가의 책상" width={1376} height={768} fetchPriority="high" decoding="async" />
          {HERO_TALK.map((b, i) => (
            <span key={i} className={`hb t${i} ${b.k}${b.tr ? ' tr' : ''}${b.m ? '' : ' pc'}`} style={{ ['--x' as string]: `${b.x}%`, ['--y' as string]: `${b.y}%`, ['--mx' as string]: `${b.mx ?? b.x}%`, ['--i' as string]: i }} aria-hidden="true">{b.k === 'oval' ? <><OvalBubble /><b className="q"><span>{b.s}</span></b><b className="a"><span>그래! <em>바로웹툰</em>!</span></b></> : b.s}</span>
          ))}
        </div>
        <dl className="lp-stats" data-r style={{ ['--d' as string]: 5 }}>
          <div><dt>가입하면 바로</dt><dd><span data-count="20">20</span><em>장</em></dd><small>AI 이미지 무료</small></div>
          <div><dt>매달 새로</dt><dd><span data-count="30">30</span><em>회</em></dd><small>글 AI 무료</small></div>
          <div><dt>웹툰 한 편을 완성하는</dt><dd><span data-count="4">4</span><em>단계</em></dd><small>기획부터 말풍선까지</small></div>
          <div><dt>대사 고칠 때 AI 비용</dt><dd><span>0</span><em>원</em></dd><small>그림을 다시 만들지 않아요</small></div>
        </dl>
      </section>

      {/* 2. 컷 미리보기 띠 */}
      <section className="lp-strip" aria-label="컷 예시">
        <div className="track">
          {[...CUTS, ...CUTS].map(([k, alt], i) => (
            <figure key={i} className="cut" aria-hidden={i >= CUTS.length}>
              <img src={`/lp/${k}.webp`} alt={i < CUTS.length ? alt : ''} loading="lazy" decoding="async" width={760} height={424} />
            </figure>
          ))}
        </div>
      </section>

      {/* 2-2. 세로 스크롤 한 화 예시 */}
      <section className="lp-sec lp-show" id="show">
        <div className="lp-w lp-showin">
          <div className="txt" data-r>
            <em>SHOWCASE</em>
            <h3>휴대폰으로 보는 웹툰,<br />이렇게 완성돼요</h3>
            <p>세로로 내려 보는 웹툰 그대로 만들어요. 컷마다 그림을 넣고 대사와 나레이션을 얹으면 한 화가 완성돼요.</p>
            <ul>
              <li><I n="check" s={15} />세로 스크롤 웹툰 비율 그대로</li>
              <li><I n="check" s={15} />나레이션 · 효과음도 글자 레이어로</li>
            </ul>
          </div>
          <div className="phone" data-r style={{ ['--d' as string]: 1 }} aria-label="세로 스크롤 웹툰 예시">
            <div className="scr">
              <div className="roll">
                {[...EP, ...EP].map((c, i) => (
                  <div className="ep" key={i} aria-hidden={i >= EP.length}>
                    <img src={`/lp/ep${c.n}.webp`} alt={i < EP.length ? c.alt : ''} loading="lazy" decoding="async" width={420} height={c.h} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 해시태그 */}
      <section className="lp-tags lp-w" aria-label="바로웹툰 키워드" data-r>
        {['#작품기획', '#AI콘티', '#캐릭터시트', '#AI이미지', '#말풍선따로', '#대사바로수정', '#컷만다시', '#초보환영', '#직접편집'].map((t) => <span key={t}>{t}</span>)}
      </section>

      {/* 4. 핵심 장점: 그림과 말풍선이 따로 */}
      <section className="lp-sec" id="edit">
        <div className="lp-w">
          <header className="lp-head" data-r>
            <em>EDIT FREELY</em>
            <h3>AI 웹툰의 불편함, 바로웹툰이 해결했어요</h3>
            <p>보통 AI 웹툰은 말풍선까지 그림에 붙어서 나와요. 대사 한 줄만 바꾸려 해도 그림을 통째로 다시 만들어야 하고, 그때마다 AI 비용이 또 들어요.<br />바로웹툰은 그림과 말풍선을 따로 다뤄서, 고치고 싶은 것만 고치면 돼요.</p>
          </header>
          <div className="lp-split">
            <div className="lp-layer" data-r aria-hidden="true">
              <div className="ly img"><span className="tag">그림 레이어</span><span className="fig" /><span className="re"><I n="spark" s={13} /> 이 컷만 다시 그리기</span></div>
              <div className="ly txt"><span className="tag">말풍선 레이어</span><span className="bub">오늘도 우산 안 가져왔지<b>?</b><i className="caret" /></span></div>
            </div>
            <div className="lp-pts">
              <article data-r>
                <i><I n="pen" s={20} /></i>
                <div><b>대사는 글자처럼 바로 고쳐요</b><p>말풍선을 눌러 바로 고치면 끝이에요. 그림을 다시 만들지 않으니 AI 비용이 들지 않아요.</p></div>
              </article>
              <article data-r style={{ ['--d' as string]: 1 }}>
                <i><I n="grid" s={20} /></i>
                <div><b>마음에 안 드는 컷만 다시 그려요</b><p>한 화 전체가 아니라 그 컷 하나만 다시 만들어요. 잘 나온 컷과 대사는 그대로 남아요.</p></div>
              </article>
              <article data-r style={{ ['--d' as string]: 2 }}>
                <i><I n="layers" s={20} /></i>
                <div><b>말풍선 모양과 위치도 자유롭게</b><p>말풍선 크기 · 꼬리 방향 · 위치를 직접 옮기고, 같은 그림에 다른 대사를 얹어 볼 수도 있어요.</p></div>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 비교 */}
      <section className="lp-sec gray" id="why">
        <div className="lp-w">
          <header className="lp-head" data-r>
            <em>WHY BAROWEBTOON</em>
            <h3>웹툰 제작, 아직도<br />여러 프로그램을 오가며 작업하시나요?</h3>
            <p>기획 따로, 그림 따로, 대사 따로. 이제 바로웹툰 하나로 모든 과정을 이어서 작업하세요.</p>
          </header>
          <div className="lp-vs" data-r>
            <div className="col">
              <div className="head">기존 방식</div>
              <div className="row"><i><I n="files" s={16} /></i>기획은 문서, 콘티는 따로, 그림은 또 다른 프로그램</div>
              <div className="row"><i><I n="alert" s={16} /></i>컷마다 달라지는 인물 얼굴</div>
              <div className="row"><i><I n="clock" s={16} /></i>빈 화면 앞에서 길어지는 고민</div>
            </div>
            <div className="col on">
              <div className="head">바로웹툰</div>
              <div className="row"><i><I n="layers" s={16} /></i>기획부터 말풍선까지 한곳에서</div>
              <div className="row"><i><I n="users" s={16} /></i>캐릭터 시트로 얼굴과 분위기 그대로</div>
              <div className="row"><i><I n="spark" s={16} /></i>막히는 칸은 AI가 먼저 채워 줘요</div>
            </div>
          </div>
          <div className="lp-cmp" data-r>
            <div><span>일반 AI 웹툰</span><b>대사 1줄 수정</b><em>그림 전체 다시 생성 · AI 비용 또 발생</em></div>
            <div className="on"><span>바로웹툰</span><b>대사 1줄 수정</b><em>말풍선만 바로 고침 · AI 비용 0원</em></div>
          </div>
          <div className="lp-center" data-r><a className="lp-btn pri sm" href="#how">만드는 순서 자세히 보기</a></div>
        </div>
      </section>

      {/* 5. 기능 */}
      <section className="lp-sec" id="feat">
        <div className="lp-w">
          <header className="lp-head" data-r>
            <em>OUR FEATURES</em>
            <h3>웹툰을 완성하는 데 필요한 것만</h3>
            <p>AI는 자유롭게, 웹툰 제작은 한곳에서. 기획부터 완성까지 필요한 작업을 모았고, 다른 AI 도구에서 만든 그림도 가져와 이어서 작업해요.</p>
          </header>
          <div className="lp-feat">
            {FEATS.map((f, i) => (
              <article key={f.t} data-r style={{ ['--d' as string]: i }}>
                <span className="no">0{i + 1}</span>
                <div className="art pic"><img src={`/lp/${f.img}.webp`} alt="" loading="lazy" decoding="async" width={760} height={424} /></div>
                <em>{f.en}</em>
                <b>{f.t}</b>
                <p>{f.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. 가치 */}
      <section className="lp-sec gray" id="value">
        <div className="lp-w">
          <header className="lp-head" data-r>
            <em>OUR VALUE</em>
            <h3>바로웹툰을 쓰는 이유</h3>
            <p>그림 실력보다 이야기가 먼저예요. 나머지는 바로웹툰이 받쳐 줄게요.</p>
          </header>
          <div className="lp-slide" data-slide data-r>
            <div className="lp-val">
              {VALS.map((v, i) => (
                <article key={v.t} aria-roledescription="slide" aria-label={`${i + 1} / ${VALS.length}`}>
                  {v.img
                    ? <div className="art pic"><img src={`/lp/${v.img}.webp`} alt={v.alt} loading="lazy" decoding="async" width={760} height={424} /></div>
                    : <div className="art ico"><span><I n={v.ic!} s={40} /></span></div>}
                  <b>{v.t}</b><em>{v.en}</em>
                  <p>{v.p}</p>
                  {v.href && <a className="go" href={v.href}>{v.go} <I n="arrow" s={14} /></a>}
                </article>
              ))}
            </div>
            <div className="lp-sctl">
              <button type="button" data-prev aria-label="이전"><I n="left" s={18} /></button>
              <span className="dots">{VALS.map((v, i) => <i key={v.t} data-i={i} />)}</span>
              <button type="button" data-next aria-label="다음"><I n="arrow2" s={18} /></button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. 초보 · 전문 */}
      <section className="lp-sec" id="who">
        <div className="lp-w">
          <header className="lp-head" data-r>
            <em>FOR CREATORS</em>
            <h3>웹툰 입문자부터 전문 창작자까지</h3>
            <p>AI에 맡기는 만큼, 직접 그리는 만큼. 작업 방식은 내가 정해요.</p>
          </header>
          <div className="lp-who">
            <article data-r>
              <div className="art pic"><img src="/lp/who-new.webp" alt="비 오는 밤 노트북으로 첫 웹툰을 시작하는 창작자" loading="lazy" decoding="async" width={760} height={424} /></div>
              <span className="tag">초보 창작자</span>
              <small>웹툰 제작이 처음이라면</small>
              <b>AI와 함께</b>
              <p>복잡한 제작 기술 없이 아이디어만으로 시작할 수 있어요. 막막한 기획부터 콘티와 그림까지 AI가 도와요.</p>
              <ul><li><I n="check" s={14} />4 · 8 · 16컷 분량 골라 시작</li><li><I n="check" s={14} />한 번에 한 화 초안 만들기</li></ul>
            </article>
            <article className="pro" data-r style={{ ['--d' as string]: 1 }}>
              <div className="art pic"><img src="/lp/who-pro.webp" alt="태블릿으로 직접 그리는 전문 창작자" loading="lazy" decoding="async" width={760} height={424} /></div>
              <span className="tag">전문 창작자</span>
              <small>나만의 작업 방식이 있다면</small>
              <b>자유롭게 직접</b>
              <p>기획 · 콘티 · 그림 만드는 시간을 줄이고 창작에 집중하세요. AI는 필요한 순간에만 쓰고, 나머지는 원하는 대로 편집해요.</p>
              <ul><li><I n="check" s={14} />캐릭터 시트 · 내 그림 올려서 컷에 넣기</li><li><I n="check" s={14} />말풍선 · 컷 배치 직접 편집</li></ul>
            </article>
          </div>
        </div>
      </section>

      {/* 8. 요금 */}
      <section className="lp-sec gray" id="price">
        <div className="lp-w">
          <header className="lp-head" data-r>
            <em>PRICING</em>
            <h3>부담 없이 시작하고, 자유롭게 만들어 보세요</h3>
            <p>가입만 하면 무료로 바로 써 볼 수 있어요. 더 많이 쓰고 싶은 분을 위한 요금제는 준비 중이에요.</p>
          </header>
          <div className="lp-price">
            <article data-r>
              <em>FREE</em>
              <b>무료</b>
              <small>처음 시작하는 모든 분께</small>
              <div className="amt">0<span>원</span></div>
              <ul>
                <li><I n="check" s={15} />AI 이미지 20장 (가입 시)</li>
                <li><I n="check" s={15} />글 AI 매달 30회</li>
                <li><I n="check" s={15} />작품 기획 · 콘티 · 말풍선 편집</li>
                <li><I n="check" s={15} />클라우드 저장</li>
              </ul>
              <a className="lp-btn pri sm" href={start}>{startLbl}</a>
            </article>
            <article className="pro" data-r style={{ ['--d' as string]: 1 }}>
              <span className="badge">COMING SOON</span>
              <em>PRO</em>
              <b>프로</b>
              <small>연재를 이어 가는 작가님께</small>
              <div className="amt soon">준비 중</div>
              <ul>
                <li><I n="check" s={15} />더 많은 AI 이미지</li>
                <li><I n="check" s={15} />더 많은 글 AI 사용</li>
                <li><I n="check" s={15} />고화질 내보내기</li>
                <li><I n="check" s={15} />새 기능 먼저 써 보기</li>
              </ul>
              <a className="lp-btn out sm" href="mailto:handgoldking@gmail.com?subject=%5B%EB%B0%94%EB%A1%9C%EC%9B%B9%ED%88%B0%5D%20%ED%94%84%EB%A1%9C%20%EC%86%8C%EC%8B%9D%20%EB%B0%9B%EA%B8%B0">소식 받기</a>
            </article>
            <article className="prem" data-r style={{ ['--d' as string]: 2 }}>
              <span className="badge">COMING SOON</span>
              <em>PREMIUM</em>
              <b>프리미엄</b>
              <small>여러 작품을 연재하는 작가 · 스튜디오께</small>
              <div className="amt soon">준비 중</div>
              <ul>
                <li><I n="check" s={15} />프로보다 넉넉한 AI 이미지</li>
                <li><I n="check" s={15} />고해상도 AI 그림 (나노바나나 Pro)</li>
                <li><I n="check" s={15} />여러 작품 · 회차 연재 관리</li>
                <li><I n="check" s={15} />먼저 답하는 1:1 문의</li>
              </ul>
              <a className="lp-btn out sm" href="mailto:handgoldking@gmail.com?subject=%5B%EB%B0%94%EB%A1%9C%EC%9B%B9%ED%88%B0%5D%20%ED%94%84%EB%A6%AC%EB%AF%B8%EC%97%84%20%EC%86%8C%EC%8B%9D%20%EB%B0%9B%EA%B8%B0">소식 받기</a>
            </article>
          </div>
          <p className="lp-extra" data-r>구독 없이 필요한 만큼 쓰는 AI 이미지 충전팩도 준비 중이에요 · 학교 · 학원 · 팀 단체 요금은 <a href="mailto:handgoldking@gmail.com?subject=%5B%EB%B0%94%EB%A1%9C%EC%9B%B9%ED%88%B0%5D%20%EB%8B%A8%EC%B2%B4%20%EC%9A%94%EA%B8%88%20%EB%AC%B8%EC%9D%98">문의하기</a></p>
        </div>
      </section>

      {/* 9. 장르 */}
      <section className="lp-sec" id="genre">
        <div className="lp-w">
          <header className="lp-head" data-r>
            <em>ANY GENRE</em>
            <h3>상상하는 모든 이야기가 웹툰이 돼요</h3>
            <p>로맨스부터 판타지, 액션, 드라마까지. 한 줄 이야기만 적어도 AI가 인물과 줄거리를 펼쳐 줘요.</p>
          </header>
          <div className="lp-chips" data-r>{GENRES.map((g) => <span key={g}>{g}</span>)}</div>
          <div className="lp-ideas">
            {IDEAS.map((d, i) => (
              <article key={d.g} data-r style={{ ['--d' as string]: i }}>
                <div className="art pic"><img src={`/lp/${d.img}.webp`} alt="" loading="lazy" decoding="async" width={760} height={424} /></div>
                <b>{d.g}</b><em>{d.en}</em>
                <p>“{d.line}”</p>
                <div className="tg">{d.tags.map((t) => <span key={t}>{t}</span>)}</div>
              </article>
            ))}
          </div>
          <div className="lp-center" data-r><a className="lp-btn pri sm" href={start}>내 이야기로 시작하기</a></div>
        </div>
      </section>

      {/* 10. 만드는 순서 (어두운 구역) */}
      <section className="lp-sec gray" id="how">
        <div className="lp-w">
          <div className="lp-howtop" data-r>
            <div>
              <em>STEP BY STEP</em>
              <h3>웹툰 한 편이 완성되는 과정</h3>
              <p>이야기를 적으면 콘티와 그림, 말풍선까지 차례로 이어져요. 어느 단계든 직접 고칠 수 있어요.</p>
            </div>
            <a className="lp-ghost" href={start}>지금 만들어 보기 <I n="arrow" s={14} /></a>
          </div>
          <div className="lp-steps">
            <div data-r><b>01</b><strong>작품 기획하기</strong><span>주제와 등장인물, 로그라인과 줄거리를 정해요.</span></div>
            <div data-r style={{ ['--d' as string]: 1 }}><b>02</b><strong>콘티 구성하기</strong><span>이야기를 장면과 컷으로 나누고, 컷마다 그림 설명과 대사를 붙여요.</span></div>
            <div data-r style={{ ['--d' as string]: 2 }}><b>03</b><strong>그림 만들기</strong><span>캐릭터와 장면에 맞는 그림을 만들어요. 마음에 안 드는 컷만 다시 그려요.</span></div>
            <div data-r style={{ ['--d' as string]: 3 }}><b>04</b><strong>웹툰 완성하기</strong><span>대사와 말풍선을 얹어 나만의 웹툰을 완성하고 내보내요.</span></div>
          </div>
        </div>
      </section>

      {/* 자주 묻는 질문 */}
      <section className="lp-sec" id="faq">
        <div className="lp-w lp-faqw">
          <header className="lp-head" data-r>
            <em>FAQ</em>
            <h3>자주 묻는 질문</h3>
          </header>
          <div className="lp-faq" data-r>
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}<i><I n="plus" s={18} /></i></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 11. 마지막 권유 */}
      <section className="lp-last">
        <div className="lp-w" data-r>
          <em>START NOW</em>
          <h3>머릿속 이야기를 오늘 첫 화로</h3>
          <p>아이디어만 있으면 충분해요. 가입은 카카오 · 네이버 · Google로 바로 끝나요.</p>
          <a className="lp-btn inv" href={start}>{startLbl}</a>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-w">
          <div className="top">
            <a href="#top" className="lp-logo"><i><Logo /></i><b>바로웹툰</b></a>
            <nav><a href="#edit">따로 고치기</a><a href="#why">왜 바로웹툰</a><a href="#feat">기능</a><a href="#who">창작자</a><a href="#price">요금</a><a href="#how">만드는 순서</a><a href="#faq">자주 묻는 질문</a></nav>
          </div>
          <div className="info">
            <b>바로웹툰 · AI로 바로 만드는 나만의 웹툰</b>
            <span>문의 <a href="mailto:handgoldking@gmail.com">handgoldking@gmail.com</a></span>
          </div>
          <div className="bottom">
            <span><Link href="/terms">이용약관</Link><Link href="/privacy"><b>개인정보처리방침</b></Link></span>
            <span>© 2026 바로웹툰 · webtoon.iux.kr</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
