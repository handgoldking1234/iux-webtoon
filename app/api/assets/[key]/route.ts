import { NextResponse } from 'next/server';
import { apiMe, err, isRes, safeKey } from '@/lib/api';
import { signDownload } from '@/lib/storage';

/** 그림 받기 — 서명 주소(10분) */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const { key } = await params;
  if (!safeKey(key) || me.mode !== 'cloud') return err('not_found', '그림을 찾을 수 없어요', 404);
  const url = await signDownload(`${me.profile.id}/assets/${key}`, 600);
  if (!url) return err('not_found', '그림을 찾을 수 없어요', 404);
  return NextResponse.json({ url });
}
