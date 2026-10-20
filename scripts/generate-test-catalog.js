#!/usr/bin/env node
// テストの一覧（テスト観点表）を、コードから自動で生成する（#39）。
//
// 【目的】「何を、どこまでテストしているか」を、**エンジニア以外も読める表**にする。QA としての抜け漏れの確認や、
//   優先度付けの根拠にする。手で書いた表はコードとずれていくため、Playwright のテスト一覧（--list）から機械的に作る。
//
// 出力（既定は public/。Deploy App が、公開サイトの test-catalog.html / test-catalog.csv として公開する）:
//   - test-catalog.csv  : Excel で開ける（UTF-8・BOM 付き）。1 行 = 1 テストケース
//   - test-catalog.html : 画面 × 観点の件数表と、絞り込める一覧（このファイル 1 つで完結）
//   - test-catalog.json : 同じ内容を、プログラムで使える形にしたもの（観点ごとの Issue の自動更新 = sync-test-viewpoint-issues.js が使う）
//
// 使い方: node scripts/generate-test-catalog.js [出力先ディレクトリ]
//
// 分類は、ファイル名（観点・対象サイト）と、テスト名のキーワード（画面）から決める。
// 新しい spec ファイルを追加したら、下の FILE_INFO に追記する（未登録のファイルは「未分類」と表示される）。
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const outDir = process.argv[2] || 'public';
const tmpDir = 'reports';

// ファイル名 → 対象サイト・観点
const FILE_INFO = {
  'saucedemo-e2e-purchase.spec.ts': { site: 'SauceDemo', viewpoint: '機能（正常系）' },
  'saucedemo-inventory-cart.spec.ts': { site: 'SauceDemo', viewpoint: '機能（正常系）' },
  'saucedemo-sidebar-logout.spec.ts': { site: 'SauceDemo', viewpoint: '機能（正常系）' },
  'saucedemo-user-types.spec.ts': { site: 'SauceDemo', viewpoint: '機能（特殊ユーザー）' },
  'login.spec.ts': { site: 'SauceDemo / TodoMVC', viewpoint: '機能（正常系）' },
  'saucedemo-checkout-validation.spec.ts': { site: 'SauceDemo', viewpoint: '異常系' },
  'saucedemo-qa-destructive.spec.ts': { site: 'SauceDemo', viewpoint: '異常系・破壊的操作' },
  'saucedemo-security-input.spec.ts': { site: 'SauceDemo', viewpoint: 'セキュリティ' },
  'saucedemo-accessibility.spec.ts': { site: 'SauceDemo', viewpoint: 'アクセシビリティ' },
  'saucedemo-visual-regression.spec.ts': { site: 'SauceDemo', viewpoint: 'VRT（見た目）' },
  'saucedemo-network-mocking.spec.ts': { site: 'SauceDemo', viewpoint: 'ネットワーク' },
  'todomvc-basic.spec.ts': { site: 'TodoMVC', viewpoint: '機能（正常系）' },
  'todomvc-smoke.spec.ts': { site: 'TodoMVC', viewpoint: '機能（正常系）' },
  'todomvc-destructive.spec.ts': { site: 'TodoMVC', viewpoint: '異常系・破壊的操作' },
  'api-demo.spec.ts': { site: 'jsonplaceholder（API）', viewpoint: 'API' },
};
const VIEWPOINTS = ['機能（正常系）', '機能（特殊ユーザー）', '異常系', '異常系・破壊的操作', 'セキュリティ', 'アクセシビリティ', 'VRT（見た目）', 'ネットワーク', 'API', '未分類'];

// テスト名・グループ名のキーワード → 画面（上から順に最初に合うもの）
const SCREENS = [
  ['購入完了', /購入完了|注文完了|Thank you/],
  ['購入確認', /購入確認|確認画面|金額|小計/],
  ['購入手続き入力', /購入手続き|チェックアウト入力|入力エラー|姓|郵便/],
  ['カート', /カート/],
  ['商品詳細', /商品詳細/],
  ['サイドメニュー', /サイドメニュー|メニュー/],
  ['ログアウト', /ログアウト|Logout/],
  ['商品一覧', /商品一覧|並び替え|ソート|価格/],
  ['ログイン', /ログイン|パスワード|ユーザー名|ロック/],
];
// テスト名で判定し、決まらなければグループ名（describe）も見る（グループ名は広い範囲を指すことがあるため、テスト名を優先）
const screenOf = (title, group) => (SCREENS.find(([, re]) => re.test(title)) || SCREENS.find(([, re]) => re.test(group)) || ['（複数・全体）'])[0];

