export const won = (n: number) => '₩' + Math.round(n).toLocaleString('ko-KR');
export const num = (n: number) => Math.round(n).toLocaleString('ko-KR');
export const ago = (s: string | null) => {
  if (!s) return '—';
  const m = (Date.now() - Date.parse(s)) / 6e4;
  if (m < 1) return '방금';
  if (m < 60) return `${Math.floor(m)}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  if (m < 43200) return `${Math.floor(m / 1440)}일 전`;
  return new Date(s).toLocaleDateString('ko-KR');
};
export const date = (s: string | null) => (s ? new Date(s).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '—');
export const PLAN: Record<string, string> = { free: '무료', pro: '프로', edu: '교육' };
export const PROVIDER: Record<string, string> = { email: '이메일', google: 'Google', kakao: '카카오', local: '로컬' };
export const bytes = (b: number) => (b > 1048576 ? (b / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB');
