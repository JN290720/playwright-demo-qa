#!/usr/bin/env node
// 「サイト側の既知の不具合」が直った可能性を、サイト不具合の一覧の Issue（ラベル site-defect）にコメントで知らせる（#97 / #98）。
//
// 仕組み: 既知の不具合のテストは、test.fail()（= 失敗することを期待）で書いている。
//   サイトが直ってテストが「予期せず成功」すると、Playwright はそのテストを「失敗（unexpected）」として報告する。
//   タイトルに「既知の不具合」「既知の不備」を含むテストの失敗 = サイトが直った可能性、として知らせる。
//   （それ以外の失敗は、通常の失敗として notify-failure.js が通知する）
//
// 使い方: node scripts/notify-site-fixed.js [reports/results.json]
// 環境変数: GH_TOKEN, GITHUB_REPOSITORY（必須）, RUN_URL（実行へのリンク）, DRY_RUN=1（投稿せず、予定を表示）
//
// 同じ内容を、毎週コメントしないよう、目印（隠しコメント）で重複を避ける。
'use strict';
const fs = require('fs');
const crypto = require('crypto');

const input = process.argv[2] || 'reports/results.json';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const RUN_URL = process.env.RUN_URL || '';
const DRY = process.env.DRY_RUN === '1';
const LABEL = 'site-defect';
const KNOWN = /既知の(不具合|不備)/;

if (!fs.existsSync(input)) {
  console.log(`JSON レポートがありません: ${input}`);
  process.exit(0);
}

// レポートから、「既知の不具合」のテストで、失敗（= 予期せず成功）したものを集める
const fixed = new Map(); // タイトル → プロジェクトの一覧
const walk = (suite) => {
  for (const spec of suite.specs || []) {
    if (!KNOWN.test(spec.title)) continue;
    for (const t of spec.tests || []) {
      if (t.status !== 'unexpected') continue;
      const key = `${spec.file} › ${spec.title}`;
      fixed.set(key, [...(fixed.get(key) || []), t.projectName]);
    }
  }
  for (const child of suite.suites || []) walk(child);
};
for (const s of JSON.parse(fs.readFileSync(input, 'utf8')).suites || []) walk(s);

if (fixed.size === 0) {
  console.log('「既知の不具合」のテストで、予期せず成功したものはありません（サイトの不具合は、まだ残っています）。');
  process.exit(0);
}

const lines = [...fixed.entries()].sort().map(([title, projects]) => `- ${title}（${[...new Set(projects)].join(', ')}）`);
const marker = `<!-- site-fixed:${crypto.createHash('sha1').update(lines.join('\n')).digest('hex').slice(0, 12)} -->`;
const body = [
  '### 🎉 サイト側の不具合が、直った可能性があります',
  '',
  '次のテストは、「失敗すること」を期待（`test.fail()`）していましたが、**成功しました**（= 不具合が再現しなかった）。',
  '',
  ...lines,
  '',
  '**対応**: 実際にサイトで直っているかを確認し、直っていれば、そのテストから `test.fail()` を外し、台帳（`docs/known-site-issues.md` / `docs/a11y-known-issues.md`）と、この Issue の表から消してください。',
  RUN_URL ? `\n- 実行: ${RUN_URL}` : '',
  '',
  marker,
].join('\n');

async function api(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log(body);
  if (DRY) {
    console.log('\n[dry-run] 投稿しません');
    return;
  }
  if (!TOKEN || !REPO) throw new Error('GH_TOKEN と GITHUB_REPOSITORY が必要です');
  const issues = (await api(`/repos/${REPO}/issues?state=open&labels=${LABEL}&per_page=1`)).filter((i) => !i.pull_request);
  if (issues.length === 0) {
    console.log(`ラベル ${LABEL} の open な Issue が無いため、投稿しません。`);
    return;
  }
  const number = issues[0].number;
  const comments = await api(`/repos/${REPO}/issues/${number}/comments?per_page=100&sort=created&direction=desc`);
  if (comments.some((c) => (c.body || '').includes(marker))) {
    console.log(`Issue #${number} に、同じ内容のコメントが既にあります。投稿しません。`);
    return;
  }
  const posted = await api(`/repos/${REPO}/issues/${number}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  console.log(`投稿しました: ${posted.html_url}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