// Playwright のテスト一覧（JSON）を取得する。ENV=staging で全テスト、ENV=prod で @prd のみ
function list(env, extraArgs = []) {
  fs.mkdirSync(tmpDir, { recursive: true });
  // 絶対パスにする（設定ファイルが別のフォルダにあると、相対パスは、そのフォルダ基準になるため）
  const file = path.resolve(tmpDir, `catalog-${env}-${extraArgs.length}.json`);
  // npx を介さず、Playwright の CLI を node で直接実行する（OS による違い・シェルの警告を避ける）
  execFileSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--list', '--reporter=json', ...extraArgs], {
    env: { ...process.env, ENV: env, PLAYWRIGHT_JSON_OUTPUT_NAME: file, GITHUB_EVENT_NAME: '' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const tests = [];
  const walk = (suite, groups) => {
    const g = suite.title && !/\.spec\.ts$/.test(suite.title) ? [...groups, suite.title] : groups;
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) tests.push({ file: path.basename(spec.file), groups: g, title: spec.title, project: t.projectName || '(既定)' });
    }
    for (const child of suite.suites || []) walk(child, g);
  };
  for (const s of JSON.parse(fs.readFileSync(file, 'utf8')).suites || []) walk(s, []);
  return tests;
}

const key = (t) => `${t.file}::${t.groups.join('/')}::${t.title}`;
const all = list('staging');
const prd = new Set(list('prod').map(key));
const android = new Set(list('staging', ['-c', 'tests-android/playwright.config.ts']).map(key));

// 同じテストを、プロジェクト（ブラウザ）をまとめて 1 行にする
const byKey = new Map();
for (const t of all) {
  const k = key(t);
  if (!byKey.has(k)) byKey.set(k, { ...t, projects: new Set() });
  byKey.get(k).projects.add(t.project);
}
const projectLabel = { 'desktop-chrome': 'PC Chrome', 'mobile-chrome': 'スマホ Chrome', 'desktop-safari': 'Safari' };

const rows = [...byKey.values()]
  .map((t) => {
    const info = FILE_INFO[t.file] || { site: '未分類', viewpoint: '未分類' };
    const known = /既知の(不具合|不備)/.test(t.title);
    return {
      site: info.site,
      viewpoint: info.viewpoint,
      screen: screenOf(t.title, t.groups.join(' ')),
      title: t.title,
      group: t.groups.join(' › '),
      file: t.file,
      env: prd.has(key(t)) ? '全環境（stg・prd）' : 'stg のみ',
      browsers: [...t.projects].map((p) => projectLabel[p] || p).join(' / '),
      android: android.has(key(t)) ? '○' : '',
      known: known ? '○（既知の不具合を検知する）' : '',
    };
  })
  .sort((a, b) => VIEWPOINTS.indexOf(a.viewpoint) - VIEWPOINTS.indexOf(b.viewpoint) || a.site.localeCompare(b.site) || a.file.localeCompare(b.file) || a.title.localeCompare(b.title, 'ja'));
rows.forEach((r, i) => (r.no = i + 1));

fs.mkdirSync(outDir, { recursive: true });

// --- CSV（Excel 用: UTF-8 BOM 付き） ---
const COLS = [
  ['no', 'No'],
  ['site', '対象サイト'],
  ['viewpoint', '観点'],
  ['screen', '画面（テスト名から推定）'],
  ['title', 'テスト名（確認すること）'],
  ['group', 'グループ'],
  ['env', '実行環境'],
  ['browsers', 'ブラウザ（PR・週次）'],
  ['android', 'Android（夜間）'],
  ['known', '既知の不具合の検知（test.fail）'],
  ['file', 'ファイル'],
];
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = '﻿' + [COLS.map(([, h]) => csvCell(h)).join(','), ...rows.map((r) => COLS.map(([k]) => csvCell(r[k])).join(','))].join('\r\n') + '\r\n';
fs.writeFileSync(path.join(outDir, 'test-catalog.csv'), csv);
fs.writeFileSync(path.join(outDir, 'test-catalog.json'), JSON.stringify({ viewpoints: VIEWPOINTS.filter((v) => rows.some((r) => r.viewpoint === v)), screens: [...SCREENS.map(([n]) => n), '（複数・全体）'], rows }, null, 2));

// --- HTML ---
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const screens = [...new Set([...SCREENS.map(([n]) => n), '（複数・全体）'])];
const viewpoints = VIEWPOINTS.filter((v) => rows.some((r) => r.viewpoint === v));
const sauce = rows.filter((r) => r.site.startsWith('SauceDemo'));
const count = (screen, vp) => sauce.filter((r) => r.screen === screen && r.viewpoint === vp).length;
const matrix =
  `<table class="matrix"><thead><tr><th>画面 ＼ 観点</th>${viewpoints.map((v) => `<th>${esc(v)}</th>`).join('')}<th>計</th></tr></thead><tbody>` +
  screens
    .map((s) => {
      const cells = viewpoints.map((v) => count(s, v));
      const total = cells.reduce((a, b) => a + b, 0);
      return `<tr><th>${esc(s)}</th>${cells.map((c) => `<td class="${c === 0 ? 'zero' : ''}">${c === 0 ? '－' : c}</td>`).join('')}<td><b>${total}</b></td></tr>`;
    })
    .join('') +
  '</tbody></table>';
const generated = new Date(Date.now() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16);
const prdCount = rows.filter((r) => r.env.startsWith('全環境')).length;
const knownCount = rows.filter((r) => r.known).length;

