import 'server-only';
import { adminReady, env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/server';
import { limitsOf } from '@/lib/quota';
import { getSettings } from '@/lib/settings';
import type { Profile } from '@/lib/auth';

/** 관리자 화면 데이터 — DB 연동 전에는 예시 데이터를 돌려줘요 (demo: true) */

export type MemberRow = Profile & { signup_source: string | null; memo: string | null; works: number; text_month: number; image_total: number; image_month: number; cost_month: number };
export type UsageRow = { user_id: string; kind: 'text' | 'image'; units: number; cost_krw: number; model: string | null; created_at: string; ok: boolean };

const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString(); };
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

/* ───────── 예시 데이터 (같은 결과가 나오게 고정 난수) */
function demo() {
  let r = 7;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const names = ['서하나', 'minwoo.art', '한시우', 'jiyoon_toon', '구로다', '박소윤', 'lee.webtoon', '최다온', '정해원', 'kimbap_draw', '오지민', '윤서'];
  const src = ['naver', 'chatgpt', 'instagram', 'direct', 'youtube', null];
  const members: MemberRow[] = names.map((n, i) => {
    const created = daysAgo(Math.floor(rnd() * 40));
    const plan = (i === 2 ? 'pro' : i === 7 ? 'edu' : 'free') as Profile['plan'];
    return {
      id: `demo-${i}`, email: `${n.replace(/[^a-z0-9]/gi, '') || 'user' + i}@example.com`, name: n, avatar_url: null,
      provider: ['kakao', 'google', 'email'][i % 3], role: i === 0 ? 'admin' : 'user', plan, status: i === 9 ? 'suspended' : 'active',
      bonus_images: i === 4 ? 10 : 0, pro_notify: i % 4 === 1, created_at: created, last_seen_at: daysAgo(rnd() * 5),
      signup_source: src[i % src.length], memo: null, works: Math.floor(rnd() * 5), text_month: Math.floor(rnd() * 30), image_total: Math.floor(rnd() * 11), image_month: Math.floor(rnd() * 8), cost_month: 0,
    };
  });
  members.forEach((m) => (m.cost_month = m.text_month * env.cost.text + m.image_month * env.cost.image));
  const usage: UsageRow[] = [];
  for (let d = 0; d < 30; d++) for (let k = 0; k < 6 + Math.floor(rnd() * 14); k++) {
    const img = rnd() < 0.45;
    usage.push({ user_id: members[Math.floor(rnd() * members.length)].id, kind: img ? 'image' : 'text', units: 1, cost_krw: img ? env.cost.image : env.cost.text, model: img ? env.geminiModel : env.claudeModel, created_at: daysAgo(d + rnd()), ok: true });
  }
  return { members, usage };
}

