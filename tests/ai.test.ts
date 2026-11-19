import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickJson, nearestRatio, openaiSize, AiError } from '../lib/ai';

test('AI 답에서 JSON만 뽑아요', () => {
  assert.deepEqual(pickJson('{"a":1}'), { a: 1 });
  assert.deepEqual(pickJson('```json\n{"syn":"x"}\n```'), { syn: 'x' });
  assert.deepEqual(pickJson('여기 있어요: {"cuts":[{"no":1}]} 끝'), { cuts: [{ no: 1 }] });
  assert.deepEqual(pickJson('[{"no":1,"prompt":"p"}]'), [{ no: 1, prompt: 'p' }]);
  assert.throws(() => pickJson('그냥 글이에요'), AiError);
});

test('컷 비율 → Gemini 비율', () => {
  assert.equal(nearestRatio(690, 920), '3:4');
  assert.equal(nearestRatio(1280, 720), '16:9');
  assert.equal(nearestRatio(1000, 1000), '1:1');
  assert.equal(nearestRatio(720, 1280), '9:16');
  assert.equal(nearestRatio(0, 0), '3:4');
});

test('컷 비율 → OpenAI 크기', () => {
  assert.equal(openaiSize(690, 920), '1024x1536');
  assert.equal(openaiSize(1280, 720), '1536x1024');
  assert.equal(openaiSize(800, 800), '1024x1024');
});
