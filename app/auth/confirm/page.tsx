import { Suspense } from 'react';
import ConfirmClient from './ConfirmClient';

export const metadata = { title: '로그인 확인 · 웹툰보드', robots: { index: false } };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ConfirmClient />
    </Suspense>
  );
}
