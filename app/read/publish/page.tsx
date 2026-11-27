import Link from 'next/link';
import { requireMe } from '@/lib/auth';
import { getDraft, mySeries } from '@/lib/read/store';
import { k } from '../_ui/k';

export const dynamic = 'force-dynamic';
export const metadata = { title: '내 연재' };

export default async function PublishPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const q = await searchParams;
  const me = await requireMe('/read/publish' + (q.draft ? `?draft=${encodeURIComponent(q.draft)}` : ''));
  const [draft, mine] = await Promise.all([q.draft ? getDraft(me.profile.id, q.draft) : null, mySeries(me.profile.id)]);
  // 이제 편집기의 「연재하기」 창에서 작품 정보 · 연재 이미지까지 모두 채워 바로 올려요 (이 화면은 안내만)
    return (
      <div className={k('pub wrap')}>
        <h1>내 연재</h1>
        <div className={k('panel')} style={{ marginTop: 18 }}>
          <h2>내가 올린 작품</h2>
          {mine.length > 0
            ? <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>{mine.map((s) => <li key={s.id}><Link href={`/read/${s.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 10 }}><b>{s.title}</b><span className={k('muted')}>총 {s.episodes}화 ›</span></Link></li>)}</ul>
            : <p className={k('muted')}>아직 올린 작품이 없어요. 작업실에서 첫 화를 만들어 올려 보세요.</p>}
        </div>
        <div className={k('panel')} style={{ marginTop: 14 }}>
          {draft?.used ? <p className={k('msg')}>이 회차는 이미 올렸어요.</p> : null}
          <h2>새 회차는 작업실에서 올려요</h2>
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
