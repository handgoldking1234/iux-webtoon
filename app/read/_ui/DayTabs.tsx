'use client';
import { useState } from 'react';
import { DAYS } from '@/lib/read/config';
import type { SV } from '@/lib/read/view';
import Card from './Card';
import { k } from './k';

export default function DayTabs({ bucket, today }: { bucket: Record<string, SV[]>; today: string }) {
  const [day, setDay] = useState(today);
  const L = bucket[day] || [];
  return (
    <>
      <div className={k('days')} role="tablist" aria-label="요일">
        {[...DAYS, ['done', '완결'] as const].map(([d, l]) => (
          <button key={d} role="tab" aria-selected={day === d} className={day === d ? k('on') : undefined} onClick={() => setDay(d)}>{l}{d === today && <span className={k('today')}>오늘</span>}</button>
        ))}
      </div>
      {L.length ? <div className={k('grid')}>{L.map((s) => <Card key={s.id} s={s} />)}</div> : <p className={k('empty')}>이 요일에는 아직 연재 작품이 없어요</p>}
    </>
  );
}
