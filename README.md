# 웹툰보드 (IUX Webtoon)

기획부터 콘티 · AI 이미지 · 말풍선까지, 웹툰 한 화를 한 곳에서 만드는 편집기.

- **스택**: Next.js 15 (App Router) · Supabase (Auth · Postgres · Storage) · Vercel
- **AI**: 글 — Claude API / 이미지 — Gemini API (나노바나나)

## 구조

```
app/
  page.tsx                 첫 화면
  login/                   로그인 · 가입 (이메일 · 메일 링크 · 카카오 · Google)
  auth/callback|signout    로그인 후 돌아오기 · 로그아웃
  studio/route.ts          편집기 — editor/studio.html에 회원 · 한도 정보를 심어서 보내요
  account/                 내 계정 · AI 사용량 · 문의
  admin/                   관리자 (대시보드 · 회원관리 · AI 사용/비용 · 작품 · 문의)
  api/
    me                     내 정보 · 접속 시각
    projects/[id]          작품 목록 · 본문(서명 URL) · 저장 · 삭제
    projects/[id]/upload   작품 본문 올릴 서명 URL
    assets/sign|[key]      그림 올리기 · 받기 (서명 URL)
    ai/text                글 AI (Claude) — 서버에서 한도 확인 · 사용 기록
    ai/image               이미지 AI (Gemini) — 참고 그림 최대 3장
    inquiries              문의 보내기
lib/                       env · 인증 · 한도 · AI · 관리자 데이터
public/studio-assets/bridge.js   편집기 ↔ 서버 브리지 (클라우드 저장 · AI · 계정)
prototype/studio.html      편집기 원본 (아티팩트에서 다듬은 단일 HTML)
prototype/admin.html       관리자 화면 시안
scripts/build-studio.mjs   prototype/studio.html → editor/studio.html (브리지 연결 패치)
supabase/migrations/       DB 스키마 · RLS · Storage 정책
```

### 편집기는 어떻게 붙어 있나요
편집기(약 1.5MB 단일 HTML)는 기능이 많아 1차에서는 **코드를 그대로 두고** 저장 · 회원 · AI가 닿는 20여 곳만 `scripts/build-studio.mjs`가 패치해요. 패치가 원본과 맞지 않으면 빌드가 멈추고 어느 곳인지 알려 줘요. 편집기를 고칠 때는 `prototype/studio.html`을 고치면 돼요.

- **저장**: 브라우저(IndexedDB)에 먼저 저장 → 작품 목록이 바뀌면 바뀐 작품만 Supabase Storage로 올려요. 다른 기기에서 열면 더 최근 것을 받아와요. 그림은 한 번만 올리고, 없으면 그때 받아요.
- **회원별 분리**: 브라우저 DB 이름에 회원 id를 붙여 같은 PC에서 다른 계정과 섞이지 않아요.
- **AI 한도**: 서버(`/api/ai/*`)에서 확인 · 기록해요. 편집기의 남은 횟수 표시도 서버 값을 따라요. 관리자는 한도 없음.
- **용량**: 작품 본문 · 그림은 브라우저가 Storage로 바로 올려요(Vercel 요청 크기 제한 4.5MB 피하기).

## 로컬에서 실행

```bash
npm install
cp .env.example .env.local   # 비워 둬도 돼요
npm run dev                  # http://localhost:3000
npm test                     # 한도 · AI 엔진 · 편집기 패치 테스트
```

**DB 연동 전(로컬 시연 모드)**: `.env.local`에 Supabase 키가 없으면 로그인 없이 동작해요. 작품은 브라우저에만 저장되고, 관리자 화면은 예시 데이터로 보여요. AI 키(ANTHROPIC_API_KEY · GEMINI_API_KEY)만 넣으면 AI는 실제로 써 볼 수 있어요.

## DB 연동 (Supabase)

1. Supabase에서 새 프로젝트를 만들어요 (리전: Seoul 권장).
2. SQL Editor에 `supabase/migrations/0001_init.sql` → `0002_settings_notices.sql` 순서로 붙여 넣고 실행해요.
3. Authentication → Providers
   - Email: 켜기 (메일 인증 사용 여부 선택)
   - Kakao · Google: 각 개발자 콘솔에서 앱을 만들고 Client ID · Secret 입력
   - Redirect URL: `https://<사이트>/auth/callback`
4. Authentication → URL Configuration → Site URL / Redirect URLs에 사이트 주소 추가
5. `.env.local`(로컬) · Vercel 환경 변수에 키를 넣어요 → `.env.example` 참고
   - `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 써요 (관리자 화면 · 사용량 기록)
6. `ADMIN_EMAILS`의 이메일로 가입하면 관리자로 들어가요. 관리자 화면에서 다른 회원에게 관리자 권한을 줄 수도 있어요.

## 배포 (Vercel)

- Framework: Next.js · Build command: `npm run build` (편집기 HTML을 먼저 만들어요)
- 환경 변수: `.env.example`의 항목 전부
- `GEMINI_IMAGE_MODEL` · `GEMINI_IMAGE_MODEL_PRO` · `CLAUDE_MODEL`은 쓰는 계정에서 열려 있는 모델 이름으로 확인해 주세요.

## 선택 연결

- **OpenAI** — `OPENAI_API_KEY`를 넣으면 관리자 › 설정에서 글 · 이미지 엔진을 OpenAI로 바꿀 수 있어요 (기본은 Claude + 나노바나나).
- **Cloudflare R2** — `R2_*`를 넣으면 작품 · 그림 파일을 Supabase Storage 대신 R2에 저장해요. R2 버킷 CORS에 사이트 주소의 `PUT` · `GET`을 허용해 주세요.
- **메일 (Resend)** — `RESEND_API_KEY` · `MAIL_FROM`을 넣으면 새 문의가 관리자에게, 답변이 회원에게 메일로 가요. 없으면 화면에서만 보여요.

## 관리자 화면

대시보드 · 유입경로(퍼널 · 채널 · 캠페인 링크) · 회원관리 · AI 사용·비용 · 작품 · 요금제(프로 알림 신청 CSV) · 문의 · 공지 · 설정.
공지는 작업실 위쪽 띠와 첫 화면에 보이고, 설정(엔진 · 한도 · 월 예산 · 단가)은 30초 안에 서비스에 반영돼요.

## 한도 · 비용 (관리자 › 설정에서 조정 · 처음 값은 환경 변수)

| 항목 | 무료 | 프로 · 교육 |
|---|---|---|
| 글 AI | 매달 30회 | 매달 1,000회 |
| AI 이미지 | 가입 선물 10장 (누적) | 매달 300장 |

회원별 추가 이미지는 관리자 › 회원 상세에서 줄 수 있어요. 비용 통계는 단가 × 사용량으로 계산하고, 월 예산을 넘으면 회원 AI를 멈춰요(관리자는 계속 사용).

## 다음 단계

- 편집기를 React 컴포넌트로 단계적으로 옮기기 (기획 · 콘티·AI 팝업부터)
- 결제(프로 요금제)
- 작품 공유 링크 · 팀 작업
