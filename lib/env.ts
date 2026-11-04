/** 환경 변수 — 비어 있으면 "로컬 시연 모드"로 돌아가요 (DB 연동 전 개발용) */
const n = (v: string | undefined, d: number) => (v && !isNaN(+v) ? +v : d);

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5',
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
  geminiModelPro: process.env.GEMINI_IMAGE_MODEL_PRO || 'gemini-3-pro-image-preview',
  limits: {
    freeText: n(process.env.FREE_TEXT_PER_MONTH, 30),
    freeImage: n(process.env.FREE_IMAGE_TOTAL, 10),
    proText: n(process.env.PRO_TEXT_PER_MONTH, 1000),
    proImage: n(process.env.PRO_IMAGE_PER_MONTH, 300),
  },
  budgetKrw: n(process.env.AI_MONTHLY_BUDGET_KRW, 500000),
  cost: {
    text: n(process.env.COST_TEXT_KRW, 15),
    image: n(process.env.COST_IMAGE_KRW, 55),
    imagePro: n(process.env.COST_IMAGE_PRO_KRW, 180),
  },
};

/** Supabase 키가 다 있으면 true — 없으면 로그인 없이 브라우저 저장으로 동작 */
export const dbReady = () => !!(env.supabaseUrl && env.supabaseAnon);
export const adminReady = () => dbReady() && !!env.serviceRole;
