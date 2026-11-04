'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { adminReady } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/server';

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
  await supabaseAdmin().from('inquiries').update(patch).eq('id', id);
  revalidatePath('/admin/inquiries');
}

/** 지운 작품 되살리기 */
export async function restoreProject(fd: FormData) {
  await requireAdmin();
  if (!adminReady()) return;
  await supabaseAdmin().from('projects').update({ deleted_at: null }).eq('id', String(fd.get('id')));
  revalidatePath('/admin/projects');
}
