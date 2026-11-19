'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { DAY_KEYS } from '@/lib/read/config';
import { adminHideComment, adminSetReport, adminSetSeries } from '@/lib/read/store';

/** 관리자 › 연재관 — 요일연재 심사 · 숨김 · 신고 처리 */
async function seriesAct(fd: FormData, act: string) {
  await requireAdmin();
  const id = String(fd.get('id'));
  if (act === 'approve') {
    const days = fd.getAll('days').map(String).filter((d) => (DAY_KEYS as string[]).includes(d));
    if (!days.length) return; // 요일을 하나 이상 골라야 요일연재 목록에 보여요
    await adminSetSeries(id, { kind: 'daily', review: 'approved', review_note: null, days });
  }
  else if (act === 'reject') await adminSetSeries(id, { review: 'rejected', review_note: String(fd.get('note') || '').slice(0, 300) || null });
  else if (act === 'hide') await adminSetSeries(id, { hidden: true });
  else if (act === 'show') await adminSetSeries(id, { hidden: false });
  else if (act === 'free') await adminSetSeries(id, { kind: 'free' });
  revalidatePath('/admin/read');
}
async function reportAct(fd: FormData, act: string) {
  await requireAdmin();
  const id = Number(fd.get('id')), type = String(fd.get('type')), target = String(fd.get('target'));
  if (act === 'hide') {
    if (type === 'comment') await adminHideComment(Number(target));
    else if (type === 'series') await adminSetSeries(target, { hidden: true });
    await adminSetReport(id, 'done');
  } else if (act === 'dismiss') await adminSetReport(id, 'dismissed');
  else if (act === 'done') await adminSetReport(id, 'done');
  revalidatePath('/admin/read');
}

/* 버튼마다 따로 — 폼 하나에 버튼이 여럿이라 (React 폼 액션은 누른 버튼 값을 안 넘겨요) */
export async function seriesApprove(fd: FormData) { await seriesAct(fd, 'approve'); }
export async function seriesReject(fd: FormData) { await seriesAct(fd, 'reject'); }
export async function seriesHide(fd: FormData) { await seriesAct(fd, 'hide'); }
export async function seriesShow(fd: FormData) { await seriesAct(fd, 'show'); }
export async function reportHide(fd: FormData) { await reportAct(fd, 'hide'); }
export async function reportDone(fd: FormData) { await reportAct(fd, 'done'); }
export async function reportDismiss(fd: FormData) { await reportAct(fd, 'dismiss'); }
