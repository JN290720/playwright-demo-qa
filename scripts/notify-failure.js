#!/usr/bin/env node
// ワークフローの失敗を、GitHub Issue で通知する（#37、ユーザー判断: 通知方法は GitHub Issue）。
//   MODE=failure  : 同じラベルの open な Issue があればコメントを追記、なければ新規作成（重複 Issue を作らない）
//   MODE=recovery : 同じラベルの open な Issue があれば「復旧しました」とコメントして閉じる（無ければ何もしない）
//
// 環境変数: GH_TOKEN（必須）, GITHUB_REPOSITORY, MODE, NOTIFY_LABEL, NOTIFY_TITLE, NOTIFY_BODY, DRY_RUN=1（変更を行わず、予定を表示）
'use strict';

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const MODE = process.env.MODE || 'failure';
const LABEL = process.env.NOTIFY_LABEL;
const TITLE = process.env.NOTIFY_TITLE || '🚨 ワークフローが失敗しました';
const BODY = process.env.NOTIFY_BODY || '';
const DRY = process.env.DRY_RUN === '1';

if (!TOKEN || !REPO || !LABEL) {
  console.error('GH_TOKEN, GITHUB_REPOSITORY, NOTIFY_LABEL が必要です');
  process.exit(2);
}
if (!['failure', 'recovery'].includes(MODE)) {
  console.error(`MODE は failure か recovery です: ${MODE}`);
  process.exit(2);
}

async function api(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const err = new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

async function findOpenIssue() {
  const list = await api(`/repos/${REPO}/issues?state=open&labels=${encodeURIComponent(LABEL)}&per_page=1`);
  return list.find((i) => !i.pull_request) || null;
}

async function ensureLabel() {
  try {
    await api(`/repos/${REPO}/labels`, { method: 'POST', body: JSON.stringify({ name: LABEL, color: 'B60205', description: 'ワークフローの失敗の通知（自動）' }) });
  } catch (e) {
    if (e.status !== 422) throw e; // 既にある場合は無視
  }
}

async function main() {
  const open = await findOpenIssue();

  if (MODE === 'failure') {
    if (open) {
      console.log(`${DRY ? '[dry-run] ' : ''}既存の Issue #${open.number} にコメントを追記します`);
      if (!DRY) await api(`/repos/${REPO}/issues/${open.number}/comments`, { method: 'POST', body: JSON.stringify({ body: `### 再び失敗しました\n\n${BODY}` }) });
    } else {
      console.log(`${DRY ? '[dry-run] ' : ''}新しい Issue を作成します: ${TITLE}（ラベル: ${LABEL}）`);
      if (!DRY) {
        await ensureLabel();
        const created = await api(`/repos/${REPO}/issues`, { method: 'POST', body: JSON.stringify({ title: TITLE, labels: [LABEL, 'P1'], body: BODY }) });
        console.log(`作成しました: ${created.html_url}`);
      }
    }
    return;
  }

  // recovery
  if (!open) {
    console.log('復旧: 閉じる Issue はありません');
    return;
  }
  console.log(`${DRY ? '[dry-run] ' : ''}Issue #${open.number} に復旧のコメントを追記して閉じます`);
  if (!DRY) {
    await api(`/repos/${REPO}/issues/${open.number}/comments`, { method: 'POST', body: JSON.stringify({ body: `✅ **復旧しました。**\n\n${BODY}\n\n（再び失敗した場合は、この Issue を開き直さず、新しい Issue が自動で作成されます）` }) });
    await api(`/repos/${REPO}/issues/${open.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
