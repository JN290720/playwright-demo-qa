#!/usr/bin/env node
// 週次の依存関係レビュー。Dependabot のバージョン更新 PR の代わりに、更新の「提案」を Issue に書く（#20 / #35）。
// 事実（現在の版・最新版・公開日・脆弱性）は、npm レジストリと GitHub API から機械的に取得する。
//
// 選定基準（#35、ユーザー承認済み）:
//   1. クールダウン: 公開から 14 日未満の版は選ばない（直前の安定版を提案する）
//   2. メジャーは自動で上げない: 現在と同じメジャーの範囲で提案し、新しいメジャーは「情報」として載せる
//   3. セキュリティ修正は例外: 脆弱性（npm audit）がある場合は、別枠で優先して載せる
//
// 使い方:
//   node scripts/dependency-review.js          # Markdown を標準出力へ（投稿はしない）
//   GH_TOKEN=... node scripts/dependency-review.js --post   # 提案があれば Issue（ラベル dependency-review）にコメント投稿
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COOLDOWN_DAYS = Number(process.env.COOLDOWN_DAYS || 14);
const REPO = process.env.GITHUB_REPOSITORY || process.env.REPO || 'JN290720/playwright-demo-qa';
const LABEL = 'dependency-review';
const POST = process.argv.includes('--post');
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const now = Date.now();
const ageDays = (iso) => (now - new Date(iso).getTime()) / 86400000;

const parse = (v) => {
  const m = String(v).replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  return m ? { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] || null, raw: v } : null;
};
const cmp = (a, b) => a.major - b.major || a.minor - b.minor || a.patch - b.patch;

async function gh(pathname, init = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}), ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${pathname} -> ${res.status}`);
  return res.json();
}

// 候補 = 現在と同じメジャーで、安定版（pre なし）かつ公開から COOLDOWN_DAYS 日以上たった最新版
function pickCandidate(current, releases) {
  const cur = parse(current);
  if (!cur) return { candidate: null, newestMajor: null };
  const stable = releases.filter((r) => r.v && !r.v.pre);
  const sameMajor = stable.filter((r) => r.v.major === cur.major && ageDays(r.date) >= COOLDOWN_DAYS).sort((a, b) => cmp(b.v, a.v));
  const candidate = sameMajor[0] && cmp(sameMajor[0].v, cur) > 0 ? sameMajor[0] : null;
  const newer = stable.filter((r) => r.v.major > cur.major).sort((a, b) => cmp(b.v, a.v))[0] || null;
  const latestSame = stable.filter((r) => r.v.major === cur.major).sort((a, b) => cmp(b.v, a.v))[0] || null;
  return { candidate, newestMajor: newer, latestSame };
}

async function npmSection() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const rows = [];
  for (const name of Object.keys(deps).sort()) {
    const current = lock.packages?.[`node_modules/${name}`]?.version;
    if (!current) continue;
    const meta = await (await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}`)).json();
    const releases = Object.entries(meta.time || {})
      .filter(([v]) => parse(v))
      .map(([v, date]) => ({ v: parse(v), date }));
    const { candidate, newestMajor, latestSame } = pickCandidate(current, releases);
    rows.push({ name, current, candidate, newestMajor, latestSame });
  }
  return rows;
}

function auditSection() {
  try {
    const out = execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return JSON.parse(out).metadata?.vulnerabilities || {};
  } catch (e) {
    try {
      return JSON.parse(e.stdout).metadata?.vulnerabilities || {};
    } catch {
      return null;
    }
  }
}

async function actionsSection() {
  const dir = '.github/workflows';
  const used = new Map(); // "owner/repo" -> Set(ref)
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.yml'))) {
    for (const m of fs.readFileSync(path.join(dir, f), 'utf8').matchAll(/uses:\s*([\w.-]+\/[\w.-]+)@([\w.-]+)/g)) {
      if (!used.has(m[1])) used.set(m[1], new Set());
      used.get(m[1]).add(m[2]);
    }
  }
  const rows = [];
  for (const [repo, refs] of [...used.entries()].sort()) {
    let releases = [];
    try {
      const list = await gh(`/repos/${repo}/releases?per_page=50`);
      releases = list.filter((r) => !r.prerelease && !r.draft).map((r) => ({ v: parse(r.tag_name), date: r.published_at, tag: r.tag_name }));
    } catch {
      /* 取得できないものは空 */
    }
    for (const ref of [...refs].sort()) {
      const major = String(ref).match(/^v?(\d+)$/);
      const cur = major ? `${major[1]}.0.0` : ref;
      const { candidate, newestMajor } = pickCandidate(cur, releases);
      rows.push({ repo, ref, candidate: candidate?.v.raw, candidateDate: candidate?.date, newestMajor: newestMajor?.v.raw, isFloatingMajor: !!major });
    }
  }
  return rows;
}

