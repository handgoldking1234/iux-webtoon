'use client';
import { useEffect, useRef, useState } from 'react';

/** 첫 화면 '말풍선 레이어' — 커서가 대사를 지우고 다시 쓰는 모습 (그림은 그대로, 글자만 바뀜) */
const LINES = ['안 가져왔지?', '또 깜빡했어?', '같이 쓰고 갈래?'];

export default function TypeBubble() {
  const [txt, setTxt] = useState(LINES[0]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let alive = true, seen = false, timer = 0, idx = 0;
    const wait = (ms: number) => new Promise<void>((r) => { timer = window.setTimeout(r, ms); });
    const io = new IntersectionObserver((es) => { seen = es.some((e) => e.isIntersecting); }, { threshold: 0.3 });
    if (ref.current) io.observe(ref.current);
    (async () => {
      let cur = LINES[0];
      while (alive) {
        await wait(2600);
        if (!seen) continue;
        const next = LINES[(idx = (idx + 1) % LINES.length)];
        setBusy(true);
        // 지우기
        while (alive && cur.length) { cur = Array.from(cur).slice(0, -1).join(''); setTxt(cur); await wait(55); }
        await wait(260);
        // 다시 쓰기
        for (const ch of Array.from(next)) { if (!alive) break; cur += ch; setTxt(cur); await wait(115); }
        setBusy(false);
      }
    })();
    return () => { alive = false; clearTimeout(timer); io.disconnect(); };
  }, []);

  const q = txt.endsWith('?');
  return (
    <span className="t" ref={ref}>
      오늘도 우산<br />
      {q ? txt.slice(0, -1) : txt}{q && <b>?</b>}<i className={busy ? 'caret on' : 'caret'} />
      {!txt && <span style={{ visibility: 'hidden' }}>가</span>}
    </span>
  );
}
