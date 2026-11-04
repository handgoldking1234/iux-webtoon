import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 편집기 HTML(빌드 때 prototype/studio.html에서 만들어짐)을 서버 함수에 같이 실어요
  outputFileTracingIncludes: { '/studio': ['./editor/**'] },
  poweredByHeader: false,
};

export default nextConfig;
