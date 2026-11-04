import Link from 'next/link';
import { getSettings } from '@/lib/settings';
import { admins } from '@/lib/admin-data';
import { saveSettingsAction } from '../actions';
import { engineReady } from '@/lib/ai';
import { env } from '@/lib/env';
import { r2Ready } from '@/lib/storage';
import { mailReady } from '@/lib/mail';
import { ago } from '@/lib/fmt';

export const metadata = { title: '설정' };

const Ok = ({ on, yes = '연결됨', no = '키 없음' }: { on: boolean; yes?: string; no?: string }) => <span className={`pill ${on ? 'p-ok' : 'p-gray'}`}>{on ? yes : no}</span>;

export default async function SettingsPage() {
  const [st, ad] = await Promise.all([getSettings(), admins()]);
  const N = (name: string, label: string, v: number, unit: string) => <label className="fld">{label}<span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="number" name={name} defaultValue={v} min={0} style={{ flex: 1 }} /><small>{unit}</small></span></label>;
  return (
    <section className="view">
      <header className="ph"><h1>설정</h1><span className="sub">바꾸면 30초 안에 서비스에 반영돼요</span></header>
      <form action={saveSettingsAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card"><h2>AI 엔진</h2>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
            <label className="fld">글 AI (기획 · 콘티 · 대사)<select name="text" defaultValue={st.engines.text}><option value="claude">Claude — {env.claudeModel}</option><option value="openai">OpenAI — {env.openaiTextModel}</option></select></label>
            <label className="fld">이미지 AI<select name="image" defaultValue={st.engines.image}><option value="gemini">Gemini 나노바나나 — {env.geminiModel} · Pro {env.geminiModelPro}</option><option value="openai">OpenAI — {env.openaiImageModel}</option></select></label>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><span className="note">API 키:</span> Claude <Ok on={engineReady('claude')} /> Gemini <Ok on={engineReady('gemini')} /> OpenAI <Ok on={engineReady('openai')} /></div>
          <p className="note">키가 없는 엔진을 고르면 작업실은 예시 글 · 예시 그림으로 채워요. 엔진을 바꿔도 이미 만든 그림은 그대로예요 · 같은 인물이라도 엔진마다 그림체가 조금 달라질 수 있어요.</p>
        </div>
        <div className="card"><h2>무료 · 프로 한도</h2>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            {N('freeText', '무료 · 글 AI (매달)', st.limits.freeText, '회')}{N('freeImage', '무료 · 이미지 (가입 선물)', st.limits.freeImage, '장')}{N('proText', '프로 · 글 AI (매달)', st.limits.proText, '회')}{N('proImage', '프로 · 이미지 (매달)', st.limits.proImage, '장')}
          </div>
        </div>
        <div className="card"><h2>예산 · 단가</h2>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            {N('budgetKrw', '월 AI 예산', st.budgetKrw, '원')}{N('costText', '글 AI 1회 단가', st.cost.text, '원')}{N('costImage', '이미지 1장 단가', st.cost.image, '원')}{N('costImagePro', '고품질 이미지 1장', st.cost.imagePro, '원')}
          </div>
          <label className="tg" style={{ borderBottom: 0 }}><span><b>예산을 넘으면 AI 멈추기</b><small>이번 달 비용이 예산을 넘으면 회원의 AI 호출을 막아요 · 관리자는 계속 쓸 수 있어요</small></span><input className="sw" type="checkbox" name="budgetStop" defaultChecked={st.budgetStop} /></label>
          <p className="note">단가는 비용 통계에 쓰여요. 실제 청구 금액은 Anthropic · Google 콘솔에서 확인하고, 거기에도 월 한도를 걸어 두세요.</p>
        </div>
        <div><button className="btn pri lg">설정 저장</button></div>
      </form>
      <div className="grid g-2">
        <div className="card"><h2>연결 상태</h2>
          <dl className="kv">
            <dt>DB · 로그인</dt><dd><Ok on={!!env.supabaseUrl} yes="Supabase 연결" no="로컬 시연 모드" /></dd>
            <dt>관리자 키</dt><dd><Ok on={!!env.serviceRole} /></dd>
            <dt>파일 저장</dt><dd>{r2Ready() ? <span className="pill p-ok">Cloudflare R2 · {env.r2.bucket}</span> : <span className="pill p-gray">Supabase Storage</span>}</dd>
            <dt>메일</dt><dd><Ok on={mailReady()} yes={`Resend · ${env.mailFrom}`} no="꺼짐 (답변은 화면에서만)" /></dd>
          </dl>
        </div>
        <div className="card"><div className="hd"><h2>관리자 {ad.length}명</h2><span className="note r">권한은 회원 상세에서 바꿔요</span></div>
          {ad.map((a) => <Link className="row" key={a.id} href={`/admin/members/${a.id}`}><span className="av dark">{(a.name || a.email || '?').slice(0, 1)}</span><span style={{ flex: 1 }}><b>{a.name || '—'}</b><span className="sub2">{a.email}</span></span><small className="note">{ago(a.last_seen_at)}</small></Link>)}
          {env.adminEmails.length > 0 && <p className="note">자동 관리자 이메일(ADMIN_EMAILS): {env.adminEmails.join(', ')}</p>}
        </div>
      </div>
    </section>
  );
}
