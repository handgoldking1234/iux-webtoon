import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** 시험 계정 — 회원 기능(Supabase)을 붙이기 전에, 정해 둔 아이디 · 비밀번호로만 로그인해서 AI를 써 보는 용도
 *  환경 변수 TEST_ACCOUNTS="아이디:비밀번호,아이디2:비밀번호2" (저장소에는 넣지 않아요)
 *  Supabase 키가 들어가면 이 기능은 꺼지고 진짜 회원 로그인이 대신해요. */
export const TEST_COOKIE = 'wb_test';

export function testAccounts(): Map<string, string> {
  const m = new Map<string, string>();
  for (const part of (process.env.TEST_ACCOUNTS || '').split(',')) {
    const i = part.indexOf(':');
    if (i < 1) continue;
    const id = part.slice(0, i).trim(), pw = part.slice(i + 1).trim();
    if (/^[A-Za-z0-9_.-]{2,30}$/.test(id) && pw.length >= 8) m.set(id, pw);
  }
  return m;
}
export const testReady = () => testAccounts().size > 0;

const key = () => createHash('sha256').update('wb-test:' + (process.env.TEST_ACCOUNTS || '')).digest();
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const sign = (id: string) => createHmac('sha256', key()).update(id).digest('hex');

/** 아이디 · 비밀번호가 맞으면 쿠키 값, 아니면 null */
export function testLogin(id: string, pw: string): string | null {
  const want = testAccounts().get(id);
  if (!want || !same(createHash('sha256').update(pw).digest('hex'), createHash('sha256').update(want).digest('hex'))) return null;
  return `${id}.${sign(id)}`;
}
/** 쿠키 값이 맞으면 아이디 (비밀번호를 바꾸면 예전 쿠키는 저절로 못 쓰게 돼요) */
export function testUser(cookie: string | undefined): string | null {
  if (!cookie) return null;
  const i = cookie.lastIndexOf('.');
  if (i < 1) return null;
  const id = cookie.slice(0, i);
  return testAccounts().has(id) && same(cookie.slice(i + 1), sign(id)) ? id : null;
}
