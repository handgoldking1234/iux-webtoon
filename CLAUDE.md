# 웹툰보드 (iux-webtoon) — 작업 안내서

## 한 줄 요약
기획·콘티·AI 이미지·말풍선까지 웹툰 한 화를 한곳에서 만드는 편집기.

- 주소: https://toon.iux.kr

## 브랜치 구조 (중요)
| 브랜치 | 내용 |
|---|---|
| `main` | 단일 HTML 프로토타입: `index.html`(편집기 v2, 약 1.6MB) + `admin/index.html`(관리자 시안) |
| `dev` | 실서비스: Next.js 15 + Supabase(Auth·Postgres·Storage) + Vercel. 글 AI = Claude API, 이미지 AI = Gemini(나노바나나). 편집기는 `prototype/studio.html`을 `scripts/build-studio.mjs`가 패치해 씀 |
- 편집기 기능을 고치면 main의 `index.html`과 dev의 `prototype/studio.html`을 함께 맞춘다.

## 확정된 결정
| 항목 | 결정 |
|---|---|
| 이름 | 웹툰보드 (웹툰 컷 편집실 → 웹툰컷 → 웹툰보드) |
| 출시 | 우선 무료 오픈, 반응 보고 결제 연결 |
| AI 이미지 | 맛보기만 — 가입 시 10장 |
| DB | Supabase 구성은 사용자가 직접 정의 (DB 연동은 묻고 진행) |
| 시놉 | `iux-synop`(시놉)을 기획 부분에 통합 — 기획은 팝업 |
| 저장 | 브라우저(IndexedDB·localStorage) 먼저, dev에서는 바뀐 작품만 Storage로 |
| 테스트 모드 | `AI_TEST=true`면 작품 열 때마다 AI 횟수 초기화 → **출시 때 false** |

## 파일 (main)
```
index.html             편집기 (작품 기획·콘티·AI·라이브러리·컷 편집·내보내기)
admin/index.html       관리자 시안 (대시보드·유입경로·회원·통계·요금제·운영·설정)
docs/style-prompts.md  그림체 예시 이미지용 나노바나나 프롬프트
```
- localStorage 키: `wca-theme`, `wcs-*` / 주요 함수: `plan*`(기획 패널), `balloonGeo`·`fitBalloon`(말풍선), `drawSb`(콘티), `paywall`·`aiTestReset`

## 확인
`index.html`을 브라우저로 열기 (AI는 Claude 아티팩트 안에서만 실제 동작, 밖에서는 예시 결과). dev는 `npm install && npm run dev`, `npm test`.

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
