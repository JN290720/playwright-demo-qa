#!/usr/bin/env node
// テスト観点ごとの Issue（親 + 観点ごとのサブ Issue）の「テストケースの表」を、コードから自動で更新する（#39）。
//
// 【目的】テストの観点・ケースを、Issue でも確認・議論できるようにする（確認しやすく、再利用しやすい）。
//   ただし、全ケースを 1 件ずつ Issue にすると、件数が多すぎ（GitHub のサブ Issue は 1 つの親に 100 件まで）、
//   手で書いた内容は、コードとずれていく。そのため、
//     ・親 Issue: 概要 + 観点ごとの件数 + 画面 × 観点の件数表（「－」= テストがまだ無い組み合わせ）
//     ・観点ごとのサブ Issue（約 9 件）: その観点のテストケースの表
//   とし、**表は、テストのコードから自動で作る**（scripts/generate-test-catalog.js の出力 test-catalog.json を使う）。
//   新しく作るテスト（抜けている観点）は、1 件ずつ別の Issue にする（作業そのものなので、Issue の流れに合う）。
//
// 自動で更新するのは、本文の「<!-- catalog:start -->」〜「<!-- catalog:end -->」の間だけ。それ以外（目的・評価・関連 Issue）は、人が編集できる。
//
// 使い方:
//   node scripts/sync-test-viewpoint-issues.js <test-catalog.json>            表を更新する（Issue が無い観点は、警告してスキップ）
//   node scripts/sync-test-viewpoint-issues.js <test-catalog.json> --create   親・サブ Issue が無ければ作成し、親に紐づける
// 環境変数: GH_TOKEN, GITHUB_REPOSITORY（必須）, DRY_RUN=1（変更せず、予定を表示）
'use strict';
const fs = require('fs');
const crypto = require('crypto');

const input = process.argv.find((a, i) => i >= 2 && !a.startsWith('--')) || 'public/test-catalog.json';
const CREATE = process.argv.includes('--create');
const DRY = process.env.DRY_RUN === '1';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY;
const LABEL = 'test-viewpoint';
const PARENT_TITLE = 'テスト観点一覧（親）: 何を、どこまでテストしているか';
const subTitle = (vp) => `[観点] ${vp}`;
const START = '<!-- catalog:start -->';
const END = '<!-- catalog:end -->';

if (!TOKEN || !REPO) {
  console.error('GH_TOKEN と GITHUB_REPOSITORY が必要です');
  process.exit(2);
}
if (!fs.existsSync(input)) {
  console.error(`観点表の JSON がありません: ${input}（先に node scripts/generate-test-catalog.js を実行してください）`);
  process.exit(2);
}
const catalog = JSON.parse(fs.readFileSync(input, 'utf8'));
const REPO_URL = `https://github.com/${REPO}`;

