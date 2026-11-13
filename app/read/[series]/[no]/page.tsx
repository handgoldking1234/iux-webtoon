import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { readHref } from '@/lib/read/config';
import { getEpisode, img } from '@/lib/read/store';
import { avg } from '@/lib/read/types';
import Comments from '../../_ui/Comments';
import { Ic } from '../../_ui/Icons';
import { Rating, ReportButton, ViewPing } from '../../_ui/Interact';
import Strip, { type CutV } from '../../_ui/Strip';
import { k } from '../../_ui/k';

export const dynamic = 'force-dynamic';
const viewer = async () => { const me = await getMe(); return me ? { id: me.profile.id, isAdmin: me.isAdmin, mode: me.mode } : null; };

export async function generateMetadata({ params }: { params: Promise<{ series: string; no: string }> }): Promise<Metadata> {
  const p = await params, got = await getEpisode(p.series, +p.no, await viewer());
  if (!got) return { title: '회차를 찾을 수 없어요' };
  const t = img(got.episode.thumb_path) || img(got.series.thumb_path);
  return { title: `${got.series.title} ${got.episode.no}화 ${got.episode.title}`, description: got.series.description.slice(0, 120), openGraph: { images: t ? [t] : undefined } };
}

export default async function Viewer({ params }: { params: Promise<{ series: string; no: string }> }) {
  const p = await params, me = await viewer();
  const got = await getEpisode(p.series, +p.no, me);
  if (!got) notFound();
  const { series: s, episode: e, prev, next, myRating, comments } = got;
  const cuts: CutV[] = e.cuts.map((c, i) => ({ url: img(c.path), w: c.w, h: c.h, demo: c.path.startsWith('demo:') && s.art ? { art: s.art, seed: `${s.id}${e.no}-${i}`, lines: e.demoLines?.[i] || [] } : undefined }));
  const title = (n: number | null) => (n === null ? null : got.episodes.find((x) => x.no === n)?.title || `${n}화`);
  return (
    <>
      <div className={k('vbar')}>
        <div className={k('wrap')}>
          <Link className={k('ibtn')} href={readHref(s.id)} aria-label="작품으로"><Ic n="left" /></Link>
          <div className={k('t')}><b>{s.title}</b><small>{e.no}화 · {e.title}</small></div>
          {prev !== null ? <Link className={k('ibtn')} href={readHref(`${s.id}/${prev}`)} aria-label="이전 화"><Ic n="left" /></Link> : <span className={k('ibtn off')} aria-hidden="true"><Ic n="left" /></span>}
          {next !== null ? <Link className={k('ibtn')} href={readHref(`${s.id}/${next}`)} aria-label="다음 화"><Ic n="right" /></Link> : <span className={k('ibtn off')} aria-hidden="true"><Ic n="right" /></span>}
        </div>
      </div>
      <ViewPing episodeId={e.id} />
      <Strip cuts={cuts} label={`${e.no}화 본문`} />
      <div className={k('after')}>
        {e.author_note && <div className={k('amsg')}><small>작가의 말</small><p>{e.author_note}</p></div>}
        <Rating episodeId={e.id} mine={myRating} avg={avg(e)} count={e.rating_count} />
        <nav className={k('navep')} aria-label="회차 이동">
          {prev !== null ? <Link href={readHref(`${s.id}/${prev}`)}><small>이전 화</small><b>{title(prev)}</b></Link> : <span className={k('off')}><small>이전 화</small><b>첫 화예요</b></span>}
          {next !== null ? <Link className={k('next')} href={readHref(`${s.id}/${next}`)}><small>다음 화</small><b>{title(next)}</b></Link> : <span className={k('next off')}><small>다음 화</small><b>최신화예요</b></span>}
        </nav>
        <Comments episodeId={e.id} initial={comments} signedIn={!!me} />
        <p className={k('muted')} style={{ fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'center' }}>{e.ai && <span>이 회차는 AI 활용 표시가 있어요 ·</span>}<ReportButton type="episode" id={e.id} label="이 회차 신고" /></p>
      </div>
    </>
  );
}
