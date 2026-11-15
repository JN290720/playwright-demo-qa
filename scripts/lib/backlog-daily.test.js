// scripts/lib/backlog-daily.js の確認（PWQA-42）。
// 実行: node --test scripts/lib/backlog-daily.test.js
// 本物の Backlog には書かない（fetch を差し替える）。
'use strict';
const { test } = require('node:test');
const assert = require('assert');
const { createClient } = require('./backlog');
const { postDailyReport } = require('./backlog-daily');

const MARKER = '<!-- daily-report:2026-11-16 -->';
const BODY = `# 日次レポート\n${MARKER}\n`;

// 簡易の偽サーバー。呼ばれた (method, path) を記録し、状態（issues・comments）を持つ
function fake({ issues = [], comments = [], failClose = false } = {}) {
  const calls = [];
  const state = { issues: [...issues], comments: [...comments], nextId: 100 };
  const lists = {
    '/projects/PWQA': { id: 855215 },
    '/projects/PWQA/statuses': [{ id: 1, name: '未対応' }, { id: 2, name: '処理中' }, { id: 4, name: '完了' }],
    '/projects/PWQA/issueTypes': [{ id: 7, name: '記録' }, { id: 8, name: '作業' }],
    '/projects/PWQA/customFields': [
      { id: 11, name: '起票者', items: [{ id: 9, name: '自動' }] },
      { id: 12, name: '対象リポジトリ', items: [{ id: 1, name: 'QA' }] },
      { id: 13, name: '担当', items: [{ id: 3, name: 'リーダー' }] },
    ],
    '/priorities': [{ id: 4, name: '低' }],
    '/resolutions': [{ id: 0, name: '対応済み' }],
  };
  const fetchImpl = async (url, init = {}) => {
    const u = new URL(url);
    const path = u.pathname.replace('/api/v2', '');
    const method = init.method || 'GET';
    const form = init.body ? new URLSearchParams(init.body) : null;
    calls.push({ method, path, query: u.search, form: form && [...form.entries()] });
    const ok = (data) => ({ ok: true, status: 200, json: async () => data });
    if (method === 'GET' && lists[path]) return ok(lists[path]);
    if (method === 'GET' && path === '/issues') return ok(state.issues);
    if (method === 'POST' && path === '/issues') {
      const issue = { issueKey: `PWQA-${state.nextId++}`, summary: form.get('summary'), status: { id: 1 } };
      state.issues.push(issue);
      return ok(issue);
    }
    if (method === 'PATCH' && path.startsWith('/issues/')) {
      if (failClose && form.get('statusId') === '4') return { ok: false, status: 500, json: async () => ({}) };
      const issue = state.issues.find((i) => `/issues/${i.issueKey}` === path);
      issue.status = { id: Number(form.get('statusId')) };
      return ok(issue);
    }
    if (method === 'GET' && path.endsWith('/comments')) return ok(state.comments);
    if (method === 'POST' && path.endsWith('/comments')) {
      state.comments.push({ content: form.get('content') });
      return ok({ id: 555 });
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const client = createClient({ apiKey: 'k', space: 'example.backlog.com', fetchImpl });
  return { client, calls, state };
}

const run = (f, extra = {}) => postDailyReport({ client: f.client, projectKey: 'PWQA', jstDate: '2026-11-16', body: BODY, marker: MARKER, dedupe: true, ...extra });

test('月の課題が無いとき: 作って（種別・優先度・属性）、処理中にして、コメントする', async () => {
  const f = fake();
  const r = await run(f);
  assert.strictEqual(r.posted, true);
  const created = f.calls.find((c) => c.method === 'POST' && c.path === '/issues');
  const form = Object.fromEntries(created.form);
  assert.strictEqual(form.summary, '日次レポート 2026-11（自動）');
  assert.strictEqual(form.issueTypeId, '7');
  assert.strictEqual(form.priorityId, '4');
  assert.deepStrictEqual([form.customField_11, form.customField_12, form.customField_13], ['9', '1', '3']);
  assert.ok(f.calls.some((c) => c.method === 'PATCH' && c.form.some(([k, v]) => k === 'statusId' && v === '2')));
  assert.ok(f.state.comments[0].content.startsWith('[自動]\n'));
});

test('月の課題が有るとき: 作らずに、そこへコメントする', async () => {
  const f = fake({ issues: [{ issueKey: 'PWQA-60', summary: '日次レポート 2026-11（自動）', status: { id: 2 } }] });
  const r = await run(f);
  assert.strictEqual(r.issueKey, 'PWQA-60');
  assert.ok(!f.calls.some((c) => c.method === 'POST' && c.path === '/issues'));
});

test('前の月の未完了の課題は、完了（完了理由: 対応済み）にする。今の月と、完了済みは触らない', async () => {
  const f = fake({
    issues: [
      { issueKey: 'PWQA-50', summary: '日次レポート 2026-10（自動）', status: { id: 2 } },
      { issueKey: 'PWQA-40', summary: '日次レポート 2026-09（自動）', status: { id: 4 } },
      { issueKey: 'PWQA-60', summary: '日次レポート 2026-11（自動）', status: { id: 2 } },
      { issueKey: 'PWQA-70', summary: '別の課題（日次レポートの話）', status: { id: 2 } },
      { issueKey: 'PWQA-80', summary: '日次レポート 2026-12（自動）', status: { id: 2 } }, // 先の月（今の月より後）は閉じない
    ],
  });
  await run(f);
  const patches = f.calls.filter((c) => c.method === 'PATCH').map((c) => c.path);
  assert.deepStrictEqual(patches, ['/issues/PWQA-50']);
  const form = Object.fromEntries(f.calls.find((c) => c.method === 'PATCH').form);
  assert.deepStrictEqual([form.statusId, form.resolutionId], ['4', '0']);
});

test('二重投稿の防止: 同じ目印のコメントが有れば、定時の実行は投稿しない。手動（dedupe なし）は投稿する', async () => {
  const issues = [{ issueKey: 'PWQA-60', summary: '日次レポート 2026-11（自動）', status: { id: 2 } }];
  const f1 = fake({ issues, comments: [{ content: `[自動]\n${BODY}` }] });
  const r1 = await run(f1);
  assert.strictEqual(r1.posted, false);
  assert.strictEqual(f1.state.comments.length, 1);
  const f2 = fake({ issues, comments: [{ content: `[自動]\n${BODY}` }] });
  const r2 = await run(f2, { dedupe: false });
  assert.strictEqual(r2.posted, true);
  assert.strictEqual(f2.state.comments.length, 2);
});

test('名前が見つからないとき: 例外にする（呼び出し側で警告に留める）。メッセージに API キーは含まれない', async () => {
  const f = fake();
  const bad = { ...f, client: { ...f.client, getProjectList: async (k, n) => (n === 'issueTypes' ? [] : f.client.getProjectList(k, n)) } };
  await assert.rejects(() => run(bad), (e) => /種別「記録」/.test(e.message) && !/apiKey|=k/.test(e.message));
});

test('一覧の条件: 種別「記録」で絞り、keyword は使わない（作った直後に見つからず 2 つできるのを避ける）', async () => {
  const f = fake();
  await run(f);
  const list = f.calls.find((c) => c.method === 'GET' && c.path === '/issues');
  assert.strictEqual(new URLSearchParams(list.query).get('issueTypeId[]'), '7');
  assert.ok(!list.query.includes('keyword'));
});

test('前の月を閉じる処理の失敗: 今日の投稿は残り、警告に入る（例外にしない）。投稿は、閉じる処理より先', async () => {
  const f = fake({ issues: [{ issueKey: 'PWQA-50', summary: '日次レポート 2026-10（自動）', status: { id: 2 } }, { issueKey: 'PWQA-60', summary: '日次レポート 2026-11（自動）', status: { id: 2 } }], failClose: true });
  const r = await run(f);
  assert.strictEqual(r.posted, true);
  assert.strictEqual(f.state.comments.length, 1);
  assert.strictEqual(r.warnings.length, 1);
  assert.match(r.warnings[0], /前の月の課題を完了にできませんでした/);
  const iComment = f.calls.findIndex((c) => c.method === 'POST' && c.path.endsWith('/comments'));
  const iClose = f.calls.findIndex((c) => c.method === 'PATCH' && c.path === '/issues/PWQA-50');
  assert.ok(iComment < iClose);
});
