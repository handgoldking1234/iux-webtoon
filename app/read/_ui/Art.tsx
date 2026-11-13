'use client';
import { useEffect, useRef } from 'react';
import type { Art as ArtT } from '@/lib/read/types';

/** 예시 작품 그림 — DB 연동 전, 실제 그림이 없을 때 팔레트 · 무늬로 그려요 */
function rnd(seed: string) { let s = 0; for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
type G = CanvasRenderingContext2D;
function motif(g: G, a: ArtT, W: number, H: number, r: () => number) {
  const [p0, p1, c] = a.pal; g.save();
  if (a.motif === 'rain') { g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = W / 240; for (let i = 0; i < 60; i++) { const x = r() * W * 1.3, y = r() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x - W * 0.06, y + H * 0.22); g.stroke(); } g.fillStyle = c; g.beginPath(); g.arc(W * 0.32, H * 0.62, W * 0.13, 0, 7); g.fill(); }
  else if (a.motif === 'moon') { g.fillStyle = c; g.beginPath(); g.arc(W * 0.7, H * 0.28, W * 0.16, 0, 7); g.fill(); g.fillStyle = p0; g.beginPath(); g.arc(W * 0.77, H * 0.24, W * 0.15, 0, 7); g.fill(); }
  else if (a.motif === 'stars') { g.fillStyle = c; for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H * 0.7, s = r() * W * 0.012 + 1; g.fillRect(x, y, s, s); } g.globalAlpha = 0.85; g.beginPath(); g.arc(W * 0.5, H * 0.42, W * 0.2, 0, 7); g.fill(); }
  else if (a.motif === 'grid') { g.strokeStyle = p1; g.globalAlpha = 0.55; g.lineWidth = W / 220; const n = 9; for (let i = 1; i < n; i++) { g.beginPath(); g.moveTo((W * i) / n, 0); g.lineTo((W * i) / n, H); g.stroke(); g.beginPath(); g.moveTo(0, (H * i) / n); g.lineTo(W, (H * i) / n); g.stroke(); } g.globalAlpha = 1; g.fillStyle = c; g.beginPath(); g.arc((W * 4) / 9, (H * 4) / 9, W * 0.06, 0, 7); g.fill(); }
  else if (a.motif === 'dots') { for (let i = 0; i < 26; i++) { g.fillStyle = [p1, c][i % 2]; g.globalAlpha = 0.75; g.beginPath(); g.arc(r() * W, r() * H, r() * W * 0.07 + W * 0.02, 0, 7); g.fill(); } }
  else if (a.motif === 'waves') { g.strokeStyle = c; g.lineWidth = W / 60; g.globalAlpha = 0.8; for (let q = 0; q < 6; q++) { g.beginPath(); for (let x = 0; x <= W; x += W / 40) { const y = H * (0.35 + q * 0.1) + Math.sin((x / W) * 12 + q) * H * 0.02; if (x) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); } }
  else if (a.motif === 'rings') { g.strokeStyle = c; g.lineWidth = W / 70; for (let q = 1; q < 6; q++) { g.globalAlpha = 1 - q * 0.15; g.beginPath(); g.arc(W * 0.5, H * 0.42, W * 0.07 * q, 0, 7); g.stroke(); } }
  else if (a.motif === 'cross') { g.fillStyle = c; g.fillRect(W * 0.44, H * 0.22, W * 0.12, W * 0.36); g.fillRect(W * 0.32, H * 0.22 + W * 0.12, W * 0.36, W * 0.12); }
  else { g.strokeStyle = c; g.lineWidth = W / 80; for (let q = 0; q < 7; q++) { g.globalAlpha = 0.3 + q * 0.1; g.beginPath(); g.moveTo(0, H * (0.2 + q * 0.08)); g.lineTo(W, H * (0.1 + q * 0.08)); g.stroke(); } }
  g.restore();
}
function figure(g: G, x: number, y: number, s: number) { g.fillStyle = 'rgba(10,12,11,.84)'; g.beginPath(); g.arc(x, y - s * 1.25, s * 0.42, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - s * 0.62, y + s * 0.9); g.quadraticCurveTo(x - s * 0.6, y - s * 0.7, x, y - s * 0.72); g.quadraticCurveTo(x + s * 0.6, y - s * 0.7, x + s * 0.62, y + s * 0.9); g.closePath(); g.fill(); }

export default function Art({ art, seed, w, h, title, people = 1, alt }: { art: ArtT; seed: string; w: number; h: number; title?: string; people?: number; alt?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const draw = () => {
      const g = cv.getContext('2d')!, r = rnd(seed);
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, art.pal[0]); gr.addColorStop(1, art.pal[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      motif(g, art, w, h, r);
      for (let p = 0; p < people; p++) { const x = people === 1 ? w * (0.3 + r() * 0.4) : w * (0.3 + p * 0.4); figure(g, x, h * (title ? 0.86 : 0.8 + r() * 0.05), Math.min(w, h) * (title ? 0.17 : 0.14)); }
      if (title) {
        const sh = g.createLinearGradient(0, h * 0.55, 0, h); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.6)'); g.fillStyle = sh; g.fillRect(0, h * 0.55, w, h * 0.45);
        g.fillStyle = '#fff'; g.textAlign = 'center'; const fs = w * (title.length > 6 ? 0.12 : 0.17); g.font = `${fs}px "Black Han Sans","Apple SD Gothic Neo",sans-serif`;
        const half = Math.ceil(title.length / 2), words = title.length > 7 ? [title.slice(0, half).trim(), title.slice(half).trim()] : [title];
        words.forEach((t, i) => g.fillText(t, w / 2, h * 0.93 - (words.length - 1 - i) * fs * 1.1));
      }
    };
    draw();
    document.fonts?.ready.then(draw).catch(() => {});
  }, [art, seed, w, h, title, people]);
  return <canvas ref={ref} width={w} height={h} role="img" aria-label={alt || title || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}
