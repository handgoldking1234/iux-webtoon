import { acquisition } from '@/lib/admin-data';
import { num } from '@/lib/fmt';
import UtmBuilder from './UtmBuilder';
import { env } from '@/lib/env';

export const metadata = { title: '유입경로' };

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export default async function Acq({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = [7, 30, 90].includes(+(sp.days || 30)) ? +(sp.days || 30) : 30;
  const r = await acquisition(days);
  const f = r.funnel, worst = f.slice(1, 4).map((v, i) => pct(v, f[i])).reduce((w, v, i, a) => (v < a[w] ? i : w), 0);
  return (
    <section className="view">
      <header className="ph"><h1>유입경로</h1><span className="sub">최근 {days}일 가입 기준 · 가입할 때 들어온 채널(utm_source)</span>
        <div className="act"><div className="seg">{[7, 30, 90].map((d) => <a key={d} href={`/admin/acq?days=${d}`}><button type="button" aria-pressed={d === days}>{d}일</button></a>)}</div></div></header>
      <div className="card"><div className="hd"><h2>제작 퍼널</h2>{f[0] > 0 && <span className="sub">가장 큰 이탈은 <strong className="down">{r.labels[worst]} → {r.labels[worst + 1]}</strong></span>}</div>
        <div className="funnel">
          {f.map((v, i) => <div className="frow" key={i}><span>{r.labels[i]}</span><div className="ftrack"><i className={i === 2 ? 'hl' : ''} style={{ width: `${Math.max(4, Math.sqrt(v / Math.max(1, f[0])) * 100)}%` }}>{num(v)}</i></div><span className={`fconv${i && pct(v, f[i - 1]) < 40 ? ' bad' : ''}`}>{i ? `← ${pct(v, f[i - 1])}%` : ''}</span></div>)}
        </div>
        <p className="note">오른쪽 숫자는 바로 앞 단계에서 넘어온 비율이에요. 막대 길이는 차이가 잘 보이게 제곱근으로 줄였어요.</p>
      </div>
      <div className="card"><h2>채널별 성과</h2>
        <div className="tw"><table style={{ minWidth: 720 }}>
          <thead><tr><th>채널</th><th className="r">가입</th><th className="r">작품 저장</th><th className="r">AI 사용</th><th className="r">재방문</th><th className="r">프로 알림</th></tr></thead>
          <tbody>
            {r.channels.map((c) => <tr key={c.source}><th scope="row">{c.source}</th><td className="r">{num(c.s[0])}</td><td className="r">{c.s[1]} <span className="sub2" style={{ display: 'inline' }}>{pct(c.s[1], c.s[0])}%</span></td><td className="r">{c.s[2]} <span className="sub2" style={{ display: 'inline' }}>{pct(c.s[2], c.s[0])}%</span></td><td className="r">{c.s[3]} <span className="sub2" style={{ display: 'inline' }}>{pct(c.s[3], c.s[0])}%</span></td><td className="r"><b>{c.s[4]}</b></td></tr>)}
            {!r.channels.length && <tr><td colSpan={6} className="c note" style={{ padding: 24 }}>이 기간에 가입한 회원이 없어요</td></tr>}
          </tbody>
        </table></div>
      </div>
      <UtmBuilder site={env.siteUrl} />
    </section>
  );
}
