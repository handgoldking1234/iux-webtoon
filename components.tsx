/** 작은 공용 아이콘 (관리자 프로토타입과 같은 선 굵기) */
export function Logo({ size = 16 }: { size?: number }) {
  // 바로웹툰 로고: 말풍선
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 2C6.2 2 1.5 5.8 1.5 10.5c0 2.9 1.8 5.5 4.6 7l-1.3 4.6 5.4-3.2c.6.1 1.2.1 1.8.1 5.8 0 10.5-3.8 10.5-8.5S17.8 2 12 2z" />
    </svg>
  );
}
