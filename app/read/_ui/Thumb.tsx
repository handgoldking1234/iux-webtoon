import type { SV } from '@/lib/read/view';
import Art from './Art';

/** 썸네일 — 실제 그림이 있으면 그림, 예시 작품이면 그려요 */
export default function Thumb({ s, w, h, alt, noTitle }: { s: Pick<SV, 'id' | 'title' | 'thumb' | 'art'>; w: number; h: number; alt?: string; noTitle?: boolean }) {
  if (s.thumb) return <img src={s.thumb} alt={alt ?? ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />;
  if (s.art) return <Art art={s.art} seed={s.id + w + 'x' + h} w={w} h={h} title={noTitle ? undefined : s.title} alt={alt} />;
  return <div style={{ width: '100%', height: '100%', background: 'var(--line)' }} />;
}
