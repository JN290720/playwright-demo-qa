#!/usr/bin/env node
// 日次レポートを生成する（本体 playwright-demo と QA playwright-demo-qa を分けて、優先度順に並べる）。
// 事実（CI の状況・PR・Issue・ラベル）は GitHub API から取得して機械的に書く。Claude の記憶には頼らない。
//
// 使い方:
//   GH_TOKEN=... node scripts/daily-report.js            # Markdown を標準出力へ（投稿はしない）
//   GH_TOKEN=... node scripts/daily-report.js --post     # 日次レポート用の Issue にコメントとして投稿する
//
// 同じ日（JST）のレポートが投稿済みなら、定時実行（schedule）は投稿しない（予備の実行との重複を防ぐ）。手動実行は常に投稿する。
//
// 環境変数: GH_TOKEN（必須）, REPO_QA, REPO_MAIN, REPORT_LABEL（既定 daily-report）, WINDOW_HOURS（既定 24）
//
// 書き先（PWQA-42。課題管理を Backlog へ移す段階 5 の 2）:
//   NOTIFY_TARGETS=github,backlog で、Backlog の月ごとの固定の課題「日次レポート YYYY-MM（自動）」にも同じ本文をコメントする（既定は github だけ）。
//   Backlog の設定: BACKLOG_API_KEY・BACKLOG_SPACE（scripts/lib/backlog.js を参照）と、BACKLOG_PROJECT_KEY（プロジェクトキー。変数）。
//   移行の間は GitHub 側が正。Backlog への投稿の失敗は、警告だけで、GitHub への投稿は止めない。
'use strict';

const { parseTargets, missingConfig, createClient } = require('./lib/backlog');
const { postDailyReport } = require('./lib/backlog-daily');

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const REPO_QA = process.env.REPO_QA || 'JN290720/playwright-demo-qa';
const REPO_MAIN = process.env.REPO_MAIN || 'JN290720/playwright-demo';
const REPORT_LABEL = process.env.REPORT_LABEL || 'daily-report';
const WINDOW_HOURS = Number(process.env.WINDOW_HOURS || 24);
const POST = process.argv.includes('--post');

