#!/usr/bin/env node
// 表示速度の記録（tests-perf/ が reports/perf.json に書いたもの）を、Markdown の表にまとめる（#136）。
// しきい値は設けない（記録のみ。失敗にしない）。Job Summary と、成果物（JSON）に残して、推移を後から見られるようにする。
//
// 使い方: node scripts/summarize-perf.js [reports/perf.json]   → 標準出力に Markdown
'use strict';
const fs = require('fs');
const input = process.argv[2] || 'reports/perf.json';
if (!fs.existsSync(input)) {
  console.log(`表示速度の記録がありません: ${input}`);
  process.exit(0);
}
const { recordedAt, runs, results } = JSON.parse(fs.readFileSync(input, 'utf8'));
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const lines = [
  '## ⏱ 表示速度の記録（PC Chrome・各 ' + runs + ' 回。記録のみ。失敗にはしない）',
  '',
  `記録日時: ${recordedAt}。外部の公開サイトのため、通信状況でぶれます。**しきい値は設けていません**（推移を見るための記録）。`,
  '',
  '| 項目 | 中央値 (ms) | 最小 (ms) | 最大 (ms) |',
  '|---|---|---|---|',
  ...Object.entries(results).map(([name, v]) => `| ${name} | ${median(v)} | ${Math.min(...v)} | ${Math.max(...v)} |`),
  '',
  '用語: LCP = 画面の主要な内容が表示されるまでの時間。load = ページと、画像などの読み込みが終わるまでの時間。',
];
console.log(lines.join('\n'));