const d = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

async function main() {
  const npmRows = await npmSection();
  const audit = auditSection();
  const actions = await actionsSection();

  const lines = [`# 依存関係レビュー（${new Date().toISOString().slice(0, 10)}）`, ''];
  lines.push(`> 選定基準: 公開から ${COOLDOWN_DAYS} 日以上たった安定版 / メジャーは手動 / セキュリティ修正は例外（#35）。事実は npm レジストリ・GitHub API から機械的に取得しています。`, '');

  lines.push('## 脆弱性（`npm audit`）');
  if (!audit) lines.push('- 取得できませんでした');
  else {
    const total = Object.values(audit).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) - (audit.total || 0);
    lines.push(audit.total === 0 || total === 0 ? '- **0 件**' : `- ⚠️ ${JSON.stringify(audit)} → **セキュリティ修正は基準に関わらず優先して対応してください**`);
  }
  lines.push('');

  lines.push('## npm パッケージ');
  lines.push('| パッケージ | 現在 | 提案（同一メジャー・クールダウン後） | 新しいメジャー（情報のみ） |', '|---|---|---|---|');
  let proposals = 0;
  for (const r of npmRows) {
    if (r.candidate) proposals++;
    lines.push(`| \`${r.name}\` | ${r.current} | ${r.candidate ? `**${r.candidate.v.raw}**（${d(r.candidate.date)}）` : '現状維持'} | ${r.newestMajor ? `${r.newestMajor.v.raw}（${d(r.newestMajor.date)}）` : '—'} |`);
  }
  lines.push('');

  lines.push('## GitHub Actions');
  lines.push('| Action | 現在の指定 | 提案（同一メジャー・クールダウン後） | 新しいメジャー（情報のみ） |', '|---|---|---|---|');
  for (const r of actions) {
    if (r.candidate && !r.isFloatingMajor) proposals++;
    lines.push(`| \`${r.repo}\` | \`${r.ref}\` | ${r.candidate ? (r.isFloatingMajor ? `v${r.ref.replace(/^v/, '')} 系の最新は ${r.candidate}（${d(r.candidateDate)}）` : `**${r.candidate}**（${d(r.candidateDate)}）`) : '現状維持'} | ${r.newestMajor || '—'} |`);
  }
  lines.push('', '---', `提案: **${proposals} 件**（Actions の \`v4\` のようなメジャー指定は、同一メジャー内の更新を自動で受けるため、提案件数には含めません）。更新するときは、PR で CI（特に VRT）を確認し、画像が変わる場合は \`/update-vrt\` の運用に従ってください。`);

  const body = lines.join('\n');
  if (!POST) {
    process.stdout.write(body + '\n');
    return;
  }
  if (!TOKEN) throw new Error('GH_TOKEN が必要です');
  if (proposals === 0 && audit && Object.values(audit).every((v) => v === 0 || typeof v !== 'number')) {
    console.log('提案なし。投稿しません。');
    return;
  }
  const found = await gh(`/repos/${REPO}/issues?state=open&labels=${LABEL}&per_page=1`);
  let number = found[0]?.number;
  if (!number) {
    try {
      await gh(`/repos/${REPO}/labels`, { method: 'POST', body: JSON.stringify({ name: LABEL, color: 'C2E0C6', description: '週次の依存関係レビュー' }) });
    } catch {
      /* 既にあれば無視 */
    }
    const created = await gh(`/repos/${REPO}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title: '依存関係レビュー（週次・自動）', labels: [LABEL, 'P3'], body: '毎週月曜に、依存関係の更新の提案を自動で投稿する Issue です（`scripts/dependency-review.js`）。更新するかどうかの判断は、ここへコメントしてください。' }),
    });
    number = created.number;
  }
  const posted = await gh(`/repos/${REPO}/issues/${number}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  console.log(`投稿しました: ${posted.html_url}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
