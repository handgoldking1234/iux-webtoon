'use client';
import { useState } from 'react';
import { DAYS } from '@/lib/read/config';
import type { SV } from '@/lib/read/view';
import Card from './Card';
import { k } from './k';

const TABS = [['new', '신작'], ...DAYS, ['done', '완결']] as const;
export const TAB_KEYS: string[] = TABS.map((t) => t[0]);

/** 연재 시간표 — 신작 · 월~일 · 완결 탭 + 정렬 단추 + 포스터 격자 */
export default function DayTabs({ all, today, initial }: { all: SV[]; today: string; initial?: string }) {
  const [day, setDay] = useState(initial && TAB_KEYS.includes(initial) ? initial : today);
  const [sort, setSort] = useState<'rate' | 'new'>('rate');
  const [upOnly, setUpOnly] = useState(false);
  let L = day === 'new' ? all.filter((s) => s.isNew) : day === 'done' ? all.filter((s) => s.kind === 'done') : all.filter((s) => s.kind === 'daily' && s.days.includes(day));
  if (upOnly) L = L.filter((s) => s.up || s.isNew);
  L = L.slice().sort(sort === 'new' ? (a, b) => b.last - a.last : (a, b) => b.rating - a.rating);
  return (
    <>
      <div className={k('days')} role="tablist" aria-label="요일">
        {TABS.map(([d, l]) => (
          <button key={d} role="tab" aria-selected={day === d} className={day === d ? k('on') : undefined} onClick={() => setDay(d)}>{l}{d === today && <span className={k('today')} title="오늘" />}</button>
        ))}
      </div>
      <div className={k('chipsbar')}>
        <button className={k(`fchip ${sort === 'rate' && !upOnly ? 'on' : ''}`)} onClick={() => { setSort('rate'); setUpOnly(false); }}>전체 · 인기순</button>
        <button className={k(`fchip ${sort === 'new' && !upOnly ? 'on' : ''}`)} onClick={() => { setSort('new'); setUpOnly(false); }}>업데이트순</button>
        <button className={k(`fchip ${upOnly ? 'on' : ''}`)} aria-pressed={upOnly} onClick={() => setUpOnly(!upOnly)}>새 회차만</button>
      </div>
      {L.length ? <div className={k('grid')}>{L.map((s) => <Card key={s.id} s={s} />)}</div> : <p className={k('empty')}>{upOnly ? '새 회차가 올라온 작품이 없어요' : day === 'new' ? '아직 새로 시작한 작품이 없어요' : '이 요일에는 아직 연재 작품이 없어요'}</p>}
    </>
  );
}
