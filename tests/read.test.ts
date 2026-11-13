import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RESERVED, readHref, todayKey } from '../lib/read/config';
import { avg } from '../lib/read/types';

test('연재관 주소', () => {
  assert.equal(readHref(), '/read');
  assert.equal(readHref('hyeonsang/1'), '/read/hyeonsang/1');
  assert.equal(readHref('/free'), '/read/free');
  for (const r of ['api', 'daily', 'free', 'rank', 'publish', 'policy']) assert.ok(RESERVED.has(r), r);
});

test('오늘 요일은 한국 시간 기준', () => {
  assert.equal(todayKey(new Date('2026-11-13T16:00:00Z')), 'sat'); // 한국 11/14 01:00 토
  assert.equal(todayKey(new Date('2026-11-13T14:00:00Z')), 'fri'); // 한국 11/13 23:00 금
});

test('별점 평균', () => {
  assert.equal(avg({ rating_sum: 0, rating_count: 0 }), 0);
  assert.equal(avg({ rating_sum: 19, rating_count: 2 }), 9.5);
});