if (!TOKEN) {
  console.error('GH_TOKEN が必要です');
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
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

async function listAll(path, max = 300) {
  const out = [];
  for (let page = 1; out.length < max; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const items = await api(`${path}${sep}per_page=100&page=${page}`);
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

const PRIORITIES = ['P0', 'P1', 'P2', 'P3'];
const priorityOf = (labels) => PRIORITIES.find((p) => labels.includes(p)) || 'P?';
const labelNames = (item) => item.labels.map((l) => (typeof l === 'string' ? l : l.name));
const byPriorityThenNumber = (a, b) =>
  PRIORITIES.concat('P?').indexOf(priorityOf(labelNames(a))) -
    PRIORITIES.concat('P?').indexOf(priorityOf(labelNames(b))) || a.number - b.number;
const fmtTime = (iso) =>
  new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const esc = (s) => String(s).replace(/\|/g, '\\|');

async function ciOfPr(repo, pr) {
  try {
    const data = await api(`/repos/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`);
    const runs = data.check_runs || [];
    if (runs.length === 0) return '—';
    if (runs.some((r) => r.status !== 'completed')) return '実行中';
    if (runs.some((r) => ['failure', 'timed_out', 'action_required'].includes(r.conclusion))) return '失敗';
    if (runs.some((r) => r.conclusion === 'cancelled')) return 'キャンセル';
    return '成功';
  } catch {
    return '?';
  }
}

async function repoSection(repo, title, since) {
  const lines = [`## ${title}（\`${repo}\`）`, ''];

  // --- ワークフロー状況 ---
  const runsData = await api(`/repos/${repo}/actions/runs?per_page=50`);
  const runs = runsData.workflow_runs || [];
  const windowRuns = runs.filter((r) => new Date(r.created_at) >= since);
  const failed = windowRuns.filter((r) => r.conclusion === 'failure');
  const inProgress = runs.filter((r) => r.status !== 'completed');
  lines.push('### 1. ワークフロー状況');
  lines.push(`- 直近 ${WINDOW_HOURS} 時間の実行: ${windowRuns.length} 件（失敗 **${failed.length}**、実行中 ${inProgress.length}）`);
  for (const r of failed.slice(0, 10)) lines.push(`  - 失敗: ${esc(r.name)} / \`${r.head_branch}\` — ${r.html_url}`);
  lines.push('');

  // --- Issue / PR ---
  const issuesAll = await listAll(`/repos/${repo}/issues?state=open`);
  const openIssues = issuesAll.filter((i) => !i.pull_request).filter((i) => !labelNames(i).includes('backlog'));
  const prsOpen = await listAll(`/repos/${repo}/pulls?state=open`);

  // 直近の動き
  const recent = await listAll(`/repos/${repo}/issues?state=all&since=${since.toISOString()}`, 200);
  const createdIssues = recent.filter((i) => !i.pull_request && new Date(i.created_at) >= since);
  const closedIssues = recent.filter((i) => !i.pull_request && i.closed_at && new Date(i.closed_at) >= since);
  const createdPrs = recent.filter((i) => i.pull_request && new Date(i.created_at) >= since);
  const mergedPrs = recent.filter((i) => i.pull_request && i.pull_request.merged_at && new Date(i.pull_request.merged_at) >= since);
  lines.push(`### 2. 直近 ${WINDOW_HOURS} 時間に進んだこと`);
  lines.push(`- 起票した Issue: ${createdIssues.length} 件 / クローズした Issue: ${closedIssues.length} 件`);
  lines.push(`- 作成した PR: ${createdPrs.length} 件 / マージされた PR: ${mergedPrs.length} 件`);
  for (const p of mergedPrs.slice(0, 15)) lines.push(`  - マージ: #${p.number} ${esc(p.title)}`);
  lines.push('');

  // --- 判断待ち・止まっていること ---
  const needsDecision = openIssues.filter((i) => labelNames(i).includes('needs-user-decision')).sort(byPriorityThenNumber);
  const blocked = openIssues.filter((i) => labelNames(i).includes('blocked-by-merge')).sort(byPriorityThenNumber);
  lines.push('### 3. 止まっていること');
  if (blocked.length === 0) lines.push('- 先行 PR のマージ待ちで止まっている Issue: なし');
  else {
    lines.push(`- 先行 PR のマージ待ちで止まっている Issue（\`blocked-by-merge\`）: ${blocked.length} 件`);
    for (const i of blocked) lines.push(`  - ${priorityOf(labelNames(i))} #${i.number} ${esc(i.title)}`);
  }
  lines.push('');

  lines.push('### 4. ユーザーに確認が必要なこと');
  lines.push('');
  lines.push(`**マージ待ちの PR（${prsOpen.length} 件）** — 優先度順。CI は各 PR の最新コミットの結果`);
  if (prsOpen.length > 0) {
    lines.push('');
    lines.push('| 優先度 | PR | CI | 内容 |');
    lines.push('|---|---|---|---|');
    const prRows = [];
    for (const pr of prsOpen) {
      const labels = labelNames(pr);
      const ci = await ciOfPr(repo, pr);
      prRows.push({ number: pr.number, labels, row: `| ${priorityOf(labels)} | #${pr.number}${pr.draft ? '（ドラフト）' : ''} | ${ci} | ${esc(pr.title)} |` });
    }
    prRows.sort(byPriorityThenNumber);
    for (const p of prRows) lines.push(p.row);
  }
  lines.push('');
  lines.push(`**判断待ちの Issue（\`needs-user-decision\`、${needsDecision.length} 件）** — 優先度順`);
  if (needsDecision.length > 0) {
    lines.push('');
    for (const i of needsDecision) lines.push(`- ${priorityOf(labelNames(i))} #${i.number} ${esc(i.title)}`);
  }
  lines.push('');

  // --- 次にやること ---
  const ready = openIssues.filter((i) => labelNames(i).includes('ready-for-pr')).sort(byPriorityThenNumber);
  lines.push('### 5. 次にやること');
  if (ready.length === 0) lines.push('- 着手可能（`ready-for-pr`）な Issue: なし');
  else {
    lines.push(`- 着手可能（\`ready-for-pr\`）な Issue: ${ready.length} 件`);
    for (const i of ready) lines.push(`  - ${priorityOf(labelNames(i))} #${i.number} ${esc(i.title)}`);
  }
  // ナレッジ（`knowledge`: 知識・報告のための Issue。次のアクションが基本無い）は、優先度の付け忘れの警告から除く
  const noPriority = openIssues
    .filter((i) => !labelNames(i).includes('knowledge'))
    .filter((i) => priorityOf(labelNames(i)) === 'P?');
  if (noPriority.length > 0) lines.push(`- ⚠️ 優先度ラベルが無い Issue: ${noPriority.map((i) => `#${i.number}`).join(', ')}`);
  lines.push('');
  return lines.join('\n');
}

async function findOrCreateReportIssue() {
  const found = await api(`/repos/${REPO_QA}/issues?state=open&labels=${encodeURIComponent(REPORT_LABEL)}&per_page=1`);
  if (found.length > 0) return found[0].number;
  try {
    await api(`/repos/${REPO_QA}/labels`, { method: 'POST', body: JSON.stringify({ name: REPORT_LABEL, color: 'BFD4F2', description: '日次レポート用の Issue' }) });
  } catch {
    /* 既にあれば無視 */
  }
  const created = await api(`/repos/${REPO_QA}/issues`, {
    method: 'POST',
    body: JSON.stringify({
      title: '日次レポート（毎朝 8:00 JST に自動投稿）',
      labels: [REPORT_LABEL],
      body: '毎朝 8:00 JST に、本体 `playwright-demo` と QA `playwright-demo-qa` の状況を自動で投稿する Issue です（`scripts/daily-report.js`）。\n\n事実は GitHub API から機械的に取得しています。判断や所見は、この下のコメントや各 Issue に書きます。',
    }),
  });
  return created.number;
}

async function main() {
  const now = new Date();
  const since = new Date(now.getTime() - WINDOW_HOURS * 3600 * 1000);
  const head = [
    `# 日次レポート（${fmtTime(now.toISOString())} JST）`,
    '',
    `> 直近 ${WINDOW_HOURS} 時間（${fmtTime(since.toISOString())} 〜）の状況です。本体とQAは分け、優先度（P0 緊急 / P1 高 / P2 中 / P3 低）順に並べています。`,
    '> マージは、ユーザーの確認のうえで行います（1 件ずつ、テスト完了後に次へ）。',
    '',
  ].join('\n');
  const main = await repoSection(REPO_MAIN, '本体', since);
  const qa = await repoSection(REPO_QA, 'QA', since);
  const jstDate = new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const marker = `<!-- daily-report:${jstDate} -->`; // 同じ日の重複投稿を見分けるための目印（画面には表示されない）
  const body = `${head}\n${main}\n---\n\n${qa}\n---\n*自動生成: \`scripts/daily-report.js\`（GitHub Actions）*\n${marker}\n`;

  if (!POST) {
    process.stdout.write(body);
    return;
  }
  const targets = parseTargets();
  // Backlog 側は、GitHub への投稿の成否にかかわらず、最後に試す（GitHub 側が止まっても、Backlog には書く／逆も、失敗は警告に留める）
  try {
    if (targets.has('github')) await postToGitHub(body, marker, jstDate, now);
  } finally {
    if (targets.has('backlog')) await postToBacklog(body, marker, jstDate);
  }
}

async function postToGitHub(body, marker, jstDate, now) {
  const issue = await findOrCreateReportIssue();
  if (process.env.GITHUB_EVENT_NAME === 'schedule') {
    // 予備の実行との重複を防ぐ: 今日（JST）のレポートが投稿済みなら、投稿しない
    const since36h = new Date(now.getTime() - 36 * 3600 * 1000).toISOString();
    const recent = await api(`/repos/${REPO_QA}/issues/${issue}/comments?since=${encodeURIComponent(since36h)}&per_page=100`);
    if (recent.some((c) => (c.body || '').includes(marker))) {
      console.log(`今日（${jstDate} JST）のレポートは投稿済みのため、投稿しません。`);
      return;
    }
  }
  const posted = await api(`/repos/${REPO_QA}/issues/${issue}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
  console.log(`投稿しました: ${posted.html_url}`);
}

// Backlog の月ごとの固定の課題にコメントする（PWQA-42）。失敗しても、ワークフローは失敗にせず、警告だけを出す
async function postToBacklog(body, marker, jstDate) {
  const missing = missingConfig(process.env, ['BACKLOG_PROJECT_KEY']);
  if (missing) {
    console.log(`::warning::${missing}。Backlog には投稿しません。`);
    return;
  }
  try {
    const r = await postDailyReport({
      client: createClient(),
      projectKey: process.env.BACKLOG_PROJECT_KEY.trim(),
      jstDate,
      body,
      marker,
      dedupe: process.env.GITHUB_EVENT_NAME === 'schedule',
    });
    for (const w of r.warnings || []) console.log(`::warning::${w}`);
    console.log(r.posted ? `Backlog に投稿しました: ${r.issueKey}（コメント ${r.commentId}）` : `Backlog: ${r.reason}（${r.issueKey}）。投稿しません。`);
  } catch (e) {
    console.log(`::warning::Backlog への投稿に失敗しました（GitHub への投稿はそのまま）: ${e.message}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
