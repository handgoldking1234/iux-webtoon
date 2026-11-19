import { NextResponse } from 'next/server';
import { dbReady } from '@/lib/env';
import { supabaseServer } from '@/lib/supabase/server';
import { TEST_COOKIE } from '@/lib/test-accounts';

async function out(req: Request) {
  if (dbReady()) await (await supabaseServer()).auth.signOut();
  const res = NextResponse.redirect(new URL('/', req.url), { status: 303 });
  res.cookies.delete(TEST_COOKIE);
  return res;
}
export const GET = out;
export const POST = out;
