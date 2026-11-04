import 'server-only';
import { AwsClient } from 'aws4fetch';
import { env } from '@/lib/env';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * 작품 · 그림 파일 저장소 — 브라우저가 서명 주소로 바로 올리고 받아요.
 * R2_* 환경 변수가 있으면 Cloudflare R2(무료 10GB · 다운로드 무료), 없으면 Supabase Storage 'studio' 버킷.
 * 경로는 항상 {회원 id}/… 로 시작하고, 서버가 본인 경로만 서명해 줘요.
 */
export const r2Ready = () => !!(env.r2.accountId && env.r2.accessKey && env.r2.secret && env.r2.bucket);

let aws: AwsClient | null = null;
const r2 = () => (aws ||= new AwsClient({ accessKeyId: env.r2.accessKey, secretAccessKey: env.r2.secret, service: 's3', region: 'auto' }));
const r2Url = (path: string) => `https://${env.r2.accountId}.r2.cloudflarestorage.com/${env.r2.bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;

async function r2Sign(path: string, method: 'GET' | 'PUT', ttl: number) {
  const u = new URL(r2Url(path));
  u.searchParams.set('X-Amz-Expires', String(ttl));
  const signed = await r2().sign(new Request(u, { method }), { aws: { signQuery: true } });
  return signed.url;
}

export async function signUpload(path: string): Promise<string> {
  if (r2Ready()) return r2Sign(path, 'PUT', 600);
  const sb = await supabaseServer();
  const { data, error } = await sb.storage.from('studio').createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error(error?.message || 'storage');
  return data.signedUrl;
}

export async function signDownload(path: string, ttl = 60): Promise<string | null> {
  if (r2Ready()) return r2Sign(path, 'GET', ttl);
  const sb = await supabaseServer();
  const { data } = await sb.storage.from('studio').createSignedUrl(path, ttl);
  return data?.signedUrl || null;
}
