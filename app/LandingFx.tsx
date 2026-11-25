'use client';
import { useEffect } from 'react';

// 첫 화면 효과: 내려올 때 나타나기 · 숫자 올라가기 · 메뉴 눌렀을 때 부드럽게 이동
export default function LandingFx() {
  useEffect(() => {
    const root = document.querySelector('.lp');
    if (!root) return;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 숫자 올라가기
    const count = (el: HTMLElement) => {
      const to = Number(el.dataset.count || 0);
      if (calm || !to) { el.textContent = String(to); return; }
      const t0 = performance.now(), dur = 1100;
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = String(Math.round(to * e));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-r]'));
    if (calm || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('on'));
      root.querySelectorAll<HTMLElement>('[data-count]').forEach(count);
    } else {
      root.classList.add('fx');
      const io = new IntersectionObserver((ents) => {
        ents.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target as HTMLElement;
          el.classList.add('on');
          el.querySelectorAll<HTMLElement>('[data-count]').forEach(count);
          io.unobserve(el);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      items.forEach((el) => io.observe(el));
    }

    // 마우스로 끌어서 옆으로 넘기기 (손가락은 원래 되니 마우스만)
    root.querySelectorAll<HTMLElement>('[data-drag]').forEach((el) => {
      let sx = 0, sl = 0, moved = false, on = false;
      el.addEventListener('pointerdown', (ev) => { if (ev.pointerType !== 'mouse' || el.scrollWidth <= el.clientWidth) return; on = true; moved = false; sx = ev.clientX; sl = el.scrollLeft; });
      el.addEventListener('pointermove', (ev) => { if (!on) return; const dx = ev.clientX - sx; if (Math.abs(dx) > 4) { moved = true; el.classList.add('drag'); el.style.scrollBehavior = 'auto'; } if (moved) el.scrollLeft = sl - dx; });
      const end = () => { if (!on) return; on = false; el.classList.remove('drag'); el.style.scrollBehavior = ''; };
      el.addEventListener('pointerup', end); el.addEventListener('pointerleave', end);
      el.addEventListener('click', (ev) => { if (moved) { ev.preventDefault(); ev.stopPropagation(); moved = false; } }, true);
      el.addEventListener('dragstart', (ev) => ev.preventDefault());
    });

    // 옆으로 넘기는 카드: 화살표 · 점 · 저절로 넘기기(마우스를 올리거나 만지면 멈춤)
    const stops: (() => void)[] = [];
    root.querySelectorAll<HTMLElement>('[data-slide]').forEach((box) => {
      const track = box.querySelector<HTMLElement>('.lp-val');
      if (!track) return;
      const cards = Array.from(track.children) as HTMLElement[];
      const dots = Array.from(box.querySelectorAll<HTMLElement>('.dots i'));
      const prev = box.querySelector<HTMLButtonElement>('[data-prev]'), next = box.querySelector<HTMLButtonElement>('[data-next]');
      const at = () => { const x = track.scrollLeft; let k = 0, best = 1e9; cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - cards[0].offsetLeft - x); if (d < best) { best = d; k = i; } }); return k; };
      const maxX = () => track.scrollWidth - track.clientWidth - 2;
      const go = (i: number) => { const c = cards[Math.max(0, Math.min(cards.length - 1, i))]; track.scrollTo({ left: c.offsetLeft - cards[0].offsetLeft, behavior: calm ? 'auto' : 'smooth' }); setTimeout(sync, 600); };
      const sync = () => { const k = at(), step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth, n = Math.max(1, cards.length - Math.round(track.clientWidth / Math.max(1, step)) + 1); dots.forEach((d, i) => { d.hidden = i >= n; d.classList.toggle('on', i === Math.min(k, n - 1)); }); if (prev) prev.disabled = track.scrollLeft < 2; if (next) next.disabled = track.scrollLeft >= maxX(); };
      prev?.addEventListener('click', () => go(at() - 1));
      next?.addEventListener('click', () => go(at() + 1));
      dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
      track.addEventListener('scroll', sync, { passive: true });
      addEventListener('resize', sync);
      sync();
      if (calm) return;
      let hold = false, seen = false;
      const pause = () => { hold = true; }, resume = () => { hold = false; };
      box.addEventListener('mouseenter', pause); box.addEventListener('mouseleave', resume);
      box.addEventListener('touchstart', pause, { passive: true }); box.addEventListener('focusin', pause);
      const vo = 'IntersectionObserver' in window ? new IntersectionObserver(([en]) => { seen = en.isIntersecting; }, { threshold: 0.4 }) : null;
      vo?.observe(box);
      const timer = setInterval(() => { if (hold || !seen || document.hidden) return; track.scrollLeft >= maxX() ? go(0) : go(at() + 1); }, 4500);
      stops.push(() => { clearInterval(timer); vo?.disconnect(); });
    });

    // 메뉴 링크: 부드럽게 이동 + 지금 보는 구역 표시
    const nav = document.querySelector('.lp-nav');
    const onClick = (e: Event) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute('href')!.slice(1), t = id ? document.getElementById(id) : null;
      if (!t) return;
      e.preventDefault();
      if (a.closest('.lp-nav')) { moveInd(a); lockUntil = Date.now() + 1100; }
      const top = t.getBoundingClientRect().top + scrollY - ((nav as HTMLElement)?.offsetHeight || 0);
      scrollTo({ top: Math.max(0, top), behavior: calm ? 'auto' : 'smooth' });
      history.replaceState(null, '', '#' + id);
    };
    root.addEventListener('click', onClick);

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.lp-nav nav a'));
    // 지금 구역 밑줄: 하나의 막대가 메뉴 사이를 미끄러지듯 옮겨 가요
    const navEl = document.querySelector('.lp-nav nav');
    let ind = navEl?.querySelector<HTMLElement>('.ind') || null;
    if (navEl && !ind) { ind = document.createElement('span'); ind.className = 'ind'; ind.setAttribute('aria-hidden', 'true'); navEl.appendChild(ind); }
    let indAt: HTMLAnchorElement | null = null, lockUntil = 0;
    const moveInd = (a: HTMLAnchorElement | null) => {
      if (!ind || a === indAt) return;
      indAt = a;
      if (!a) { ind.classList.remove('on'); return; }
      const pad = 12;
      ind.style.width = Math.max(0, a.offsetWidth - pad * 2) + 'px';
      ind.style.transform = `translateX(${a.offsetLeft + pad}px)`;
      ind.classList.add('on');
    };
    const onResize = () => { const a = indAt; indAt = null; moveInd(a); };
    addEventListener('resize', onResize);
    const secs = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean) as HTMLElement[];
    const onScroll = () => {
      nav?.classList.toggle('scrolled', scrollY > 8);
      const y = scrollY + innerHeight * 0.35;
      let cur = '';
      secs.forEach((s) => { if (s.offsetTop <= y) cur = s.id; });
      links.forEach((a) => a.classList.toggle('cur', a.hash === '#' + cur));
      if (Date.now() > lockUntil) moveInd(links.find((a) => a.hash === '#' + cur) || null);
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => { root.removeEventListener('click', onClick); removeEventListener('scroll', onScroll); removeEventListener('resize', onResize); stops.forEach((f) => f()); };
  }, []);
  return null;
}