// 観点ごとの説明（Issue を作るときの初期の本文。作成後は、人が編集してよい）
const VIEWPOINT_INFO = {
  '機能（正常系）': { purpose: '決められた操作を行ったときに、期待どおりに動くか（ログイン、カートへの追加、購入完了など、利用者が普通に行う操作）。', terms: '正常系 = 入力や操作が正しいときの動き。' },
  '機能（特殊ユーザー）': { purpose: 'テスト対象サイトが用意している、遅延や不具合を再現する特殊ユーザー（`performance_glitch_user` / `problem_user` / `error_user` / `visual_user`）の挙動の確認。タイムアウトの妥当性の確認と、既知の不具合の検知（サイトが直ると気づける）が目的。', terms: '`test.fail()` = 「失敗すること」を期待するテスト。サイトが直って成功すると、テストが失敗として報告される。' },
  '異常系': { purpose: '入力ミスや不足など、利用者が誤った操作をしたときに、適切なエラー表示になるか（購入者情報の未入力、ログイン失敗など）。', terms: '異常系 = 入力や操作が正しくないときの動き。' },
  '異常系・破壊的操作': { purpose: '「意地悪な」操作（連打、空白だけの入力、戻るボタン、前後の空白、ロックされたユーザーなど）をしても、壊れたり、不正に動いたりしないか。', terms: '破壊的操作 = 通常は想定されない、アプリを壊しかねない操作。' },
  'セキュリティ': { purpose: '悪意のある入力（SQL インジェクション、XSS など）や、未ログインでの直接アクセスなどに対して、安全に振る舞うか。', terms: 'SQL インジェクション・XSS = 入力欄に不正な命令・スクリプトを入れて、サイトを不正に操作する攻撃。' },
  'アクセシビリティ': { purpose: '障害のある人や高齢の人でも使えるか（スクリーンリーダー、キーボードだけの操作、色のコントラストなど）。axe（自動検査）による WCAG 2.1 A / AA の検査と、キーボード操作のテスト。', terms: 'WCAG = Web Content Accessibility Guidelines。アクセシビリティの国際的な基準。axe = その自動検査ツール。' },
  'VRT（見た目）': { purpose: '画面の見た目が、意図せず変わっていないか。スクリーンショットを基準画像と比べて検知する（PC Chrome・スマホ Chrome・Safari・Android）。ユーザーに影響しないピクセル単位の揺れは許容する（ユーザー判断）。', terms: 'VRT = Visual Regression Test。基準画像 = 「正しい見た目」として保存しておく画像。' },
  'ネットワーク': { purpose: '通信の失敗・遅延・オフラインのときに、画面が適切に振る舞うか（画像の読み込み失敗、遅い通信、通信断）。通信をテストの中で模擬（モック）して再現する。', terms: 'モック = 本物の通信の代わりに、決まった応答を返す仕組み。' },
  API: { purpose: 'API（画面を介さない、データのやり取り）が正しく応答するか。外部の公開 API（jsonplaceholder）が対象のデモ。', terms: 'API = プログラム同士が、データをやり取りするための窓口。' },
};

