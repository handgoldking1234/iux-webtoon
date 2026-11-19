import Link from 'next/link';
import { requireMe } from '@/lib/auth';
import { getDraft, img, mySeries } from '@/lib/read/store';
import { sv } from '@/lib/read/view';
import PublishFlow from '../_ui/PublishFlow';
import { k } from '../_ui/k';

export const dynamic = 'force-dynamic';
export const metadata = { title: '연재하기' };

export default async function PublishPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const q = await searchParams;
  const me = await requireMe('/read/publish' + (q.draft ? `?draft=${encodeURIComponent(q.draft)}` : ''));
  const [draft, mine] = await Promise.all([q.draft ? getDraft(me.profile.id, q.draft) : null, mySeries(me.profile.id)]);
  if (!draft || draft.used || !draft.ready) {
    return (
      <div className={k('pub wrap')}>
        <h1>연재하기</h1>
        <div className={k('panel')} style={{ marginTop: 18 }}>
          {draft?.used ? <p className={k('msg')}>이 회차는 이미 올렸어요.</p> : q.draft ? <p className={k('msg bad')}>연재할 회차를 찾을 수 없어요. 편집기에서 「연재하기」를 다시 눌러 주세요.</p> : null}
          <h2>웹툰보드 편집기에서 시작해요</h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6 }}>
            <li>편집기에서 올릴 회차를 열어요.</li>
            <li>아래 막대의 「연재하기」를 누르면 컷을 연재 규격(가로 690px)으로 만들어 올려요.</li>
            <li>이 화면으로 돌아와 작품 정보와 공개 설정을 정하면 끝이에요.</li>
          </ol>
          <div className={k('pfoot')}><Link className={k('btn big')} href="/read">연재관으로</Link><a className={k('btn go big')} href="/studio">편집기 열기</a></div>
          {mine.length > 0 && <p className={k('muted')}>내 연재 작품: {mine.map((s, i) => <span key={s.id}>{i ? ' · ' : ''}<Link href={`/read/${s.id}`} style={{ textDecoration: 'underline' }}>{s.title}</Link></span>)}</p>}
        </div>
      </div>
    );
  }
  return (
    <PublishFlow
      draft={{ id: draft.id, ai: draft.ai, source: draft.source, cuts: draft.cuts.map((c) => ({ url: img(c.path), w: c.w, h: c.h })) }}
      mine={mine.map(sv)}
      penName={mine[0]?.author_name || me.profile.name || ''}
    />
  );
}
