import { NextResponse } from 'next/server';
import { getMe } from '@/lib/auth';
import { plans } from '@/lib/admin-data';

/** 프로 알림 신청자 CSV (엑셀에서 한글이 깨지지 않게 BOM) */
export async function GET() {
  const me = await getMe();
  if (!me?.isAdmin) return new NextResponse('forbidden', { status: 403 });
  const r = await plans();
  const q = (s: string | null) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿이름,이메일,가입일\n' + r.notify.map((x) => [q(x.name), q(x.email), q(x.created_at.slice(0, 10))].join(',')).join('\n');
  return new NextResponse(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="pro-notify.csv"' } });
}
