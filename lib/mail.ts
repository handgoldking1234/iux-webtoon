import 'server-only';
import { env } from '@/lib/env';

export const mailReady = () => !!(env.resendKey && env.mailFrom);

/** 메일 보내기 (Resend) — 키가 없으면 조용히 건너뛰어요 */
export async function sendMail(to: string | string[], subject: string, text: string) {
  if (!mailReady() || !to || (Array.isArray(to) && !to.length)) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.resendKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.mailFrom, to, subject, text }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
