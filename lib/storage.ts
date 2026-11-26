import 'server-only';
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
const r2 = () => (aws ||= new AwsClient({ accessKeyId: env.r2.accessKey, secretAccessKey: env.r2.secret, service: 's3', region: 'auto' }));
const r2Url = (path: string, bucket = env.r2.bucket) => `https://${env.r2.accountId}.r2.cloudflarestorage.com/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;

async function r2Sign(path: string, method: 'GET' | 'PUT', ttl: number, bucket?: string) {
  const u = new URL(r2Url(path, bucket));
  u.searchParams.set('X-Amz-Expires', String(ttl));
  const signed = await r2().sign(new Request(u, { method }), { aws: { signQuery: true } });
  return signed.url;
}

export async function signUpload(path: string): Promise<string> {
  if (r2Ready()) return r2Sign(path, 'PUT', 600);
  const sb = await supabaseServer();
  const { data, error } = await sb.storage.from(env.bucket).createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error(error?.message || 'storage');
  return data.signedUrl;
}

export async function signDownload(path: string, ttl = 60): Promise<string | null> {
  if (r2Ready()) return r2Sign(path, 'GET', ttl);
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
