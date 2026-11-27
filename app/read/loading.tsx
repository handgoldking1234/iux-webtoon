import { k } from './_ui/k';

/** 연재관 화면을 불러오는 동안 바로 보이는 자리 표시 (누르자마자 반응이 보이게) */
export default function Loading() {
  return (
    <div className={k('wrap')} aria-busy="true" aria-label="불러오는 중" style={{ paddingBlock: 28 }}>
      <div className={k('sk')} style={{ height: 22, width: 180, marginBottom: 18 }} />
      <div className={k('sk')} style={{ height: 'min(70vh,560px)', maxWidth: 690, marginInline: 'auto' }} />
    </div>
  );
}
