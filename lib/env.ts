/** 환경 변수 — 비어 있으면 "로컬 시연 모드"로 돌아가요 (DB 연동 전 개발용) */
const n = (v: string | undefined, d: number) => (v && !isNaN(+v) ? +v : d);

export const env = {
  supabaseUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
  supabaseAnon: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
  serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  /** 바로웹툰 테이블이 사는 DB 구역 — 공용 Supabase(iux-cloud)에 얹어도 다른 서비스와 안 섞이게 */
  dbSchema: process.env.NEXT_PUBLIC_SUPABASE_DB_SCHEMA || 'webtoon',
  /** Supabase Storage 버킷: 작품 원본(비공개) · 연재 그림(공개) */
  bucket: process.env.SUPABASE_BUCKET || 'webtoon',
  readBucket: process.env.SUPABASE_READ_BUCKET || 'webtoon-read',
  /** 로그인 화면에 보일 방식 (쉼표로) — google · kakao · email. Supabase에서 켠 것만 넣어요 */
  // 구글·카카오·네이버·이메일은 Supabase iux-cloud에 연결돼 늘 켜 둔다.
  authProviders: ['google', 'kakao', 'naver', 'email'].filter((p) => ['google', 'kakao', 'naver', 'email'].includes(p) || (process.env.AUTH_PROVIDERS || '').split(',').map((s) => s.trim().toLowerCase()).includes(p)),
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  anthropicKey: (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim(),
  // 글 AI: 스토리 · 콘티 · 대사처럼 '글맛'이 중요한 일은 Opus, 그림 프롬프트 만들기는 Sonnet (반값)
  claudeModel: process.env.CLAUDE_MODEL || 'claude-opus-5-5',
  claudeModelPrompt: process.env.CLAUDE_MODEL_PROMPT || 'claude-sonnet-5-5',
  // 이름을 다르게 넣는 경우가 많아서 흔한 이름도 같이 읽어요
  geminiKey: (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_KEY || '').trim(),
  geminiModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-nano-banana-2.1',
  geminiModelPro: process.env.GEMINI_IMAGE_MODEL_PRO || 'gemini-3-pro-image',
  openaiKey: process.env.OPENAI_API_KEY || '',
  openaiTextModel: process.env.OPENAI_TEXT_MODEL || 'gpt-5',
  openaiImageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2',
  textEngine: (process.env.AI_TEXT_ENGINE === 'openai' ? 'openai' : 'claude') as 'claude' | 'openai',
  imageEngine: (process.env.AI_IMAGE_ENGINE === 'openai' ? 'openai' : 'gemini') as 'gemini' | 'openai',
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKey: process.env.R2_ACCESS_KEY_ID || '',
    secret: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || '',
    /** 연재 그림을 바로 보여 줄 공개 주소 (R2 공개 버킷 · 커스텀 도메인), 예: https://img.webtoon.iux.kr */
    /** 연재 그림 전용 공개 버킷 (작품 원본 버킷과 따로) */
    readBucket: process.env.R2_READ_BUCKET || '',
    publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''),
  },
  resendKey: process.env.RESEND_API_KEY || '',
  mailFrom: process.env.MAIL_FROM || '',
  limits: {
    freeText: n(process.env.FREE_TEXT_PER_MONTH, 8),
    freeImage: n(process.env.FREE_IMAGE_TOTAL, 10),
    proText: n(process.env.PRO_TEXT_PER_MONTH, 1000),
    proImage: n(process.env.PRO_IMAGE_PER_MONTH, 300),
  },
  budgetKrw: n(process.env.AI_MONTHLY_BUDGET_KRW, 500000),
  cost: {
    text: n(process.env.COST_TEXT_KRW, 80), // 글 AI 1회 어림값: Opus 5.5 · 입력 3~4천 + 출력 2~3천 토큰 ≈ $0.06 (실제 기록은 토큰으로 계산)
    image: n(process.env.COST_IMAGE_KRW, 45), // 나노바나나 2.1 · 1K 한 장 ($0.0336)
    imagePro: n(process.env.COST_IMAGE_PRO_KRW, 180), // 나노바나나 Pro · 1K~2K 한 장 ($0.134)
  },
};

/** Supabase 키가 다 있으면 true — 없으면 로그인 없이 브라우저 저장으로 동작 */
export const dbReady = () => !!(env.supabaseAnon && /^https?:\/\/[^\s]+\.[^\s]+$/.test(env.supabaseUrl));
export const adminReady = () => dbReady() && !!env.serviceRole;
