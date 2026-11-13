import type { Art, Comment, Draft, Episode, Report, Series } from './types';

/**
 * DB 연동 전(로컬 시연 모드)에 쓰는 예시 연재관 — 서버가 켜져 있는 동안만 기억해요.
 * 그림은 없고, 화면에서 팔레트 · 무늬로 그려요(art · demoLines).
 */
type Mem = { series: Series[]; episodes: Episode[]; comments: Comment[]; follows: Set<string>; ratings: Map<string, number>; likes: Set<string>; reports: Report[]; drafts: Draft[]; images: Map<string, { type: string; data: Buffer }>; seq: number };

const W: [string, string, string, string, string[], number, number, Art, string, ('all' | '12' | '15' | '19'), boolean, 'daily' | 'free' | 'done'][] = [
  // id, 제목, 필명, 장르, 요일, 평균별점(×100), 회차수, 그림, 소개, 연령, AI, 종류
  ['hyeonsang', '현상', '손금왕', '스릴러', ['mon'], 986, 12, { pal: ['#141c2b', '#2b3a55', '#c0392b'], motif: 'rain' }, '1944년 경성. 혼을 보는 견습 사진사 해원이 사라진 스승을 찾아 나선다. 스승을 가둔 유리건판은 하나씩 깨져 가고, 마지막 한 장마저 깨지면 경성의 혼이 모두 풀려난다.', '15', true, 'daily'],
  ['conv', '밤의 한강 편의점', '유린', '일상', ['tue', 'fri'], 971, 48, { pal: ['#0f2a3a', '#1f6f8b', '#ffd166'], motif: 'moon' }, '새벽 두 시에만 찾아오는 손님들. 알바생 지호는 오늘도 라면 물을 맞춘다.', 'all', false, 'daily'],
  ['er', '새벽 응급실 3년차', '김온', '드라마', ['wed'], 964, 31, { pal: ['#e9f1f2', '#6fb3b8', '#e5484d'], motif: 'cross' }, '3년차 응급의학과 전공의의 열두 시간. 오늘 밤도 무사히 넘길 수 있을까.', '15', false, 'daily'],
  ['mungu', '문구점 마왕', '파란볼펜', '판타지', ['thu'], 952, 67, { pal: ['#2a1b3d', '#7b2cbf', '#f9c74f'], motif: 'stars' }, '세계 정복에 실패한 마왕이 초등학교 앞 문구점을 차렸다.', 'all', false, 'daily'],
  ['baduk', '바둑부 막내', '흑돌', '스포츠', ['fri'], 948, 22, { pal: ['#f2ead8', '#3a3a3a', '#c8a96a'], motif: 'grid' }, '폐부 직전 바둑부에 들어온 신입. 첫 대회까지 남은 시간은 한 달.', 'all', false, 'daily'],
  ['funeral', '화사한 장례식', '오늘도맑음', '개그', ['sat'], 977, 39, { pal: ['#fff4e6', '#ff8fab', '#3d405b'], motif: 'dots' }, '장례지도사 3명이 운영하는, 세상에서 가장 시끄러운 장례식장.', '12', false, 'daily'],
  ['lab', '연구실 로맨스는 없다', '석사과정', '로맨스', ['sun'], 958, 54, { pal: ['#fde2e4', '#e5989b', '#6d6875'], motif: 'waves' }, '실험은 실패해도 연애는 안 한다. 그런데 옆자리 박사과정이 자꾸 신경 쓰인다.', 'all', false, 'daily'],
  ['barrier', '결계 아파트 304호', '도깨비불', '액션', ['mon', 'thu'], 941, 76, { pal: ['#10151f', '#3a86ff', '#8338ec'], motif: 'rings' }, '월세 20만 원짜리 집에는 이유가 있었다. 이 아파트는 도시의 결계였다.', '15', false, 'daily'],
  ['palace', '첫 출근은 용궁으로', '물방울', '판타지', ['wed', 'sat'], 969, 41, { pal: ['#023e8a', '#00b4d8', '#caf0f8'], motif: 'waves' }, '공채 합격 문자를 받고 간 곳은 바닷속 용궁 인사팀이었다.', 'all', false, 'daily'],
  ['bakery', '달곰 동네 빵집', '곰손', '일상', ['tue'], 933, 18, { pal: ['#fff1d6', '#d4a373', '#6b4226'], motif: 'dots' }, '골목 끝 빵집의 하루. 오늘의 빵은 손님 사연으로 정해진다.', 'all', false, 'daily'],
  ['train0', '마지막 기차는 0시', '철길', '미스터리', [], 981, 60, { pal: ['#1b1b1e', '#5f0f40', '#fb8b24'], motif: 'lines' }, '자정에만 서는 기차역. 내리는 사람은 있어도 타는 사람은 없다.', '15', false, 'done'],
  ['catpres', '우리 반 반장은 고양이', '냥펀치', '개그', [], 974, 88, { pal: ['#f8edeb', '#f9844a', '#577590'], motif: 'dots' }, '반장 선거에서 고양이가 당선됐다. 공약은 낮잠 시간 확보.', 'all', false, 'done'],
  ['rooftop', '옥탑방 작업실', '새벽두시', '일상', [], 912, 7, { pal: ['#e9edc9', '#a3b18a', '#344e41'], motif: 'lines' }, '웹툰 지망생 셋이 사는 옥탑방 이야기.', 'all', false, 'free'],
  ['nolevel', '레벨업 안 되는 용사', '만렙꿈나무', '판타지', [], 897, 12, { pal: ['#22223b', '#4a4e69', '#f2e9e4'], motif: 'stars' }, '경험치가 쌓이지 않는 저주에 걸린 용사의 무지성 모험.', '12', true, 'free'],
  ['spring3', '고3 봄날 일기', '벚꽃엔딩', '로맨스', [], 925, 4, { pal: ['#ffe5ec', '#ffb3c6', '#fb6f92'], motif: 'dots' }, '수능 D-200, 짝꿍이 바뀌었다.', 'all', false, 'free'],
  ['zombie', '좀비 아파트 관리소', '관리소장', '액션', [], 903, 15, { pal: ['#132a13', '#4f772d', '#ecf39e'], motif: 'grid' }, '세상이 망해도 관리비는 걷어야 한다.', '15', true, 'free'],
  ['magical', '편의점 마법소녀', '삼각김밥', '개그', [], 888, 9, { pal: ['#ffd6ff', '#c8b6ff', '#b8c0ff'], motif: 'stars' }, '변신 아이템은 1+1 행사 상품.', 'all', false, 'free'],
];

