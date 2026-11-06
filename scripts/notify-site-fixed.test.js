// scripts/notify-site-fixed.js の判定の確認（#152 の 6673843670・案 A。#300 の条件）。
// 実行: node --test scripts/notify-site-fixed.test.js
// 投稿はしない（DRY_RUN=1 で、予定の本文だけを表示させる）。
'use strict';
const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, 'notify-site-fixed.js');

// JSON レポートの 1 テスト分を作る（Playwright の JSON 形式を、必要な項目だけ）
// status は Playwright が付ける結果（unexpected = test.fail() のテストが『予期せず成功』扱い）
const report = (title, status, attempts) => ({
  suites: [{ specs: [{ title, file: 'sample.spec.ts', tests: [{ projectName: 'desktop-chrome', status, results: attempts }] }] }],
});

// 判定を実行し、表示された本文を返す
const run = (json) => {
  const file = path.join(os.tmpdir(), `notify-site-fixed-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(json));
  try {
    const r = spawnSync(process.execPath, [SCRIPT, file], { env: { ...process.env, DRY_RUN: '1' }, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    return r.stdout;
  } finally {
    fs.unlinkSync(file);
  }
};

const TITLE = '[既知の不具合] 購入を完了できること';

test('本当に直った場合（本文が成功した）は、「直った可能性」として出る', () => {
  const out = run(report(TITLE, 'unexpected', [{ status: 'passed', error: undefined }]));
  assert.match(out, /サイト側の不具合が、直った可能性があります/);
  assert.ok(out.includes(`- sample.spec.ts › ${TITLE}`), out);
});

test('フィクスチャでのブラウザ起動失敗（本文は走らず、全リトライが失敗）は、「直った」として出ない', () => {
  const launchError = { message: 'browserType.launch: Target page, context or browser has been closed' };
  const out = run(report(TITLE, 'unexpected', [{ status: 'failed', error: launchError }, { status: 'failed', error: launchError }, { status: 'failed', error: launchError }]));
  assert.doesNotMatch(out, /直った可能性/);
  assert.match(out, /予期せず成功したものはありません/);
});

test('リトライで本文が成功した場合は、「直った」として出る（失敗のあとの成功）', () => {
  const out = run(report(TITLE, 'unexpected', [{ status: 'failed', error: { message: 'timeout' } }, { status: 'passed', error: undefined }]));
  assert.ok(out.includes(`- sample.spec.ts › ${TITLE}`), out);
});

test('本文の中で失敗し、想定どおり失敗（expected）したものは、「直った」として出ない', () => {
  const json = { suites: [{ specs: [{ title: TITLE, file: 'sample.spec.ts', tests: [{ projectName: 'desktop-chrome', status: 'expected', results: [{ status: 'failed', error: { message: 'expected failure' } }] }] }] }] };
  const out = run(json);
  assert.doesNotMatch(out, /直った可能性/);
});
