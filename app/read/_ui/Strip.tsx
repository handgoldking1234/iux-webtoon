import type { Art as ArtT } from '@/lib/read/types';
import Art from './Art';
import { k } from './k';

export type CutV = { url: string | null; w: number; h: number; demo?: { art: ArtT; seed: string; lines: [string, string][] } };

/** 세로 컷 — 위에서 아래로 이어 붙여 보여 줘요 (컷 사이 여백 없이) */
export default function Strip({ cuts, label }: { cuts: CutV[]; label: string }) {
  return (
    <div className={k('strip')} aria-label={label}>
      {cuts.map((c, i) => (
        <div className={k('cutv')} key={i} style={{ aspectRatio: `${c.w} / ${c.h || c.w}` }}>
          {c.url ? <img src={c.url} alt={`${i + 1}번째 컷`} width={c.w} height={c.h || undefined} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" style={{ width: '100%', height: 'auto' }} />
            : c.demo ? (
              <>
                <Art art={c.demo.art} seed={c.demo.seed} w={c.w} h={c.h} people={i % 3 === 1 ? 2 : 1} alt={`${i + 1}번째 컷`} />
                {c.demo.lines.map(([t, s], j) => {
                  const pos = t === 'nar' ? { left: '6%', top: '6%', maxWidth: '80%' } : j % 2 ? { right: '6%', top: `${26 + j * 14}%` } : { left: `${8 + ((i * 13) % 30)}%`, top: `${10 + j * 16}%` };
                  return <p key={j} className={k(`bal ${t === 'nar' ? 'nar' : t === 'sh' ? 'sh' : ''}`)} style={pos}>{s}</p>;
                })}
              </>
            ) : null}
        </div>
      ))}
    </div>
  );
}
