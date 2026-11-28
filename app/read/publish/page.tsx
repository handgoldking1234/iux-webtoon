import Link from 'next/link';
import { requireMe } from '@/lib/auth';
import { getDraft, mySeries, myTrash, TRASH_DAYS } from '@/lib/read/store';
import { TrashRow, UploadEpisode } from '../_ui/OwnerEdit';
import { k } from '../_ui/k';

export const dynamic = 'force-dynamic';
export const metadata = { title: '연재 올리기' };

export default async function PublishPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const q = await searchParams;
  const me = await requireMe('/read/publish' + (q.draft ? `?draft=${encodeURIComponent(q.draft)}` : ''));
  const [draft, mine, trash] = await Promise.all([q.draft ? getDraft(me.profile.id, q.draft) : null, mySeries(me.profile.id), myTrash(me.profile.id)]);
  const left = (at?: string | null) => Math.max(1, Math.ceil(TRASH_DAYS - (Date.now() - Date.parse(at || '')) / 864e5));
  // 이제 편집기의 「연재하기」 창에서 작품 정보 · 연재 이미지까지 모두 채워 바로 올려요 (이 화면은 안내만)
    return (
      <div className={k('pub wrap')}>
        <h1>연재 올리기</h1>
        <div className={k('panel')} style={{ marginTop: 18 }}>
          <h2>그림 파일로 올리기</h2>
          <p className={k('muted')} style={{ margin: '0 0 12px' }}>다른 곳에서 그린 원고가 있으면 그림 파일만 골라 바로 올려요. 이어서 올릴 작품을 고르거나 새 작품으로 시작할 수 있어요.</p>
          <UploadEpisode list={mine.map((s) => ({ id: s.id, title: s.title, nextNo: s.episodes + 1 }))} label="그림 파일로 올리기" cls="btn go big" author={mine[0]?.author_name || ''} />
        </div>
        <div className={k('panel')} style={{ marginTop: 18 }}>
          <h2>내가 올린 작품</h2>
          {mine.length > 0
            ? <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>{mine.map((s) => <li key={s.id}><Link href={`/read/${s.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10 }}><b>{s.title}{s.paused ? <small className={k('muted')} style={{ fontWeight: 500 }}> · 숨김</small> : null}</b><span className={k('muted')}>총 {s.episodes}화 · 고치기 · 삭제 ›</span></Link></li>)}</ul>
            : <p className={k('muted')}>아직 올린 작품이 없어요. 작업실에서 첫 화를 만들어 올려 보세요.</p>}
        </div>
        {(trash.series.length > 0 || trash.episodes.length > 0) && (
          <div className={k('panel')} style={{ marginTop: 14 }}>
            <h2>휴지통 <small className={k('muted')} style={{ fontWeight: 500, fontSize: 13 }}>넣은 지 {TRASH_DAYS}일이 지나면 완전히 지워져요</small></h2>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
              {trash.series.map((s) => <TrashRow key={s.id} seriesId={s.id} label={`${s.title} (작품 전체 · ${s.episodes}화)`} left={left(s.deleted_at)} />)}
              {trash.episodes.map((e) => <TrashRow key={e.series_id + e.no} seriesId={e.series_id} epNo={e.no} label={`${e.series_title} · ${e.title} (회차)`} left={left(e.deleted_at)} />)}
            </ul>
          </div>
        )}
        <div className={k('panel')} style={{ marginTop: 14 }}>
          {draft?.used ? <p className={k('msg')}>이 회차는 이미 올렸어요.</p> : null}
          <h2>편집기에서 만들어 올리기</h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            <li>작업실(편집기)에서 올릴 회차를 열어요.</li>
            <li>아래 막대의 「연재하기」를 누르면 연재 창이 열려요.</li>
            <li>작가 · 작품 소개 · 연재 이미지(정사각형 · 세로 대표 이미지, 회차 썸네일) · 작가의 말을 모두 채우면 올라가요.</li>
          </ol>
          <div className={k('pfoot')}><Link className={k('btn big')} href="/read">연재관으로</Link><a className={k('btn go big')} href="/studio">작업실 열기</a></div>
        </div>
      </div>
    );
}
