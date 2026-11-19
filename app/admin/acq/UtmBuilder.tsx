'use client';
import { useState } from 'react';

export default function UtmBuilder({ site }: { site: string }) {
  const [s, setS] = useState('instagram'), [m, setM] = useState('social'), [c, setC] = useState('launch');
  const url = `${site.replace(/\/$/, '')}/?utm_source=${encodeURIComponent(s)}&utm_medium=${encodeURIComponent(m)}&utm_campaign=${encodeURIComponent(c)}`;
  const [done, setDone] = useState(false);
  return (
    <div className="card"><h2>캠페인 링크 만들기</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
        <label className="fld">채널 (source)<input value={s} onChange={(e) => setS(e.target.value)} /></label>
        <label className="fld">매체 (medium)<input value={m} onChange={(e) => setM(e.target.value)} /></label>
        <label className="fld">캠페인 (campaign)<input value={c} onChange={(e) => setC(e.target.value)} /></label>
      </div>
      <div className="mono">{url}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button className="btn pri" onClick={() => { navigator.clipboard.writeText(url).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }); }}>{done ? '복사했어요' : '링크 복사'}</button><span className="note">이 링크로 들어와 가입하면 위 표의 채널로 잡혀요</span></div>
    </div>
  );
}
