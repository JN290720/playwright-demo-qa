// scripts/lib/backlog.js の確認（PWQA-41）。
// 実行: node --test scripts/lib/backlog.test.js
// 本物の Backlog には書かない（fetch を差し替える）。
'use strict';
const { test } = require('node:test');
const assert = require('assert');
const { parseTargets, normalizeSpace, missingConfig, createClient } = require('./backlog');

test('書き先: 未指定や未知の値だけなら github、指定があればその組み合わせ', () => {
  assert.deepStrictEqual([...parseTargets('')], ['github']);
  assert.deepStrictEqual([...parseTargets('slack')], ['github']);
  assert.deepStrictEqual([...parseTargets('github, Backlog')].sort(), ['backlog', 'github']);
  assert.deepStrictEqual([...parseTargets('backlog')], ['backlog']);
});

test('スペース: ホスト名だけでも、末尾のスラッシュつきでも、同じ URL になる', () => {
  assert.strictEqual(normalizeSpace('example.backlog.com'), 'https://example.backlog.com');
  assert.strictEqual(normalizeSpace('https://example.backlog.com/'), 'https://example.backlog.com');
  assert.strictEqual(normalizeSpace(''), '');
});

test('設定の不足: 足りない名前だけを返し、値は出さない', () => {
  assert.strictEqual(missingConfig({ BACKLOG_API_KEY: 'k', BACKLOG_SPACE: 's', X: 'PWQA-1' }, ['X']), null);
  const msg = missingConfig({ BACKLOG_API_KEY: 'secret-value' }, ['X']);
  assert.match(msg, /BACKLOG_SPACE, X/);
  assert.ok(!msg.includes('secret-value'));
});

test('コメント: 課題キーのパスに、本文をフォームで送る', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, json: async () => ({ id: 1 }) };
  };
  const client = createClient({ apiKey: 'k&1', space: 'example.backlog.com', fetchImpl });
  const r = await client.addComment('PWQA-47', '本文 | 表');
  assert.deepStrictEqual(r, { id: 1 });
  assert.strictEqual(calls[0].url, 'https://example.backlog.com/api/v2/issues/PWQA-47/comments?apiKey=k%261');
  assert.strictEqual(calls[0].init.method, 'POST');
  assert.strictEqual(new URLSearchParams(calls[0].init.body).get('content'), '本文 | 表');
});

test('失敗: エラーの文に API キーを含めない', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({}) });
  const client = createClient({ apiKey: 'secret-value', space: 'example.backlog.com', fetchImpl });
  await assert.rejects(client.addComment('PWQA-47', 'x'), (e) => {
    assert.match(e.message, /401/);
    assert.ok(!e.message.includes('secret-value'));
    return true;
  });
});
