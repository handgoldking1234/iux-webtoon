/**
 * AI 단가표 (2026-11 공개 가격, 달러) → 원화 비용 계산
 * - 글: 100만 토큰당 [입력, 출력]
 * - 그림: 1장당 (해상도별)
 * 환율은 USD_KRW 환경 변수로 바꿀 수 있어요 (기본 1,340원).
 */
export const USD_KRW = Number(process.env.USD_KRW) > 0 ? Number(process.env.USD_KRW) : 1340;

export const TEXT_PRICE: Record<string, [number, number]> = {
  'claude-fable-5-2': [8, 40],
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
  'gpt-6.2-astra': [8, 40],
  'gpt-6.2-sol': [2, 10],
  'gpt-6.1-sol': [2, 10],
  'gpt-6-astra': [10, 50],
  'gpt-5': [1.25, 10],
};

/** 그림 1장 값 (달러) — 나노바나나 2(Flash) · 나노바나나 Pro */
const IMAGE_PRICE: { test: RegExp; by: Record<string, number> }[] = [
  { test: /pro-image/i, by: { '1K': 0.134, '2K': 0.134, '4K': 0.24 } },
  { test: /flash-image/i, by: { '0.5K': 0.045, '1K': 0.067, '2K': 0.101, '4K': 0.151 } },
];

const won = (usd: number) => Math.round(usd * USD_KRW);

/** 글 AI 한 번 비용 (원) — 단가표에 없는 모델이면 null */
export function textCostKrw(model: string, inTokens: number, outTokens: number): number | null {
  const p = TEXT_PRICE[model];
  return p ? won((inTokens * p[0] + outTokens * p[1]) / 1e6) : null;
}
export function textCostUsd(model: string, inTokens: number, outTokens: number): number | null {
  const p = TEXT_PRICE[model];
  return p ? (inTokens * p[0] + outTokens * p[1]) / 1e6 : null;
}

/** 그림 1장 비용 (원) — 해상도를 안 정하면 1K로 셈해요. 모르는 모델이면 null */
export function imageCostKrw(model: string, res?: string): number | null {
  const m = IMAGE_PRICE.find((x) => x.test.test(model));
  if (!m) return null;
  const r = res && m.by[res] != null ? res : '1K';
  return won(m.by[r] ?? m.by['1K']);
}
