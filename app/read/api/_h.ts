import { NextResponse } from 'next/server';
import { apiMe, err, isRes } from '@/lib/api';
import type { Me } from '@/lib/auth';

/** 연재관 API 공통 — 로그인 확인 · JSON 읽기 · 오류 문구 */
export async function withMe(fn: (me: Me) => Promise<NextResponse>) {
  const me = await apiMe();
  if (isRes(me)) return me;
  try { return await fn(me); } catch (e) { return fail(e); }
}
export async function body<T>(req: Request): Promise<T> { try { return (await req.json()) as T; } catch { return {} as T; } }
const MSG: Record<string, [string, number]> = {
  not_found: ['찾을 수 없어요', 404], draft_not_found: ['연재할 회차를 찾을 수 없어요 · 편집기에서 다시 눌러 주세요', 404], draft_used: ['이미 올린 회차예요', 409],
  draft_not_ready: ['그림이 아직 다 올라가지 않았어요', 409], series_not_found: ['이어서 올릴 작품을 찾을 수 없어요', 404], series_required: ['작품 정보를 채워 주세요', 400], bad_cuts: ['컷이 없거나 너무 많아요', 400],
};
export function fail(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  const hit = MSG[m];
  if (hit) return err(m, hit[0], hit[1]);
  console.error('[read api]', e);
  return err('server', '잠시 뒤 다시 해 주세요', 500);
}
export { err };
export const ok = (j: unknown) => NextResponse.json(j);
