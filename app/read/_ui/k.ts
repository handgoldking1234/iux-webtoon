/** 연재관 클래스 이름 — read.css는 r- 로 시작해요 (다른 화면 스타일과 안 섞이게) */
export const k = (s: string) => s.split(/\s+/).filter(Boolean).map((x) => 'r-' + x).join(' ');