async function api(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(init.headers || {}) },
  });
  if (!res.ok) {
    const err = new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const fileLink = (f) => `[${f.replace('.spec.ts', '')}](${REPO_URL}/blob/main/tests/${f})`;

function viewpointTable(rows) {
  const lines = ['| 画面 | 確認すること | 実行環境 | ブラウザ（PR・週次） | Android（夜間） | 既知の不具合の検知 | ファイル |', '|---|---|---|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${esc(r.screen)} | ${esc(r.title)} | ${esc(r.env)} | ${esc(r.browsers)} | ${esc(r.android)} | ${esc(r.known ? '○' : '')} | ${fileLink(r.file)} |`);
  return lines.join('\n');
}

function matrixTable() {
  const sauce = catalog.rows.filter((r) => r.site.startsWith('SauceDemo'));
  const head = `| 画面 ＼ 観点 | ${catalog.viewpoints.map(esc).join(' | ')} | 計 |`;
  const sep = `|---|${catalog.viewpoints.map(() => '---').join('|')}|---|`;
  const body = catalog.screens.map((s) => {
    const cells = catalog.viewpoints.map((v) => sauce.filter((r) => r.screen === s && r.viewpoint === v).length);
    return `| ${esc(s)} | ${cells.map((c) => (c === 0 ? '－' : c)).join(' | ')} | **${cells.reduce((a, b) => a + b, 0)}** |`;
  });
  return [head, sep, ...body].join('\n');
}

// 本文の中の、自動更新の範囲（catalog:start〜end）だけを差し替える。範囲が無ければ、末尾に追加する
const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
function withCatalog(body, content) {
  const block = `${START}\n${content}\n${END}`;
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  return re.test(body || '') ? body.replace(re, () => block) : `${(body || '').trimEnd()}\n\n${block}\n`;
}
const catalogSig = (body) => {
  const m = new RegExp(`${START}([\\s\\S]*?)${END}`).exec(body || '');
  return m ? hash(m[1].replace(/^更新:.*$/m, '')) : '';
};

function subContent(vp) {
  const rows = catalog.rows.filter((r) => r.viewpoint === vp);
  const known = rows.filter((r) => r.known).length;
  const prd = rows.filter((r) => r.env.startsWith('全環境')).length;
  return [
    `**${rows.length} 件**（うち、デプロイ後の本番確認でも実行 ${prd} 件、既知の不具合の検知 ${known} 件）`,
    '',
    viewpointTable(rows),
    '',
    `更新: ${new Date(Date.now() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16)} JST（\`scripts/sync-test-viewpoint-issues.js\`。テストのコードから自動生成）`,
  ].join('\n');
}

function subInitialBody(vp) {
  const info = VIEWPOINT_INFO[vp] || { purpose: '（未記入）', terms: '' };
  return `**親 Issue**: 「${PARENT_TITLE}」 ／ 一覧（最新）: [テスト観点表](https://${REPO.split('/')[0].toLowerCase()}.github.io/${REPO.split('/')[1]}/test-catalog.html)

## この観点について（目的）
${info.purpose}

${info.terms ? `**用語**: ${info.terms}\n` : ''}
## 現状の評価・課題（人が記入）
（この観点で、足りていないこと・気づいたこと。抜けているテストは、1 件ずつ別の Issue にして、下に紐づける）

## 関連する作業の Issue（抜けている観点・改善）
（例: #123 …）

## テストケース（自動生成。この範囲は、手で編集しないでください）
`;
}

function parentContent(subs) {
  const rows = catalog.viewpoints.map((vp) => {
    const n = catalog.rows.filter((r) => r.viewpoint === vp).length;
    return `| ${esc(vp)} | ${n} | ${subs[vp] ? `#${subs[vp]}` : '（未作成）'} |`;
  });
  return [
    `**テストケース ${catalog.rows.length} 件**（観点ごとの内訳は、下の表。各観点の Issue に、ケースの表がある）`,
    '',
    '| 観点 | 件数 | Issue |',
    '|---|---|---|',
    ...rows,
    '',
    '### 画面 × 観点の件数（SauceDemo。「－」= その組み合わせのテストが、まだ無い）',
    '画面は、テスト名のキーワードから推定している。',
    '',
    matrixTable(),
    '',
    `更新: ${new Date(Date.now() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16)} JST（\`scripts/sync-test-viewpoint-issues.js\`。テストのコードから自動生成）`,
  ].join('\n');
}

const PARENT_INITIAL = `**テストの観点（何を確認するテストか）ごとに、テストケースを確認・議論するための親 Issue です。**

## 目的
- 「何を、どこまでテストしているか」を、Issue で確認・議論できるようにする（確認しやすく、再利用しやすい）
- 抜けている観点を見つけ、作業の Issue にする

## 構成
- **この親 Issue**: 概要・観点ごとの件数・画面 × 観点の件数表
- **観点ごとのサブ Issue**（\`[観点] …\`）: その観点の目的と、**テストケースの表（コードから自動更新）**
- **新しく作るテスト（抜けている観点）**: **1 件ずつ別の Issue**（作業そのものなので）。下の「作業の Issue」に紐づける
- **サイト側の不具合**: 別の親 Issue（#97）とそのサブ Issue
- 最新の一覧（絞り込み・Excel 用の CSV）: [テスト観点表](https://${(REPO || '').split('/')[0].toLowerCase()}.github.io/${(REPO || '').split('/')[1]}/test-catalog.html)

## なぜ「全ケースを 1 件ずつ Issue」にしないのか
- 件数が多すぎる（GitHub のサブ Issue は 1 つの親に 100 件まで。通知・バックログ・日次レポートも埋もれる）
- 手で書いた内容は、コードとずれる。表は、コードから自動で作る
- テストケースは永続するもので、「完了して閉じる」という Issue の流れに合わない

## 作業の Issue（抜けている観点・改善。人が更新）
（下の件数表で「－」の場所のうち、価値が高いもの）

## 概要（自動生成。この範囲は、手で編集しないでください）
`;

async function findIssue(title) {
  const found = await api(`/repos/${REPO}/issues?state=all&labels=${LABEL}&per_page=100`);
  return found.find((i) => !i.pull_request && i.title === title) || null;
}

async function ensureLabel() {
  try {
    await api(`/repos/${REPO}/labels`, { method: 'POST', body: JSON.stringify({ name: LABEL, color: '0E8A16', description: 'テスト観点（親・観点ごとのサブ Issue）' }) });
  } catch (e) {
    if (e.status !== 422) throw e;
  }
}

async function createIssue(title, body) {
  const created = await api(`/repos/${REPO}/issues`, { method: 'POST', body: JSON.stringify({ title, body, labels: [LABEL] }) });
  return created;
}

async function main() {
  let parent = await findIssue(PARENT_TITLE);
  const subs = {};
  const existing = {};
  for (const vp of catalog.viewpoints) existing[vp] = await findIssue(subTitle(vp));

  if (CREATE) {
    if (!DRY) await ensureLabel();
    if (!parent) {
      console.log(`${DRY ? '[dry-run] ' : ''}親 Issue を作成します: ${PARENT_TITLE}`);
      if (!DRY) parent = await createIssue(PARENT_TITLE, PARENT_INITIAL + `${START}\n(作成直後。まもなく更新されます)\n${END}\n`);
    }
    for (const vp of catalog.viewpoints) {
      if (existing[vp]) continue;
      console.log(`${DRY ? '[dry-run] ' : ''}サブ Issue を作成します: ${subTitle(vp)}`);
      if (DRY) continue;
      existing[vp] = await createIssue(subTitle(vp), subInitialBody(vp) + `${START}\n(作成直後。まもなく更新されます)\n${END}\n`);
      if (parent) {
        try {
          await api(`/repos/${REPO}/issues/${parent.number}/sub_issues`, { method: 'POST', body: JSON.stringify({ sub_issue_id: existing[vp].id }) });
        } catch (e) {
          if (e.status !== 422) throw e; // 既に紐づいている
        }
      }
    }
  }
  for (const vp of catalog.viewpoints) if (existing[vp]) subs[vp] = existing[vp].number;

  // 観点ごとのサブ Issue の表を更新
  for (const vp of catalog.viewpoints) {
    const issue = existing[vp];
    if (!issue) {
      console.warn(`::warning::観点「${vp}」の Issue（${subTitle(vp)}）がありません。--create で作成してください`);
      continue;
    }
    const content = subContent(vp);
    const next = withCatalog(issue.body, content);
    if (catalogSig(issue.body) === catalogSig(next) && /<!-- catalog:start -->/.test(issue.body || '')) {
      console.log(`変更なし: #${issue.number} ${subTitle(vp)}`);
      continue;
    }
    console.log(`${DRY ? '[dry-run] ' : ''}更新: #${issue.number} ${subTitle(vp)}`);
    if (!DRY) await api(`/repos/${REPO}/issues/${issue.number}`, { method: 'PATCH', body: JSON.stringify({ body: next }) });
  }

  // 親 Issue の概要を更新
  if (parent) {
    const next = withCatalog(parent.body, parentContent(subs));
    if (catalogSig(parent.body) === catalogSig(next) && /<!-- catalog:start -->/.test(parent.body || '')) console.log(`変更なし: #${parent.number} 親 Issue`);
    else {
      console.log(`${DRY ? '[dry-run] ' : ''}更新: #${parent.number} 親 Issue`);
      if (!DRY) await api(`/repos/${REPO}/issues/${parent.number}`, { method: 'PATCH', body: JSON.stringify({ body: next }) });
    }
  } else {
    console.warn('::warning::親 Issue がありません。--create で作成してください');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
