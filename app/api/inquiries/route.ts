import { NextResponse } from 'next/server';
import { apiMe, err, isRes } from '@/lib/api';
import { supabaseServer } from '@/lib/supabase/server';
import { sendMail } from '@/lib/mail';
import { env } from '@/lib/env';

export async function POST(req: Request) {
  const me = await apiMe();
  if (isRes(me)) return me;
  const b = await req.json().catch(() => ({}));
  const subject = String(b.subject || '').trim().slice(0, 120), body = String(b.body || '').trim().slice(0, 4000);
  if (!subject || !body) return err('bad_request', '제목과 내용을 적어 주세요');
  if (me.mode !== 'cloud') return NextResponse.json({ ok: true, local: true });
  const sb = await supabaseServer();
  const { error } = await sb.from('inquiries').insert({ user_id: me.profile.id, email: me.profile.email, subject, body });
  if (error) return err('db', error.message, 500);
  await sendMail(env.adminEmails, `[웹툰보드 문의] ${subject}`, `${me.profile.name || ''} <${me.profile.email}>\n\n${body}\n\n답변: ${env.siteUrl}/admin/inquiries`);
  return NextResponse.json({ ok: true });
}
