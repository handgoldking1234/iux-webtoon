# 바로웹툰 (iux-webtoon) — 작업 안내서

## 한 줄 요약
기획·콘티·AI 이미지·말풍선까지 웹툰 한 화를 한곳에서 만드는 편집기.

- 주소: https://webtoon.iux.kr (예전 toon.iux.kr은 여기로 넘어와요)

## 구조 (중요)
- `main` 하나로 합침 (예전 `main` 단일 HTML + `dev` 실서비스 → 2026-11 통합). `main` = webtoon.iux.kr 배포 (Vercel 프로젝트 `iux-webtoon`).
- Next.js 15 + Supabase(Auth·Postgres·Storage) + Vercel. 글 AI = Claude API, 이미지 AI = Gemini(나노바나나).
- 편집기 원본은 `prototype/studio.html` 한 곳. `scripts/build-studio.mjs`가 저장·회원·AI 연결 부분을 패치해 `/studio`로 내보낸다. 편집기를 고칠 때는 이 파일만 고친다.
- AI 키(`ANTHROPIC_API_KEY`·`GEMINI_API_KEY`)와 접근 규칙(`AI_ACCESS`·`TEST_ACCOUNTS`·`SITE_PASSWORD`)은 Vercel 환경 변수. 자세한 건 README.md.
- 회원: Supabase `iux-cloud`의 `webtoon` 구역(테이블 15개, 버킷 `webtoon`·`webtoon-read`). 로그인은 구글·카카오·네이버(코드에서 늘 켜 둠, 이메일은 `AUTH_PROVIDERS=email`로 추가, 네이버는 Supabase 사용자 지정 제공자 `custom:naver`) — 카카오·네이버 앱은 내니요와 같이 쓰고, 구글은 Google Cloud 프로젝트 `IUX Login`의 OAuth 클라이언트 "Supabase iux-cloud"를 내니요와 같이 써요. 관리자 = `ADMIN_EMAILS`(handgoldking@gmail.com).
- 방침 페이지: `/privacy` · `/terms` (app/privacy · app/terms).

## 확정된 결정
| 항목 | 결정 |
|---|---|
| 이름 | 바로웹툰 (웹툰 컷 편집실 → 웹툰컷 → 웹툰보드 → 바로웹툰, 2026-11-24) · 한 줄 소개 "AI로 바로 만드는 나만의 웹툰" · 주소는 webtoon.iux.kr 유지 |
| 출시 | 우선 무료 오픈, 반응 보고 결제 연결 |
| AI 이미지 | 맛보기만 — 가입 시 10장 · 글 AI 매달 8회 (2026-11-25) · 기본 그림 모델 나노바나나 2 · 1K, Pro는 직접 고르면 (2026-11-26) |
| DB | Supabase `iux-cloud`에 `webtoon` 구역으로 얹음 (2026-11 연결, 바꿀 때는 묻고 진행) |
| 시놉 | `iux-synop`(시놉)을 기획 부분에 통합 — 기획은 팝업 |
| 저장 | 브라우저(IndexedDB·localStorage) 먼저, dev에서는 바뀐 작품만 Storage로 |
| 테스트 모드 | `AI_TEST=true`면 작품 열 때마다 AI 횟수 초기화 → **출시 때 false** |

## 파일
```
app/                       화면·API (studio · login · account · admin · read · api/ai/*)
lib/                       인증 · 한도 · AI · 저장 · 연재관(lib/read)
prototype/studio.html      편집기 원본 (작품 기획·콘티·AI·라이브러리·컷 편집·내보내기)
prototype/admin.html       관리자 시안 (참고용)
prototype/read.html        연재관 시안 (참고용 — 실제 화면은 app/read)
scripts/build-studio.mjs   편집기 → /studio 패치
supabase/migrations/       DB 스키마 (0001 → 0002 → 0003 순서)
docs/style-prompts.md      그림체 예시 이미지용 나노바나나 프롬프트
```
- localStorage 키: `wca-theme`, `wcs-*` / 주요 함수: `plan*`(기획 패널), `balloonGeo`·`fitBalloon`(말풍선), `drawSb`(콘티), `paywall`·`aiTestReset`

