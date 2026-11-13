# 연재관 모듈 (`/read`)

나중에 별도 사이트(예: `read.iux.kr`)나 별도 저장소로 떼어 낼 수 있게 묶어 둔 부분이에요.

## 이 모듈에 속한 것
| 위치 | 내용 |
|---|---|
| `lib/read/` | 데이터(`store.ts`), 그림 주소(`images.ts`), 설정(`config.ts`), 타입, 예시 데이터 |
| `app/read/` | 화면(홈 · 요일연재 · 자유연재 · 랭킹 · 작품 · 뷰어 · 연재하기)과 `app/read/api/*` 연결 통로 |
| `app/admin/read/` | 관리자 › 연재관 (신고 · 요일연재 심사 · 숨김) |
| `supabase/migrations/0003_read.sql` | `read_` 로 시작하는 테이블 |

## 바깥과 닿는 곳 (떼어 낼 때 바꿔 끼울 곳)
- `lib/auth.ts` 의 `getMe()` — 로그인한 회원 (id · 이름 · 관리자 여부)
- `lib/supabase/server.ts` 의 `supabaseAdmin()` — DB
- `lib/env.ts` — 키 · 버킷 이름
- 편집기는 연재관 코드를 직접 부르지 않아요. `public/studio-assets/bridge.js` 가
  `POST /read/api/drafts` → 그림 PUT → `POST /read/api/drafts/{id}` 로만 이야기해요.

DB에서도 연재관 테이블은 편집기 테이블(projects · assets …)을 참조하지 않고, 회원 id(auth.users)로만 이어져요.
