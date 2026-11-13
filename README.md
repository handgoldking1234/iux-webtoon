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
  admin/                   관리자 (대시보드 · 회원관리 · AI 사용/비용 · 작품 · 연재관 · 문의)
  read/                    연재관 /read (홈 · 요일연재 · 자유연재 · 랭킹 · 작품 · 뷰어 · 연재하기 · 운영정책)
  read/api/                연재관 연결 통로 (관심 · 별점 · 댓글 · 신고 · 조회 · 연재하기 초안 · 공개)
  api/
    me                     내 정보 · 접속 시각
    projects/[id]          작품 목록 · 본문(서명 URL) · 저장 · 삭제
    projects/[id]/upload   작품 본문 올릴 서명 URL
    assets/sign|[key]      그림 올리기 · 받기 (서명 URL)
    ai/text                글 AI (Claude) — 서버에서 한도 확인 · 사용 기록
    ai/image               이미지 AI (Gemini) — 참고 그림 최대 3장
    inquiries              문의 보내기
lib/                       env · 인증 · 한도 · AI · 관리자 데이터
lib/read/                  연재관 모듈 — 떼어 낼 때의 경계는 lib/read/README.md
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

## AI만 먼저 시험하기 (회원 · DB 없이)

1. Vercel에서 이 저장소로 **새 프로젝트**를 만들고 Production Branch를 `dev`로 해요 (toon.iux.kr 프로젝트와 따로).
2. 환경 변수: `SITE_PASSWORD`(사이트 잠금) · `ANTHROPIC_API_KEY` · `GEMINI_API_KEY` · (선택) `CLAUDE_MODEL` · `GEMINI_IMAGE_MODEL`
3. 배포 주소로 들어가 비밀번호를 넣으면 로그인 없이 편집기(`/studio`) · 관리자(`/admin`)가 열려요.
4. **관리자 › 설정 › AI 연결 시험**에서 글 1번 · 그림 1장을 불러 키 · 모델 이름을 확인해요. 그다음 편집기에서 기획 AI · 콘티 · 이미지 만들기를 써 봐요.
5. Anthropic 콘솔 · Google AI Studio(또는 Cloud 결제)에 **월 지출 한도**를 꼭 걸어 두세요.

이 모드는 들어온 사람을 모두 관리자로 봐요(한도 없음). 그래서 `SITE_PASSWORD` 없이 공개하면 안 돼요.

## DB 연동 (Supabase)

1. Supabase 프로젝트를 정해요 (리전: Seoul 권장). 새 프로젝트도, 여러 서비스가 함께 쓰는 프로젝트(iux-cloud)도 돼요.
   웹툰보드 테이블은 모두 `webtoon` 구역(스키마)에, 버킷은 `webtoon` · `webtoon-read`로 만들어져서 다른 서비스와 섞이지 않아요.
2. SQL Editor에 `supabase/migrations/0001_init.sql` → `0002_settings_notices.sql` → `0003_read.sql` 순서로 붙여 넣고 실행해요.
3. **Project Settings → API → Exposed schemas**에 `webtoon`을 추가해요. (빠뜨리면 "schema must be one of …" 오류가 나요)
4. Authentication → Providers
   - Email: 켜기 (메일 인증 사용 여부 선택)
   - Kakao · Google: 각 개발자 콘솔에서 앱을 만들고 Client ID · Secret 입력
   - Redirect URL: `https://<사이트>/auth/callback`
5. Authentication → URL Configuration → Site URL / Redirect URLs에 사이트 주소 추가
6. `.env.local`(로컬) · Vercel 환경 변수에 키를 넣어요 → `.env.example` 참고
   - `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 써요 (관리자 화면 · 사용량 기록)
7. `ADMIN_EMAILS`의 이메일로 가입하면 관리자로 들어가요. 관리자 화면에서 다른 회원에게 관리자 권한을 줄 수도 있어요.

## 배포 (Vercel)

- Framework: Next.js · Build command: `npm run build` (편집기 HTML을 먼저 만들어요)
- 환경 변수: `.env.example`의 항목 전부
- `GEMINI_IMAGE_MODEL` · `GEMINI_IMAGE_MODEL_PRO` · `CLAUDE_MODEL`은 쓰는 계정에서 열려 있는 모델 이름으로 확인해 주세요.

## 선택 연결

- **OpenAI** — `OPENAI_API_KEY`를 넣으면 관리자 › 설정에서 글 · 이미지 엔진을 OpenAI로 바꿀 수 있어요 (기본은 Claude + 나노바나나).
- **Cloudflare R2** — `R2_*`를 넣으면 작품 · 그림 파일을 Supabase Storage 대신 R2에 저장해요. R2 버킷 CORS에 사이트 주소의 `PUT` · `GET`을 허용해 주세요.
- **메일 (Resend)** — `RESEND_API_KEY` · `MAIL_FROM`을 넣으면 새 문의가 관리자에게, 답변이 회원에게 메일로 가요. 없으면 화면에서만 보여요.

## 연재관 (/read)

- 독자: 요일연재 · 자유연재 · 랭킹 · 작품 페이지 · 세로 뷰어 · 별점 · 댓글 · 관심 · 신고 (읽기는 로그인 없이, 반응은 로그인해서)
- 작가: 편집기 아래 막대의 **「연재하기」** → 컷을 가로 690px로 만들어 연재 그림 저장소에 바로 올리고 → `/read/publish`에서 작품 정보 · 공개 설정을 정해 공개
- 관리자 › 연재관: 신고 처리(숨김), 요일연재 신청 승인(요일 지정) · 반려, 숨긴 작품
- 그림 저장소: 기본은 Supabase 공개 버킷 `webtoon-read`. 독자가 늘면 `R2_READ_BUCKET` + `R2_PUBLIC_URL`(R2 공개 버킷 · 커스텀 도메인)로 바꿔요 — R2는 다운로드(전송료)가 무료예요.
- 떼어 내기: `lib/read/README.md` — 편집기는 `/read/api/*`로만 연재관과 이야기해요.

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