## 남은 작업 (다음 작업을 시작할 때 사용자에게 먼저 알려 주기)
1. **[급함] 새 회원은 작품 목록이 서버에 저장 안 됨 → 막기** (2026-11-24 발견)
   - 원인: Vercel에 `SUPABASE_SERVICE_ROLE_KEY`가 없어서 `webtoon.profiles` 행이 안 생김 → `projects` 저장이 막힘(owner_id가 profiles를 가리킴). 파일(Storage `webtoon` 버킷)은 올라감.
   - 2026-11-24 처리: 기존 두 계정(handgoldking@gmail.com 관리자, 카카오·네이버 계정)의 profiles 행과 작품 8개의 projects 행을 Storage 파일로 되살림(제목은 '되살린 작품', 편집기가 파일 안 제목으로 바꿔 보여 줌). 이 두 계정은 이제 정상 저장됨.
   - 남은 일: 새로 가입하는 회원도 저장되게 — 서비스 키 넣기(3번) 또는 본인 프로필을 직접 만들 수 있는 DB 규칙 추가. Supabase 쓰기라 사용자 확인 후 진행.
2. **그림 저장소를 Cloudflare R2로 옮기기 (출시 전)**
   - 이유: Supabase 무료 한도(파일 1GB · 전송 월 5GB)가 그림 약 1,200장이면 참. R2는 10GB 무료, 전송 요금 없음.
   - 사용자 할 일: Cloudflare 가입 · R2 보관함 만들기 · 접근 키를 Vercel에 넣기. 그다음 저장 위치 변경과 기존 그림 옮기기는 Claude가.
3. **Vercel `SUPABASE_SERVICE_ROLE_KEY` 넣기** (사용자) — 넣으면 다시 배포하고 프로필 · 사용 기록 저장 확인.
4. **화면 눈으로 확인** — 첫 화면 "따로 고치기" 구역, 컷 목록 제목 · 줄 나눔, 휴대폰 스크롤 고침을 PC · 390px로 확인 (크롬 연결 필요).

## 확인
`npm install && npm run dev`(http://localhost:3000), `npm test`. `prototype/studio.html`만 브라우저로 열면 AI는 예시 결과로 채워진다.

---

## 공통 작업 원칙 (IUX 프로젝트 전체)
- **언어:** 화면 문구·문서·커밋 메시지는 한국어. 쉬운 말, 기술 용어 최소화.
- **퍼블리싱 시안:** 순수 HTML/CSS + 간단한 스크립트만 넣는다. 서버·DB 연동 코드는 개발 단계에서 따로 붙인다.
- **아이콘:** Lucide. 디자인 시스템을 따로 정하지 않았으면 스포티파이 스타일(다크/화이트 + 포인트 컬러)을 기본으로 쓴다.
- **배포:** GitHub `main` → Vercel 자동 배포. 도메인은 가비아 `iux.kr`의 서브도메인(`*.iux.kr` CNAME → Vercel)을 쓴다.
- **DB:** Supabase 무료 플랜은 활성 프로젝트 2개까지라, 새 프로젝트를 만들지 말고 기존 `iux-cloud`(studio) 프로젝트에 테이블을 얹는 것을 먼저 검토한다.
- **비밀값:** 공개 저장소다. 서비스 키·AI 키·비밀번호는 절대 커밋하지 않는다. 키는 Vercel 환경 변수나 Supabase secrets에 둔다. Supabase anon(public) 키만 코드에 넣을 수 있다.
- **확인:** 고친 뒤에는 브라우저 콘솔 오류 0개, 모바일(390px)과 PC 화면을 눈으로 확인하고 나서 완료라고 한다.
- **브랜치:** `main`은 배포 중인 상태. 큰 작업이나 검증 전 작업은 브랜치(`wip/…`, `claude/…`)에 올리고, `main`을 강제 푸시(-f)로 덮어쓰지 않는다.
- **전체 프로젝트 목록:** https://github.com/handgoldking1234/iux-app/blob/main/docs/PROJECTS.md
