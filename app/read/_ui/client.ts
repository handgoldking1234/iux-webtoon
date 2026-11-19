'use client';
import { readHref } from '@/lib/read/config';

/** 연재관 화면에서 쓰는 작은 도우미 */
export function toast(t: string) {
  const host = document.querySelector('.rd') || document.body;
  const d = document.createElement('div');
  d.className = 'r-toast'; d.setAttribute('role', 'status'); d.textContent = t;
  host.appendChild(d); setTimeout(() => d.remove(), 2400);
}
export async function call<T = Record<string, unknown>>(path: string, body?: unknown, method = 'POST'): Promise<T | null> {
  const r = await fetch(readHref('api/' + path), { method, headers: body !== undefined ? { 'content-type': 'application/json' } : {}, body: body !== undefined ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  if (r.status === 401) {
    toast('로그인하면 쓸 수 있어요 · 로그인 화면으로 갈게요');
    setTimeout(() => { location.href = `/login?next=${encodeURIComponent(location.pathname)}`; }, 900);
    return null;
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { toast((j as { message?: string }).message || '잠시 뒤 다시 해 주세요'); return null; }
  return j as T;
}