const EP_TITLES: Record<string, string[]> = { hyeonsang: ['붉은 등 아래', '유리건판의 얼굴', '본정 사진관', '두 번째 혼', '총독부 사진반', '깨진 건판', '서린', '암실의 규칙', '명월의 노트', '마지막 현상', '빛을 들이다', '현상'] };
const LINES_H1: [string, string][][] = [
  [['nar', '1944년 가을, 경성 본정. 등화관제로 불빛 하나 허락되지 않던 밤.']],
  [['say', '선생님…? 계세요?']],
  [['say', '암실 문이… 열려 있어.'], ['say', '붉은 등이 켜져 있다.']],
  [['sh', '누구야!']],
  [['say', '…선생님 얼굴이 왜 여기에.']],
  [['nar', '유리건판 속 얼굴이, 해원을 향해 천천히 눈을 떴다.']],
  [['say', '해원아. 그 판을 깨뜨리지 마라.']],
];
const LINES_GEN: [string, string][][] = [[['nar', '그날도 평소와 다르지 않은 하루였다.']], [['say', '오늘은 좀 이상한데?']], [['say', '…방금 그거 봤어?']], [['sh', '잠깐만!']], [['say', '설마, 아니겠지.']], [['nar', '하지만 그 설마가 시작이었다.']]];
const HEIGHTS = [560, 720, 620, 860, 640, 760, 600];

function build(): Mem {
  const now = Date.now(), day = 86400e3;
  const series: Series[] = [], episodes: Episode[] = [], comments: Comment[] = [];
  let epId = 1, cId = 1;
  W.forEach(([id, title, author, genre, days, r, n, art, desc, age, ai, kind], i) => {
    const isFree = kind === 'free';
    const last = now - ((i * 37) % 6) * day - (isFree ? i * 3600e3 : 0);
    const rc = 1000 + ((i * 731) % 4000);
    series.push({ id, author_id: id === 'hyeonsang' ? 'local' : 'demo-' + id, author_name: author, title, description: desc, genre, age, ai, kind, days, review: kind === 'daily' ? 'approved' : 'none', hidden: false, thumb_path: null, episodes: n, follows: 200 + ((i * 977) % 9000), views: 5000 + ((i * 7919) % 90000), rating_sum: Math.round((r / 100) * rc), rating_count: rc, last_episode_at: new Date(last).toISOString(), created_at: new Date(last - n * 7 * day).toISOString(), art });
    for (let no = 1; no <= n; no++) {
      const lines = id === 'hyeonsang' && no === 1 ? LINES_H1 : LINES_GEN;
      const er = r / 100 - ((no * 37) % 17) / 100, ec = 800 + ((no * 131) % 2200);
      episodes.push({ id: epId, series_id: id, no, title: EP_TITLES[id]?.[no - 1] || `${no}화`, author_note: id === 'hyeonsang' && no === 1 ? '첫 화 읽어 주셔서 고마워요. 매주 월요일에 다음 건판을 현상할게요.' : '오늘도 봐 주셔서 고마워요!', cuts: lines.map((_, k) => ({ path: `demo:${id}:${no}:${k}`, w: 690, h: HEIGHTS[k % HEIGHTS.length] })), thumb_path: null, ai, status: 'public', publish_at: new Date(last - (n - no) * 7 * day).toISOString(), views: 1000 + no * 37, rating_sum: Math.round(Math.min(9.99, er) * ec), rating_count: ec, comments: 3, created_at: new Date(last - (n - no) * 7 * day).toISOString(), demoLines: lines });
      if (no === 1 || no === n) {
        const base = [['암실지기', '연출 미쳤다… 마지막 컷 소름', 1284], ['경성러버', '다음 화만 기다림', 842], ['지나가던독자', '설정 신선하네요', 96]] as const;
        base.forEach(([nick, body, likes], k) => comments.push({ id: cId++, episode_id: epId, user_id: 'demo-u' + k, nickname: nick, body, likes, hidden: false, created_at: new Date(now - (k + 1) * 6 * 3600e3).toISOString() }));
      }
      epId++;
    }
  });
  return { series, episodes, comments, follows: new Set(['hyeonsang:local']), ratings: new Map(), likes: new Set(), reports: [{ id: 1, target_type: 'comment', target_id: '2', user_id: 'demo-u9', reason: '스포일러', status: 'open', created_at: new Date(now - 3600e3).toISOString() }], drafts: [], images: new Map(), seq: 100 };
}

const g = globalThis as unknown as { __wbReadDemo?: Mem };
export const demo = (): Mem => (g.__wbReadDemo ||= build());
