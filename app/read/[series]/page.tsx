import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { ageLabel, dayLabel, readHref } from '@/lib/read/config';
import { getSeries, img } from '@/lib/read/store';
import { avg } from '@/lib/read/types';
import { sv } from '@/lib/read/view';
import Art from '../_ui/Art';
import { FollowButton, ReportButton, ShareButton } from '../_ui/Interact';
import Thumb from '../_ui/Thumb';
import { k } from '../_ui/k';

export const dynamic = 'force-dynamic';
const viewer = async () => { const me = await getMe(); return me ? { id: me.profile.id, isAdmin: me.isAdmin } : null; };
const date = (iso: string) => { const d = new Date(iso); return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };

export async function generateMetadata({ params }: { params: Promise<{ series: string }> }): Promise<Metadata> {
  const got = await getSeries((await params).series, await viewer());
  if (!got) return { title: '작품을 찾을 수 없어요' };
  const s = got.series, t = img(s.thumb_path);
  return { title: s.title, description: s.description.slice(0, 120), openGraph: { title: s.title, description: s.description.slice(0, 120), images: t ? [t] : undefined } };
}

export default async function SeriesPage({ params }: { params: Promise<{ series: string }> }) {
  const got = await getSeries((await params).series, await viewer());
  if (!got) notFound();
  const { series: s, episodes, followed, owner } = got, v = sv(s);
  const when = s.kind === 'done' ? '완결' : s.kind === 'daily' ? `${s.days.map(dayLabel).join(' · ')}요일 연재` : '자유연재';
  const first = episodes.length ? Math.min(...episodes.map((e) => e.no)) : null;
  return (
    <div className={k('wrap')}>
      <section className={k('thead')}>
        <div className={k('th')}><Thumb s={v} w={300} h={400} alt={`${s.title} 썸네일`} /></div>
        <div>
          <h1>{s.title}</h1>
          <p className={k('who')}><span>글/그림 {s.author_name}</span><span>{when}</span><span>{ageLabel(s.age)}</span></p>
          <p className={k('desc')}>{s.description}</p>
          <div className={k('chips')}>
            <span className={k('chip')}>#{s.genre}</span><span className={k('chip')}>총 {s.episodes}화</span>
            {s.ai && <span className={k('chip ai')}>AI 활용 작품</span>}
            {avg(s) > 0 && <span className={k('chip')}>★ {avg(s).toFixed(2)}</span>}
            {owner && s.review === 'pending' && <span className={k('chip')}>요일연재 검토 중</span>}
            {owner && s.hidden && <span className={k('chip')}>운영 숨김</span>}
          </div>
          <div className={k('acts')}>
            {first !== null && <Link className={k('btn go big')} href={readHref(`${s.id}/${first}`)}>첫 화 보기</Link>}
            <FollowButton seriesId={s.id} initial={followed} />
            <ShareButton />
            {owner && <Link className={k('btn big')} href={readHref('publish')}>다음 화 올리기</Link>}
          </div>
        </div>
      </section>
      <section className={k('eplist')} aria-label="회차 목록">
        <div className={k('hd')}><b>총 {episodes.length}화</b><span className={k('muted')}>최신화부터</span><span style={{ marginLeft: 'auto' }}><ReportButton type="series" id={s.id} label="작품 신고" /></span></div>
        {!episodes.length && <p className={k('empty')}>아직 공개된 회차가 없어요</p>}
        {episodes.map((e) => (
          <Link className={k('ep')} key={e.id} href={readHref(`${s.id}/${e.no}`)}>
            <span className={k('eth')}>{img(e.thumb_path) ? <img src={img(e.thumb_path)!} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : s.art ? <Art art={s.art} seed={s.id + e.no} w={320} h={200} /> : null}</span>
            <span style={{ minWidth: 0 }}><b>{e.no}화 · {e.title}</b><small>{e.rating_count ? <span className={k('star tnum')}>★ {avg(e).toFixed(2)}</span> : '별점 없음'}{e.status !== 'public' ? ` · ${e.status === 'scheduled' ? '예약 공개' : '숨김'}` : Date.parse(e.publish_at) > Date.now() ? ' · 예약 공개' : ''}</small></span>
            <span className={k('d tnum')}>{date(e.publish_at)}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
