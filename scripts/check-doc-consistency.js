#!/usr/bin/env node
// 文書とコードのずれを、機械で照合する（#283-1）。
//
// 【目的】文書（CLAUDE.md）の列挙と、実物（PR テンプレート・package.json）が食い違ったときに、人の目に頼らず気づく。
//   #73 で起きた「見出しの文字のずれ」を防ぐ。AI は使わないため、使用量は 0。
//
// 照合する 2 件:
//   1. PR テンプレートの見出し（.github/PULL_REQUEST_TEMPLATE.md の「## 」）↔ CLAUDE.md の「PR 本文は … の見出し(…)に沿って」
//   2. CLAUDE.md の「## コマンド」の `npm run <name>` ↔ package.json の scripts
//
// 判定:
//   - error（終了コード 1）: 文書に書いてあるのに、実物に無い（例: 文書の見出しが、テンプレートから消えた）
//   - warning（表示のみ・終了コード 0）: 実物にあるのに、文書に無い（例: typecheck は CLAUDE.md に無い）
//
// 使い方: node scripts/check-doc-consistency.js
//
// 注意: 見出しの比較は、括弧の注記（「（任意）」「（無ければ「なし」）」など）を除いて行う。
//   CLAUDE.md の列挙を変えたら、この script の前提（「の見出し(」「に沿って」の文言）も確かめる。
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// 括弧の注記（全角・半角）を取り除き、空白を詰める
const normalize = (text) => text.replace(/（[^）]*）|\([^)]*\)/g, '').replace(/\s+/g, '');

const errors = [];
const warnings = [];

// 1. PR テンプレートの見出し ↔ CLAUDE.md の列挙
const templateHeadings = read('.github/PULL_REQUEST_TEMPLATE.md')
  .split('\n')
  .filter((line) => line.startsWith('## '))
  .map((line) => normalize(line.slice(3)));

const claudeMd = read('CLAUDE.md');
const listMatch = claudeMd.match(/の見出し\(([^\n]*?)\)に沿って/);
if (!listMatch) {
  errors.push('CLAUDE.md に「の見出し(…)に沿って」の列挙が見つからない（照合の前提が崩れた）');
} else {
  // 列挙は「、」区切り。注記を除いてから分ける
  const docHeadings = listMatch[1]
    .split('、')
    .map((item) => normalize(item));
  // 文書にあって、テンプレートに無い
  for (const h of docHeadings) {
    if (!templateHeadings.includes(h)) errors.push(`見出し「${h}」は CLAUDE.md にあるが、PR テンプレートに無い`);
  }
  // テンプレートにあって、文書に無い
  for (const h of templateHeadings) {
    if (!docHeadings.includes(h)) warnings.push(`見出し「${h}」は PR テンプレートにあるが、CLAUDE.md の列挙に無い`);
  }
}

// 2. CLAUDE.md の「## コマンド」の npm run ↔ package.json の scripts
const commandSection = claudeMd.split('\n## ').find((s) => s.startsWith('コマンド'));
const documented = commandSection
  ? [...commandSection.matchAll(/npm run ([\w:.-]+)/g)].map((m) => m[1])
  : [];
if (!commandSection) errors.push('CLAUDE.md に「## コマンド」の節が見つからない（照合の前提が崩れた）');

const scripts = Object.keys(JSON.parse(read('package.json')).scripts || {});
for (const name of documented) {
  if (!scripts.includes(name)) errors.push(`コマンド「npm run ${name}」は CLAUDE.md にあるが、package.json の scripts に無い`);
}
for (const name of scripts) {
  if (!documented.includes(name)) warnings.push(`script「${name}」は package.json にあるが、CLAUDE.md のコマンドに無い`);
}

for (const w of warnings) console.log(`[warning] ${w}`);
for (const e of errors) console.log(`[error] ${e}`);
console.log(`照合: error ${errors.length} 件 / warning ${warnings.length} 件`);
process.exitCode = errors.length > 0 ? 1 : 0;