const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>テスト観点表</title>
<style>
:root{--bg:#fff;--fg:#1f2328;--muted:#656d76;--line:#d0d7de;--head:#f6f8fa;--accent:#0969da;--zero:#b0b7bf}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--muted:#8b949e;--line:#30363d;--head:#161b22;--accent:#58a6ff;--zero:#4b535c}}
body{font:14px/1.6 system-ui,-apple-system,"Segoe UI","Hiragino Sans","Yu Gothic UI",sans-serif;background:var(--bg);color:var(--fg);margin:0;padding:16px}
main{max-width:1200px;margin:0 auto} h1{font-size:22px} h2{font-size:17px;margin-top:28px}
table{border-collapse:collapse;width:100%} th,td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{background:var(--head)} .matrix td{text-align:center} .zero{color:var(--zero)} .wrap{overflow-x:auto}
.muted{color:var(--muted)} a{color:var(--accent)} input,select{font:inherit;padding:4px 6px;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:4px}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0} #count{margin:4px 0} dl{margin:0} dt{font-weight:600;margin-top:6px}
</style></head><body><main>
<h1>テスト観点表（自動生成）</h1>
<p class="muted">生成: ${generated} JST ／ テスト対象のコードから自動で作っています（手で直さないでください）。CSV（Excel で開けます）: <a href="./test-catalog.csv">test-catalog.csv</a></p>
<p>テストケース <b>${rows.length}</b> 件（うち、デプロイ後の本番確認でも実行する主要機能 <b>${prdCount}</b> 件、既知の不具合を検知するもの <b>${knownCount}</b> 件）。</p>

<h2>画面 × 観点の件数（SauceDemo）</h2>
<p class="muted">「－」は、その組み合わせのテストが<b>まだ無い</b>ことを表します（抜け漏れの確認に使います）。画面は、テスト名のキーワードから推定しています。</p>
<div class="wrap">${matrix}</div>

<h2>用語</h2>
<dl>
<dt>観点</dt><dd>何の品質を確認するテストか。機能（正常系）・異常系・セキュリティ・アクセシビリティ（障害のある人でも使えるか）・VRT（画面の見た目の変化を検知）・ネットワーク（通信の失敗・遅延）など</dd>
<dt>実行環境</dt><dd>「全環境」= PR のテストと、デプロイ後の本番確認の両方で実行。「stg のみ」= PR のテストで実行（フル検証）</dd>
<dt>既知の不具合の検知</dt><dd>テスト対象サイト側の不具合を「失敗すること」として記録しているテスト。サイトが直ると気づける（一覧: Issue「サイト側の不具合の一覧」）</dd>
</dl>

<h2>テストケース一覧</h2>
<div class="filters">
<input id="q" type="search" placeholder="キーワードで絞り込み" aria-label="キーワードで絞り込み">
<select id="fv" aria-label="観点"><option value="">観点: すべて</option>${viewpoints.map((v) => `<option>${esc(v)}</option>`).join('')}</select>
<select id="fs" aria-label="画面"><option value="">画面: すべて</option>${screens.map((v) => `<option>${esc(v)}</option>`).join('')}</select>
<select id="fe" aria-label="実行環境"><option value="">実行環境: すべて</option><option>全環境（stg・prd）</option><option>stg のみ</option></select>
</div>
<div id="count" class="muted"></div>
<div class="wrap"><table id="list"><thead><tr>${COLS.slice(0, 10).map(([, h]) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
${rows.map((r) => `<tr data-v="${esc(r.viewpoint)}" data-s="${esc(r.screen)}" data-e="${esc(r.env)}">${COLS.slice(0, 10).map(([k]) => `<td>${esc(r[k])}</td>`).join('')}</tr>`).join('\n')}
</tbody></table></div>
<script>
const rows=[...document.querySelectorAll('#list tbody tr')];
const q=document.getElementById('q'),fv=document.getElementById('fv'),fs=document.getElementById('fs'),fe=document.getElementById('fe'),cnt=document.getElementById('count');
function apply(){const t=q.value.trim().toLowerCase();let n=0;for(const r of rows){const ok=(!fv.value||r.dataset.v===fv.value)&&(!fs.value||r.dataset.s===fs.value)&&(!fe.value||r.dataset.e===fe.value)&&(!t||r.textContent.toLowerCase().includes(t));r.hidden=!ok;if(ok)n++;}cnt.textContent=n+' 件を表示';}
[q,fv,fs,fe].forEach(e=>e.addEventListener('input',apply));apply();
</script>
</main></body></html>
`;
fs.writeFileSync(path.join(outDir, 'test-catalog.html'), html);

const unclassified = rows.filter((r) => r.viewpoint === '未分類').length;
console.log(`テスト観点表を生成しました: ${rows.length} 件 → ${outDir}/test-catalog.html, .csv, .json`);
if (unclassified > 0) console.warn(`::warning::未分類のテストが ${unclassified} 件あります。scripts/generate-test-catalog.js の FILE_INFO に、新しい spec ファイルを追記してください`);
