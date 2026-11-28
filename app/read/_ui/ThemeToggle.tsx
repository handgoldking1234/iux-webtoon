'use client';
import { useEffect, useState } from 'react';
import { Ic } from './Icons';
import { k } from './k';

/** 밝은 화면 ↔ 어두운 화면 — 오른쪽 아래 단추. 고른 값은 이 브라우저에 기억해요 */
export default function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => { setLight(document.querySelector<HTMLElement>('.rd')?.dataset.theme === 'light'); }, []);
  const flip = () => {
    const next = !light, el = document.querySelector<HTMLElement>('.rd');
    if (el) { if (next) el.dataset.theme = 'light'; else delete el.dataset.theme; }
    try { localStorage.setItem('wb-read-theme', next ? 'light' : 'dark'); } catch { /* 기억 못 해도 괜찮아요 */ }
    setLight(next);
  };
  const label = light ? '어두운 화면으로 바꾸기' : '밝은 화면으로 바꾸기';
  return <button type="button" className={k('theme')} aria-label={label} title={label} onClick={flip}><Ic n={light ? 'moon' : 'sun'} /></button>;
}
