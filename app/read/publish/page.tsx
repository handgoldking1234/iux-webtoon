import Link from 'next/link';
import { requireMe } from '@/lib/auth';
import { getDraft, mySeries } from '@/lib/read/store';
import { k } from '../_ui/k';

export const dynamic = 'force-dynamic';
export const metadata = { title: '연재하기' };

export default async function PublishPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const q = await searchParams;
  const me = await requireMe('/read/publish' + (q.draft ? `?draft=${encodeURIComponent(q.draft)}` : ''));
  const [draft, mine] = await Promise.all([q.draft ? getDraft(me.profile.id, q.draft) : null, mySeries(me.profile.id)]);
  // 이제 편집기의 「연재하기」 창에서 작품 정보 · 연재 이미지까지 모두 채워 바로 올려요 (이 화면은 안내만)
    return (
      <div className={k('pub wrap')}>
        <h1>연재하기</h1>
        <div className={k('panel')} style={{ marginTop: 18 }}>
          {draft?.used ? <p className={k('msg')}>이 회차는 이미 올렸어요.</p> : null}
          <h2>바로웹툰 편집기에서 시작해요</h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            <li>편집기에서 올릴 회차를 열어요.</li>
            <li>아래 막대의 「연재하기」를 누르면 연재 창이 열려요.</li>
            <li>작가 · 작품 소개 · 연재 이미지(정사각형 · 세로 대표 이미지, 회차 썸네일) · 작가의 말을 모두 채우면 올라가요.</li>
          </ol>
          <div className={k('pfoot')}><Link className={k('btn big')} href="/read">연재관으로</Link><a className={k('btn go big')} href="/studio">편집기 열기</a></div>
          {mine.length > 0 && <p className={k('muted')}>내 연재 작품: {mine.map((s, i) => <span key={s.id}>{i ? ' · ' : ''}<Link href={`/read/${s.id}`} style={{ textDecoration: 'underline' }}>{s.title}</Link></span>)}</p>}
        </div>
      </div>
    );
}
