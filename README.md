# 웹툰보드 (IUX Webtoon)

웹툰 컷 편집기 · 기획 · 콘티·AI 작업실 — 단일 HTML 프로토타입

## 파일
| 경로 | 내용 |
|---|---|
| `index.html` | 웹툰보드 편집기 (작품 기획 · 콘티·AI · 라이브러리 · 컷 편집 · 내보내기) |
| `admin/index.html` | 관리자 페이지 프로토타입 (대시보드 · 유입경로 · 회원 · 통계 · 요금제 · 운영 · 설정) |
| `docs/style-prompts.md` | 그림체 예시 이미지용 나노바나나 프롬프트 |

## 실행
브라우저에서 `index.html`을 열면 바로 동작해요. 별도 빌드가 필요 없어요.

- AI 기능(기획 · 콘티 · 대사 · 이미지 프롬프트)은 Claude 앱 아티팩트 안에서만 실제로 동작하고, 그 밖에서는 예시 결과로 채워져요.
- AI 이미지는 현재 예시 이미지로 대신 그려요.
- 테스트 모드(`AI_TEST=true`)에서는 작품을 열 때마다 AI 사용 횟수가 초기화돼요. 출시 때 `false`로 바꿔요.
- 작업 데이터는 브라우저(IndexedDB · localStorage)에 저장돼요.

## 이어서 작업하기
결정사항·코드 지도·수정 방법은 [CLAUDE.md](CLAUDE.md), 전체 프로젝트 목록은 [IUX 프로젝트 목록](https://github.com/handgoldking1234/iux-app/blob/main/docs/PROJECTS.md)에 있습니다.
