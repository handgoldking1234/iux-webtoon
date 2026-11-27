import 'server-only';
import { createHash } from 'node:crypto';
import { AwsClient } from 'aws4fetch';
import { env } from '@/lib/env';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';

/**
 * 작품 · 그림 파일 저장소 — 브라우저가 서명 주소로 바로 올리고 받아요.
 * R2_* 환경 변수가 있으면 Cloudflare R2(무료 10GB · 다운로드 무료), 없으면 Supabase Storage 버킷(env.bucket, 기본 'webtoon').
 * 경로는 항상 {회원 id}/… 로 시작하고, 서버가 본인 경로만 서명해 줘요.
 */
export const r2Ready = () => !!(env.r2.accountId && env.r2.accessKey && env.r2.secret && env.r2.bucket);

let aws: AwsClient | null = null;
// Secret Access Key(64자리)를 넣어도, 일반 API 토큰 값을 넣어도 돼요 — 토큰 값이면 SHA-256으로 바꾼 것이 비밀 키예요 (Cloudflare R2 규칙)
const r2Secret = () => { const v = env.r2.secret.trim(); return /^[0-9a-f]{64}$/i.test(v) || !v ? v : createHash('sha256').update(v).digest('hex'); };
const r2 = () => (aws ||= new AwsClient({ accessKeyId: env.r2.accessKey.trim(), secretAccessKey: r2Secret(), service: 's3', region: 'auto' }));
const r2Url = (path: string, bucket = env.r2.bucket) => `https://${env.r2.accountId}.r2.cloudflarestorage.com/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;

async function r2Sign(path: string, method: 'GET' | 'PUT', ttl: number, bucket?: string) {
  const u = new URL(r2Url(path, bucket));
  u.searchParams.set('X-Amz-Expires', String(ttl));
  const signed = await r2().sign(new Request(u, { method }), { aws: { signQuery: true } });
  return signed.url;
}

/** R2에 파일이 있는지 */
export async function r2Has(path: string): Promise<boolean> {
  try { const r = await r2().fetch(r2Url(path), { method: 'HEAD' }); return r.ok; } catch { return false; }
}

/** 관리자용: Supabase 저장소 → R2로 한 묶음 옮기기. done이 true가 될 때까지 next를 넘겨 다시 불러요 */
export async function moveToR2(next: string[] | null, max = 40): Promise<{ moved: number; skipped: number; failed: string[]; next: string[]; done: boolean }> {
  if (!r2Ready()) throw new Error('R2가 아직 연결되지 않았어요');
  const sb = supabaseAdmin().storage.from(env.bucket);
  // next = 아직 살펴볼 폴더 · 파일 목록 (처음엔 맨 위 폴더부터)
  let queue = next ?? [''];
  const failed: string[] = [];
  let moved = 0, skipped = 0, steps = 0;
  while (queue.length && moved + skipped < max && steps < 200) {
    steps++;
    const item = queue.shift()!;
    if (item.endsWith('/') || item === '') {
      const { data } = await sb.list(item.replace(/\/$/, ''), { limit: 1000 });
      for (const o of data || []) queue.push(o.id ? `${item}${o.name}` : `${item}${o.name}/`);
      continue;
    }
    try {
      if (await r2Has(item)) { skipped++; continue; }
      const { data: blob, error } = await sb.download(item);
      if (error || !blob) throw new Error(error?.message || 'download');
      const r = await r2().fetch(r2Url(item), { method: 'PUT', body: await blob.arrayBuffer(), headers: { 'content-type': blob.type || 'application/octet-stream' } });
      if (!r.ok) throw new Error('put ' + r.status);
      moved++;
    } catch { failed.push(item); }
  }
  return { moved, skipped, failed, next: queue, done: queue.length === 0 };
}

export async function signUpload(path: string): Promise<string> {
  if (r2Ready()) return r2Sign(path, 'PUT', 600);
  const sb = await supabaseServer();
  const { data, error } = await sb.storage.from(env.bucket).createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error(error?.message || 'storage');
  return data.signedUrl;
}

export async function signDownload(path: string, ttl = 60): Promise<string | null> {
  // R2로 옮기는 중에도 끊기지 않게: R2에 없으면 예전 Supabase 저장소에서 받아요
  if (r2Ready() && (await r2Has(path))) return r2Sign(path, 'GET', ttl);
  const sb = await supabaseServer();
  const { data } = await sb.storage.from(env.bucket).createSignedUrl(path, ttl);
  return data?.signedUrl || null;
}

/* ───────── 연재 그림 (공개) — 연재관 모듈이 써요 */
export const r2ReadReady = () => r2Ready() && !!env.r2.readBucket && !!env.r2.publicUrl;

/** 연재 그림 올릴 서명 주소 — 경로는 {회원 id}/{초안 id}/{n}.jpg */
export async function signReadUpload(path: string): Promise<string> {
  if (r2ReadReady()) return r2Sign(path, 'PUT', 900, env.r2.readBucket);
  const { data, error } = await supabaseAdmin().storage.from(env.readBucket).createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error(error?.message || 'storage');
  return data.signedUrl;
}

/** 연재 그림 공개 주소 */
export function readPublicUrl(path: string): string {
  if (r2ReadReady()) return `${env.r2.publicUrl}/${path.split('/').map(encodeURIComponent).join('/')}`;
  return `${env.supabaseUrl}/storage/v1/object/public/${env.readBucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
