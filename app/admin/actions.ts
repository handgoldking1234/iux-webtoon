'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { adminReady } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendMail } from '@/lib/mail';
import { env } from '@/lib/env';

/** 회원 등급 · 권한 · 상태 · 추가 이미지 · 메모 */
export async function updateMember(fd: FormData) {
  const me = await requireAdmin();
  if (!adminReady()) return;
  const id = String(fd.get('id'));
  const patch: Record<string, unknown> = {};
  const plan = String(fd.get('plan') || ''), role = String(fd.get('role') || ''), status = String(fd.get('status') || '');
  if (['free', 'pro', 'edu'].includes(plan)) patch.plan = plan;
  if (['user', 'admin'].includes(role) && id !== me.profile.id) patch.role = role; // 자기 권한은 못 내려요
  if (['active', 'suspended'].includes(status) && id !== me.profile.id) patch.status = status;
  const bonus = Number(fd.get('bonus_images'));
  if (Number.isFinite(bonus)) patch.bonus_images = Math.max(0, Math.min(10000, Math.round(bonus)));
  patch.memo = String(fd.get('memo') || '').slice(0, 2000) || null;
  await supabaseAdmin().from('profiles').update(patch).eq('id', id);
  revalidatePath(`/admin/members/${id}`);
  revalidatePath('/admin/members');
}

/** 문의 답변 */
export async function answerInquiry(fd: FormData) {
  await requireAdmin();
  if (!adminReady()) return;
  const id = Number(fd.get('id')), answer = String(fd.get('answer') || '').trim(), close = fd.get('close') === '1';
  const patch = close ? { status: 'closed' } : { answer, status: 'answered', answered_at: new Date().toISOString() };
  if (!close && !answer) return;
  const { data: q } = await supabaseAdmin().from('inquiries').update(patch).eq('id', id).select('email,subject').maybeSingle();
  if (!close && q?.email) await sendMail(q.email, `[웹툰보드] 문의에 답변드려요 · ${q.subject}`, `${answer}\n\n내 계정에서도 볼 수 있어요: ${env.siteUrl}/account`);
  revalidatePath('/admin/inquiries');
}

/** 지운 작품 되살리기 */
export async function restoreProject(fd: FormData) {
  await requireAdmin();
  if (!adminReady()) return;
  await supabaseAdmin().from('projects').update({ deleted_at: null }).eq('id', String(fd.get('id')));
  revalidatePath('/admin/projects');
}

/* ───────── 설정 · 공지 */
import { saveSettings } from '@/lib/settings';
import { upsertNotice, deleteNotice } from '@/lib/notices';

const int = (v: FormDataEntryValue | null, min = 0, max = 1e9) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : undefined; };

export async function saveSettingsAction(fd: FormData) {
  const me = await requireAdmin();
  const text = fd.get('text') === 'openai' ? 'openai' : 'claude', image = fd.get('image') === 'openai' ? 'openai' : 'gemini';
  const L = { freeText: int(fd.get('freeText')), freeImage: int(fd.get('freeImage')), proText: int(fd.get('proText')), proImage: int(fd.get('proImage')) };
  const C = { text: int(fd.get('costText')), image: int(fd.get('costImage')), imagePro: int(fd.get('costImagePro')) };
  await saveSettings({
    engines: { text, image },
    limits: Object.fromEntries(Object.entries(L).filter(([, v]) => v !== undefined)) as never,
    cost: Object.fromEntries(Object.entries(C).filter(([, v]) => v !== undefined)) as never,
    budgetKrw: int(fd.get('budgetKrw'), 0, 1e10),
    budgetStop: fd.get('budgetStop') === 'on',
  }, me.profile.id);
  revalidatePath('/admin', 'layout');
}

export async function saveNoticeAction(fd: FormData) {
  await requireAdmin();
  const title = String(fd.get('title') || '').trim();
  if (!title) return;
  const lv = String(fd.get('level'));
  await upsertNotice({
    id: fd.get('id') ? Number(fd.get('id')) : undefined, title,
    body: String(fd.get('body') || '').trim() || null,
    level: (['info', 'warn', 'event'].includes(lv) ? lv : 'info') as 'info',
    active: fd.get('active') === 'on',
    starts_at: fd.get('starts_at') ? new Date(String(fd.get('starts_at'))).toISOString() : null,
    ends_at: fd.get('ends_at') ? new Date(String(fd.get('ends_at'))).toISOString() : null,
    link: String(fd.get('link') || '').trim() || null,
  });
  revalidatePath('/admin/notices');
}

export async function deleteNoticeAction(fd: FormData) {
  await requireAdmin();
  await deleteNotice(Number(fd.get('id')));
  revalidatePath('/admin/notices');
}