/* ───────── 회원 */
export async function listMembers(o: { q?: string; plan?: string; status?: string; sort?: string; page?: number }) {
  const page = Math.max(1, o.page || 1), per = 50;
  if (!adminReady()) {
    let m = demo().members;
    if (o.q) m = m.filter((x) => `${x.name} ${x.email}`.toLowerCase().includes(o.q!.toLowerCase()));
    if (o.plan) m = m.filter((x) => x.plan === o.plan);
    if (o.status) m = m.filter((x) => x.status === o.status);
    return { demo: true, rows: m, total: m.length, page, per };
  }
  const sb = supabaseAdmin();
  let q = sb.from('profiles').select('*', { count: 'exact' });
  if (o.q) q = q.or(`name.ilike.%${o.q.replace(/[%,()]/g, '')}%,email.ilike.%${o.q.replace(/[%,()]/g, '')}%`);
  if (o.plan) q = q.eq('plan', o.plan);
  if (o.status) q = q.eq('status', o.status);
  const sort = o.sort === 'seen' ? 'last_seen_at' : 'created_at';
  const { data, count } = await q.order(sort, { ascending: false, nullsFirst: false }).range((page - 1) * per, page * per - 1);
  const ids = (data || []).map((x) => x.id);
  const [{ data: pj }, { data: um }, { data: ut }, { data: cost }] = ids.length
    ? await Promise.all([
        sb.from('projects').select('owner_id').in('owner_id', ids).is('deleted_at', null),
        sb.from('usage_month').select('user_id,text_used,image_used').in('user_id', ids),
        sb.from('usage_total').select('user_id,image_used_total').in('user_id', ids),
        sb.from('ai_usage').select('user_id,cost_krw').in('user_id', ids).gte('created_at', monthStart()),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const cnt = (arr: { owner_id: string }[] | null, id: string) => (arr || []).filter((x) => x.owner_id === id).length;
  const rows: MemberRow[] = (data || []).map((p) => {
    const m = (um || []).find((x) => x.user_id === p.id), t = (ut || []).find((x) => x.user_id === p.id);
    return { ...p, works: cnt(pj, p.id), text_month: m?.text_used || 0, image_month: m?.image_used || 0, image_total: t?.image_used_total || 0, cost_month: (cost || []).filter((c) => c.user_id === p.id).reduce((a, c) => a + +c.cost_krw, 0) };
  });
  return { demo: false, rows, total: count || 0, page, per };
}

export async function getMember(id: string) {
  if (!adminReady()) {
    const d = demo(), m = d.members.find((x) => x.id === id) || d.members[0];
    return { demo: true, member: m, projects: [] as ProjectRow[], usage: d.usage.filter((u) => u.user_id === m.id).slice(0, 30), inquiries: [] as InquiryRow[], limits: limitsOf(m, (await getSettings()).limits) };
  }
  const sb = supabaseAdmin();
  const { data: p } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!p) return null;
  const [{ data: projects }, { data: usage }, { data: inquiries }, list] = await Promise.all([
    sb.from('projects').select('id,title,episodes,cuts,size_bytes,updated_at,deleted_at,owner_id').eq('owner_id', id).order('updated_at', { ascending: false }).limit(50),
    sb.from('ai_usage').select('user_id,kind,units,cost_krw,model,created_at,ok').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
    sb.from('inquiries').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(20),
    listMembers({ q: p.email || '' }),
  ]);
  const row = list.rows.find((x) => x.id === id) || ({ ...p, works: 0, text_month: 0, image_month: 0, image_total: 0, cost_month: 0 } as MemberRow);
  return { demo: false, member: row, projects: (projects || []) as ProjectRow[], usage: (usage || []) as UsageRow[], inquiries: (inquiries || []) as InquiryRow[], limits: limitsOf(p as Profile, (await getSettings()).limits) };
}

/* ───────── 대시보드 */
export async function dashboard() {
  if (!adminReady()) {
    const d = demo();
    return summarize((await getSettings()).budgetKrw, true, d.members, d.usage, d.members.reduce((a, m) => a + m.works, 0), d.members.filter((m) => m.last_seen_at && Date.parse(m.last_seen_at) > Date.now() - 7 * 864e5).length, 2);
  }
  const sb = supabaseAdmin();
  const [{ data: members }, { data: usage }, { count: works }, { data: active }, { count: openQ }] = await Promise.all([
    sb.from('profiles').select('*').order('created_at', { ascending: false }).limit(5000),
    sb.from('ai_usage').select('user_id,kind,units,cost_krw,model,created_at,ok').gte('created_at', daysAgo(31)).limit(100000),
    sb.from('projects').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    sb.from('projects').select('owner_id').gte('updated_at', daysAgo(7)).is('deleted_at', null),
    sb.from('inquiries').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  const act = new Set((active || []).map((x) => x.owner_id)).size;
  return summarize((await getSettings()).budgetKrw, false, (members || []) as MemberRow[], (usage || []) as UsageRow[], works || 0, act, openQ || 0);
}

function summarize(budget: number, demoFlag: boolean, members: MemberRow[] | Profile[], usage: UsageRow[], works: number, activeMakers: number, openInquiries: number) {
  const ms = monthStart(), w7 = daysAgo(7);
  const month = usage.filter((u) => u.created_at >= ms && u.ok);
  const days = Array.from({ length: 14 }, (_, i) => day(daysAgo(13 - i)));
  const byDay = days.map((d) => ({
    d,
    signups: members.filter((m) => day(m.created_at) === d).length,
    cost: usage.filter((u) => day(u.created_at) === d).reduce((a, u) => a + +u.cost_krw, 0),
    images: usage.filter((u) => day(u.created_at) === d && u.kind === 'image').reduce((a, u) => a + u.units, 0),
    texts: usage.filter((u) => day(u.created_at) === d && u.kind === 'text').reduce((a, u) => a + u.units, 0),
  }));
  const perUser = new Map<string, { text: number; image: number; cost: number }>();
  month.forEach((u) => { const x = perUser.get(u.user_id) || { text: 0, image: 0, cost: 0 }; x[u.kind] += u.units; x.cost += +u.cost_krw; perUser.set(u.user_id, x); });
  const top = [...perUser.entries()].sort((a, b) => b[1].cost - a[1].cost).slice(0, 6).map(([id, v]) => ({ member: members.find((m) => m.id === id), ...v }));
  const byModel = new Map<string, { units: number; cost: number }>();
  month.forEach((u) => { const k = u.model || u.kind; const x = byModel.get(k) || { units: 0, cost: 0 }; x.units += u.units; x.cost += +u.cost_krw; byModel.set(k, x); });
  return {
    demo: demoFlag,
    total: members.length,
    new7: members.filter((m) => m.created_at >= w7).length,
    activeMakers, works, openInquiries,
    proNotify: members.filter((m) => m.pro_notify).length,
    monthCost: month.reduce((a, u) => a + +u.cost_krw, 0),
    monthImages: month.filter((u) => u.kind === 'image').reduce((a, u) => a + u.units, 0),
    monthTexts: month.filter((u) => u.kind === 'text').reduce((a, u) => a + u.units, 0),
    budget,
    byDay, top, byModel: [...byModel.entries()].map(([model, v]) => ({ model, ...v })),
    recent: members.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 6),
    sources: Object.entries(members.reduce<Record<string, number>>((a, m) => { const k = ('signup_source' in m && m.signup_source) || '직접 · 알 수 없음'; a[k] = (a[k] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]),
  };
}

/* ───────── 작품 · 문의 */
export type ProjectRow = { id: string; title: string; episodes: number; cuts: number; size_bytes: number; updated_at: string; deleted_at: string | null; owner_id: string; owner?: { name: string | null; email: string | null } };
export async function listProjects(o: { q?: string; deleted?: boolean }) {
  if (!adminReady()) return { demo: true, rows: [] as ProjectRow[] };
  const sb = supabaseAdmin();
  let q = sb.from('projects').select('id,title,episodes,cuts,size_bytes,updated_at,deleted_at,owner_id,owner:profiles(name,email)').order('updated_at', { ascending: false }).limit(200);
  q = o.deleted ? q.not('deleted_at', 'is', null) : q.is('deleted_at', null);
  if (o.q) q = q.ilike('title', `%${o.q.replace(/[%,()]/g, '')}%`);
  const { data } = await q;
  return { demo: false, rows: (data || []) as unknown as ProjectRow[] };
}

export type InquiryRow = { id: number; user_id: string | null; email: string | null; subject: string; body: string; status: string; answer: string | null; answered_at: string | null; created_at: string };
export async function listInquiries(status?: string) {
  if (!adminReady()) return { demo: true, rows: [{ id: 1, user_id: 'demo-1', email: 'minwoo@example.com', subject: 'AI 이미지를 더 만들 수 없나요?', body: '맛보기 10장을 다 썼는데 더 쓰고 싶어요.', status: 'open', answer: null, answered_at: null, created_at: daysAgo(0.1) }] as InquiryRow[] };
  const sb = supabaseAdmin();
  let q = sb.from('inquiries').select('*').order('created_at', { ascending: false }).limit(200);
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return { demo: false, rows: (data || []) as InquiryRow[] };
}

export async function aiReport() {
  const d = await dashboard();
  return d;
}

/* ───────── 유입경로 — 가입 → 작품 저장 → AI 사용 → 다시 방문 → 프로 알림 */
export async function acquisition(days = 30) {
  type M = { id: string; created_at: string; last_seen_at: string | null; signup_source: string | null; pro_notify: boolean };
  let members: M[], makers: Set<string>, aiUsers: Set<string>, demoFlag = false;
  const since = daysAgo(days);
  if (!adminReady()) {
    const d = demo();
    members = d.members; makers = new Set(d.members.filter((m) => m.works > 0).map((m) => m.id)); aiUsers = new Set(d.usage.map((u) => u.user_id)); demoFlag = true;
  } else {
    const sb = supabaseAdmin();
    const { data } = await sb.from('profiles').select('id,created_at,last_seen_at,signup_source,pro_notify').gte('created_at', since).limit(20000);
    members = (data || []) as M[];
    const ids = members.map((m) => m.id);
    const [{ data: pj }, { data: au }] = ids.length
      ? await Promise.all([sb.from('projects').select('owner_id').in('owner_id', ids.slice(0, 1000)), sb.from('ai_usage').select('user_id').in('user_id', ids.slice(0, 1000)).limit(50000)])
      : [{ data: [] }, { data: [] }];
    makers = new Set((pj || []).map((x) => x.owner_id)); aiUsers = new Set((au || []).map((x) => x.user_id));
  }
  const back = (m: M) => !!m.last_seen_at && Date.parse(m.last_seen_at) - Date.parse(m.created_at) > 864e5;
  const steps = (L: M[]) => [L.length, L.filter((m) => makers.has(m.id)).length, L.filter((m) => aiUsers.has(m.id)).length, L.filter(back).length, L.filter((m) => m.pro_notify).length];
  const groups = new Map<string, M[]>();
  members.forEach((m) => { const k = m.signup_source || '직접 · 알 수 없음'; groups.set(k, [...(groups.get(k) || []), m]); });
  return {
    demo: demoFlag, days,
    funnel: steps(members),
    labels: ['가입', '작품 저장', 'AI 사용', '다음 날 이후 재방문', '프로 알림 신청'],
    channels: [...groups.entries()].map(([k, L]) => ({ source: k, s: steps(L) })).sort((a, b) => b.s[0] - a.s[0]),
  };
}

/* ───────── 요금제 */
export async function plans() {
  if (!adminReady()) {
    const m = demo().members;
    return { demo: true, counts: { free: m.filter((x) => x.plan === 'free').length, pro: m.filter((x) => x.plan === 'pro').length, edu: m.filter((x) => x.plan === 'edu').length }, notify: m.filter((x) => x.pro_notify).map((x) => ({ id: x.id, name: x.name, email: x.email, created_at: x.created_at })) };
  }
  const sb = supabaseAdmin();
  const c = async (plan: string) => (await sb.from('profiles').select('id', { count: 'exact', head: true }).eq('plan', plan)).count || 0;
  const [free, pro, edu, { data: notify }] = await Promise.all([c('free'), c('pro'), c('edu'), sb.from('profiles').select('id,name,email,created_at').eq('pro_notify', true).order('created_at', { ascending: false }).limit(1000)]);
  return { demo: false, counts: { free, pro, edu }, notify: (notify || []) as { id: string; name: string | null; email: string | null; created_at: string }[] };
}

export async function admins() {
  if (!adminReady()) return [{ id: 'local', name: '로컬 작가', email: 'local@webtoonboard.dev', last_seen_at: null as string | null }];
  const { data } = await supabaseAdmin().from('profiles').select('id,name,email,last_seen_at').eq('role', 'admin').limit(50);
  return (data || []) as { id: string; name: string | null; email: string | null; last_seen_at: string | null }[];
}
