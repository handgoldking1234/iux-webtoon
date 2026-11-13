/** 연재관 설정 — 주소 · 요일 · 장르 · 연령 */
export const READ_BASE = '/read';
export const readHref = (p = '') => READ_BASE + (p ? '/' + p.replace(/^\/+/, '') : '');

export const DAYS = [['mon', '월'], ['tue', '화'], ['wed', '수'], ['thu', '목'], ['fri', '금'], ['sat', '토'], ['sun', '일']] as const;
export type Day = (typeof DAYS)[number][0];
export const DAY_KEYS = DAYS.map((d) => d[0]) as Day[];
export const dayLabel = (d: string) => DAYS.find((x) => x[0] === d)?.[1] || d;
/** 한국 시간 기준 오늘 요일 */
export function todayKey(now = new Date()): Day {
  const k = new Date(now.getTime() + 9 * 3600e3).getUTCDay();
  return (['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as Day[])[k];
}

export const GENRES = ['드라마', '로맨스', '판타지', '액션', '스릴러', '미스터리', '일상', '개그', '스포츠', '기타'];
export const AGES = [['all', '전체'], ['12', '12세'], ['15', '15세'], ['19', '19세']] as const;
export type Age = (typeof AGES)[number][0];
export const ageLabel = (a: string) => (a === 'all' ? '전체 이용가' : `${a}세 이용가`);

/** 주소에서 쓰는 고정 경로 — 작품 id로 쓸 수 없어요 */
export const RESERVED = new Set(['api', 'daily', 'free', 'rank', 'publish', 'policy', 'my', 'search']);
/** 그림 규격 */
export const CUT_WIDTH = 690;
export const MAX_CUTS = 120;
export const MAX_EP_BYTES = 50 * 1024 * 1024;
