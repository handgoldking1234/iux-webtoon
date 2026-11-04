import 'server-only';
import { adminReady } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/server';

export type Notice = { id: number; title: string; body: string | null; level: 'info' | 'warn' | 'event'; active: boolean; starts_at: string | null; ends_at: string | null; link: string | null; created_at: string };

/** DB 연동 전: 서버가 켜져 있는 동안만 */
let local: Notice[] = [];
let seq = 1;

export async function listNotices(): Promise<Notice[]> {
  if (!adminReady()) return local.slice().sort((a, b) => b.id - a.id);
  const { data } = await supabaseAdmin().from('notices').select('*').order('created_at', { ascending: false }).limit(100);
  return (data || []) as Notice[];
}

/** 지금 보여 줄 공지 (작업실 · 첫 화면) */
export async function activeNotices() {
  const now = Date.now();
  return (await listNotices().catch(() => []))
    .filter((n) => n.active && (!n.starts_at || Date.parse(n.starts_at) <= now) && (!n.ends_at || Date.parse(n.ends_at) > now))
    .slice(0, 3)
    .map(({ id, title, body, level, link }) => ({ id, title, body, level, link }));
}

export async function upsertNotice(n: Partial<Notice> & { title: string }) {
  const row = { title: n.title.slice(0, 120), body: n.body?.slice(0, 1000) || null, level: n.level || 'info', active: n.active ?? true, starts_at: n.starts_at || null, ends_at: n.ends_at || null, link: n.link || null };
  if (!adminReady()) {
    if (n.id) local = local.map((x) => (x.id === n.id ? { ...x, ...row } : x));
    else local.push({ id: seq++, created_at: new Date().toISOString(), ...row } as Notice);
    return;
  }
  const sb = supabaseAdmin();
  if (n.id) await sb.from('notices').update(row).eq('id', n.id);
  else await sb.from('notices').insert(row);
}

export async function deleteNotice(id: number) {
  if (!adminReady()) { local = local.filter((x) => x.id !== id); return; }
  await supabaseAdmin().from('notices').delete().eq('id', id);
}
