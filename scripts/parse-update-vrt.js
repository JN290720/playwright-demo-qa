#!/usr/bin/env node
// PR のコメント `/update-vrt` の「範囲の指定」を、安全に解析する（#117）。
//
// 【目的】`/update-vrt` は、これまで全プロジェクト × 全画面の基準画像を、まとめて更新していた。
//   必要な範囲（プロジェクト・画面）だけに絞れるようにして、意図しない画像の更新を防ぎ、更新の内容をレビューしやすくする。
//
// 書き方（指定が無ければ、今までどおり全部）:
//   /update-vrt
//   /update-vrt project=desktop-safari            プロジェクトを指定（複数はカンマ区切り。別名: pc / mobile / safari）
//   /update-vrt test=P3,P8                        画面（VRT のテスト名の P1〜P14）を指定
//   /update-vrt project=mobile-chrome test=P2     両方を指定
//
// 安全のため、許可リスト方式（決まった名前・形式だけを受け付ける）。コメントの文字列を、そのままシェルに渡さない。
// 使い方（ワークフロー）: 環境変数 COMMENT_BODY にコメント本文を渡す。結果は $GITHUB_OUTPUT に書く。
//   valid / projects（空白区切り）/ grep（空なら全画面）/ scope（表示用の説明）/ error（不正のときの理由）
// 動作確認: node scripts/parse-update-vrt.js --self-test
'use strict';
const fs = require('fs');

const ALL_PROJECTS = ['desktop-chrome', 'mobile-chrome', 'desktop-safari'];
const ALIASES = { pc: 'desktop-chrome', chrome: 'desktop-chrome', mobile: 'mobile-chrome', safari: 'desktop-safari' };
const USAGE = '使い方: `/update-vrt`（全部）、`/update-vrt project=desktop-safari`（プロジェクト指定。別名: pc / mobile / safari。複数はカンマ区切り）、`/update-vrt test=P3,P8`（画面指定。P1〜P14）、両方の併用も可。';

function parse(body) {
  const m = /\/update-vrt\b([^\n]*)/.exec(body || '');
  const rest = (m ? m[1] : '').trim();
  const fail = (error) => ({ valid: false, projects: [], grep: '', scope: '', error: `${error}\n${USAGE}` });

  let projects = null;
  let tests = null;
  for (const token of rest.split(/\s+/).filter(Boolean)) {
    const kv = /^(projects?|tests?)=([A-Za-z0-9,_-]+)$/.exec(token);
    if (!kv) return fail(`指定を解釈できません: \`${token.slice(0, 40)}\``);
    const values = kv[2].split(',').filter(Boolean);
    if (kv[1].startsWith('project')) {
      projects = projects || [];
      for (const v of values) {
        const name = ALIASES[v.toLowerCase()] || v.toLowerCase();
        if (!ALL_PROJECTS.includes(name)) return fail(`プロジェクトの指定が不正です: \`${v.slice(0, 40)}\`（使えるもの: ${ALL_PROJECTS.join(' / ')}）`);
        if (!projects.includes(name)) projects.push(name);
      }
    } else {
      tests = tests || [];
      for (const v of values) {
        const t = /^[Pp](\d{1,2})$/.exec(v);
        if (!t) return fail(`画面（テスト）の指定が不正です: \`${v.slice(0, 40)}\`（P1〜P14 の形式）`);
        const name = `P${Number(t[1])}`;
        if (!tests.includes(name)) tests.push(name);
      }
    }
  }
  if (projects && projects.length === 0) return fail('project= の値が空です');
  if (tests && tests.length === 0) return fail('test= の値が空です');
  if (tests && tests.length > 20) return fail('test= の指定が多すぎます（20 件まで）');

  const finalProjects = projects || ALL_PROJECTS;
  // VRT のテスト名は「P3: 商品詳細ページの…」の形。「P3: 」に合うものだけに絞る（P3 が P30 に合わないよう、コロンまで含める）
  const grep = tests ? `(${tests.join('|')}): ` : '';
  const scope = !projects && !tests ? '全プロジェクト・全画面' : `プロジェクト: ${finalProjects.join(', ')} ／ 画面: ${tests ? tests.join(', ') : '全画面'}`;
  return { valid: true, projects: finalProjects, grep, scope, error: '' };
}

function selfTest() {
  const assert = require('assert');
  const ok = (body, projects, grep) => {
    const r = parse(body);
    assert.strictEqual(r.valid, true, `${body} -> ${r.error}`);
    assert.deepStrictEqual(r.projects, projects, body);
    assert.strictEqual(r.grep, grep, body);
  };
  const ng = (body) => assert.strictEqual(parse(body).valid, false, `${body} は不正のはず`);
  ok('/update-vrt', ALL_PROJECTS, '');
  ok('お願いします\n/update-vrt\nありがとう', ALL_PROJECTS, '');
  ok('/update-vrt project=desktop-safari', ['desktop-safari'], '');
  ok('/update-vrt project=safari,pc', ['desktop-safari', 'desktop-chrome'], '');
  ok('/update-vrt projects=Mobile', ['mobile-chrome'], '');
  ok('/update-vrt test=P3,p8', ALL_PROJECTS, '(P3|P8): ');
  ok('/update-vrt project=mobile-chrome test=P2', ['mobile-chrome'], '(P2): ');
  ok('/update-vrt test=P03', ALL_PROJECTS, '(P3): ');
  ok('/update-vrt test=P3,P3', ALL_PROJECTS, '(P3): ');
  // 不正（シェル・正規表現への混入を防ぐ）
  ng('/update-vrt project=foo');
  ng('/update-vrt project=safari; rm -rf /');
  ng('/update-vrt test=P3|.*');
  ng('/update-vrt test=P3 && echo hi');
  ng('/update-vrt test=$(id)');
  ng('/update-vrt grep=.*');
  ng('/update-vrt all');
  ng('/update-vrt project=');
  ng('/update-vrt test=Q3');
  ng('/update-vrt test=P123');
  // 指定の途中に、`/update-vrt` が含まれていても、その行の指定を読む
  ok('メモ: /update-vrt project=safari', ['desktop-safari'], '');
  console.log('self-test: OK');
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const r = parse(process.env.COMMENT_BODY || '');
  const lines = [`valid=${r.valid}`, `projects=${r.projects.join(' ')}`, `grep=${r.grep}`, `scope=${r.scope}`];
  // error は複数行になるため、GitHub Actions の出力の形式（EOF 区切り）で書く
  const out = process.env.GITHUB_OUTPUT;
  if (out) {
    fs.appendFileSync(out, lines.join('\n') + `\nerror<<__EOF__\n${r.error}\n__EOF__\n`);
  }
  console.log(JSON.stringify(r, null, 2));
}
