import { NextResponse } from 'next/server';
import { dbReady } from '@/lib/env';
import { supabaseServer } from '@/lib/supabase/server';

async function out(req: Request) {
  if (dbReady()) await (await supabaseServer()).auth.signOut();
  return NextResponse.redirect(new URL('/', req.url), { status: 303 });
}
export const GET = out;
export const POST = out;
