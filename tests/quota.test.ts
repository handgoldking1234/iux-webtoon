import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limitsOf } from '../lib/quota';

const L = { freeText: 30, freeImage: 10, proText: 1000, proImage: 300 };

test('무료: 글 매달 · 이미지는 가입 선물(누적)', () => {
  assert.deepEqual(limitsOf({ plan: 'free', bonus_images: 0 }, L), { text: 30, image: 10, imagePeriod: 'total' });
});
test('관리자가 준 추가 이미지는 더해져요', () => {
  assert.equal(limitsOf({ plan: 'free', bonus_images: 5 }, L).image, 15);
});
test('프로 · 교육: 이미지도 매달', () => {
  assert.deepEqual(limitsOf({ plan: 'pro', bonus_images: 0 }, L), { text: 1000, image: 300, imagePeriod: 'month' });
  assert.equal(limitsOf({ plan: 'edu', bonus_images: 0 }, L).imagePeriod, 'month');
});
