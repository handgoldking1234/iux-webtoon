import Link from 'next/link';
import { listProjects } from '@/lib/admin-data';
import { restoreProject } from '../actions';
import { ago, bytes } from '@/lib/fmt';

export const metadata = { title: '작품' };

export default async function Projects({ searchParams }: { searchParams: Promise<{ q?: string; deleted?: string }> }) {
  const sp = await searchParams;
  const r = await listProjects({ q: sp.q, deleted: sp.deleted === '1' });
  return (
    <section className="view">
      <header className="ph"><h1>작품</h1><span className="sub">클라우드에 저장된 작품 · 최근 200개</span>
        <div className="act"><div className="seg"><Link href="/admin/projects"><button type="button" aria-pressed={sp.deleted !== '1'}>저장된 작품</button></Link><Link href="/admin/projects?deleted=1"><button type="button" aria-pressed={sp.deleted === '1'}>지운 작품</button></Link></div></div></header>
      <form style={{ display: 'flex', gap: 8 }}><label className="search"><input type="search" name="q" defaultValue={sp.q} placeholder="작품 제목 검색" aria-label="작품 검색" /></label>{sp.deleted && <input type="hidden" name="deleted" value="1" />}<button className="btn">찾기</button></form>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tw"><table style={{ minWidth: 720 }}>
          <thead><tr style={{ background: 'var(--soft2)' }}><th style={{ paddingLeft: 16 }}>제목</th><th>작가</th><th className="r">회차</th><th className="r">컷</th><th className="r">크기</th><th>{sp.deleted ? '지운 때' : '수정'}</th>{sp.deleted && <th />}</tr></thead>
          <tbody>
            {r.rows.map((p) => <tr key={p.id}><th scope="row" style={{ paddingLeft: 16 }}>{p.title}</th><td><Link href={`/admin/members/${p.owner_id}`}>{p.owner?.name || p.owner?.email || '—'}</Link></td><td className="r">{p.episodes}</td><td className="r">{p.cuts}</td><td className="r">{bytes(p.size_bytes)}</td><td>{ago(sp.deleted ? p.deleted_at : p.updated_at)}</td>
              {sp.deleted && <td><form action={restoreProject}><input type="hidden" name="id" value={p.id} /><button className="btn sm">되살리기</button></form></td>}</tr>)}
            {!r.rows.length && <tr><td colSpan={7} className="c note" style={{ padding: 30 }}>{r.demo ? 'DB 연동 후 작품이 여기에 보여요' : '작품이 없어요'}</td></tr>}
          </tbody>
        </table></div>
      </div>
    </section>
  );
}
