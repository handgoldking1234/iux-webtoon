import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');

test('편집기 패치가 원본과 모두 맞아요', () => {
  const out = execFileSync('node', [join(root, 'scripts/build-studio.mjs')], { encoding: 'utf8' });
  assert.match(out, /editor\/studio\.html/);
  const s = readFileSync(join(root, 'editor/studio.html'), 'utf8');
  assert.ok(s.includes('__WB_BOOT_JSON__'), '부트 자리');
  assert.ok(s.includes('/studio-assets/bridge.js'), '브리지');
  assert.ok(s.includes('const AI_TEST=!window.__WB'), '테스트 모드 끄기');
  assert.ok(!s.includes('const AI_TEST=true'), '테스트 모드가 남아 있으면 안 돼요');
});

test('브리지 스크립트 문법', () => {
  const src = readFileSync(join(root, 'public/studio-assets/bridge.js'), 'utf8');
  assert.doesNotThrow(() => new Function(src));
});
