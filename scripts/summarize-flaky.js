#!/usr/bin/env node
// Playwright の JSON レポートから、flaky（リトライで通ったテスト）と失敗を抽出して、Markdown にまとめる（#37）。
// CI は retries: 2 のため、不安定なテストが「成功」に見える。ここで見える化する（警告表示のみ。CI は失敗にしない）。
//
// 使い方: node scripts/summarize-flaky.js [reports/results.json]
// 出力  : reports/summary.md（Job Summary・PR コメント用）、reports/flaky-count.txt、reports/failed-count.txt
'use strict';
const fs = require('fs');
const path = require('path');

const input = process.argv[2] || 'reports/results.json';
const outDir = path.dirname(input);

const write = (name, text) => fs.writeFileSync(path.join(outDir, name), text);

if (!fs.existsSync(input)) {
  // /update-vrt など、JSON レポートを出さない実行。空の結果として扱う
  console.log(`JSON レポートがありません: ${input}`);
  process.exit(0);
}

const report = JSON.parse(fs.readFileSync(input, 'utf8'));
const stripAnsi = (s) => String(s || '').replace(/\u001b\[[0-9;]*m/g, '');
const oneLine = (s) => stripAnsi(s).split('\n').map((l) => l.trim()).filter(Boolean)[0]?.slice(0, 160) || '';
const esc = (s) => String(s).replace(/\|/g, '\\|');

const flaky = [];
const failed = [];
let passed = 0;
let skipped = 0;

const walk = (suite, inheritedFile) => {
  const file = suite.file || inheritedFile;
  for (const spec of suite.specs || []) {
    for (const t of spec.tests || []) {
      const results = t.results || [];
      const firstBad = results.find((r) => r.status && r.status !== 'passed' && r.status !== 'skipped');
      const row = {
        file: spec.file || file,
        title: spec.title,
        project: t.projectName,
        retries: Math.max(0, results.length - 1),
        reason: oneLine(firstBad?.error?.message || firstBad?.errors?.[0]?.message),
      };
      if (t.status === 'flaky') flaky.push(row);
      else if (t.status === 'unexpected') failed.push(row);
      else if (t.status === 'skipped') skipped++;
      else passed++;
    }
  }
  for (const child of suite.suites || []) walk(child, file);
};
for (const s of report.suites || []) walk(s, s.file);

const table = (rows) =>
  '| テスト | プロジェクト | リトライ回数 | 最初の失敗の要約 |\n|---|---|---|---|\n' +
  rows.map((r) => `| ${esc(r.file)} › ${esc(r.title)} | ${esc(r.project)} | ${r.retries} | ${esc(r.reason)} |`).join('\n');

let md = `**結果**: 成功 ${passed} / 失敗 ${failed.length} / flaky ${flaky.length} / スキップ ${skipped}\n\n`;
if (failed.length) md += `### ❌ 失敗: ${failed.length} 件\n${table(failed)}\n\n`;
if (flaky.length) {
  md += `### ⚠️ Flaky（リトライで通過）: ${flaky.length} 件\n`;
  md += 'CI は `retries: 2` のため「成功」に見えますが、**不安定なテスト**です。原因を調べてください（再現は、リトライなしで並列に繰り返すと確認しやすい）。\n\n';
  md += `${table(flaky)}\n\n`;
}
if (!failed.length && !flaky.length) md += '✅ flaky・失敗はありません。\n';

write('summary.md', md);
write('flaky-count.txt', String(flaky.length));
write('failed-count.txt', String(failed.length));
console.log(md);
