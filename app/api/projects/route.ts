import { NextResponse } from 'next/server';
import { apiMe, isRes } from '@/lib/api';
import { supabaseServer } from '@/lib/supabase/server';

/** 내 작품 목록 (지운 것 빼고) */
export async function GET() {
  const me = await apiMe();
  if (isRes(me)) return me;
  if (me.mode !== 'cloud') return NextResponse.json({ projects: [] });
  const sb = await supabaseServer();
  const { data, error } = await sb.from('projects').select('id,title,meta,created_at,updated_at').is('deleted_at', null).order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ code: 'db', message: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}
