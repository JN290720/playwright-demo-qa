// 日次レポートを、Backlog の「月ごとの固定の課題」にコメントで書く（PWQA-42。課題管理を Backlog へ移す段階 5 の 2）。
//   課題の件名: 日次レポート YYYY-MM（自動）。月が変わったら新しい課題を作り、前の月の課題は完了にする。
//   二重投稿の防止: 定時（schedule）の実行では、同じ目印（<!-- daily-report:日付 -->）のコメントが既にあれば投稿しない（GitHub 側と同じ）。
//   種別・優先度・状態・完了理由・カスタム属性は、名前から ID を引く（ID をコードに書かない）。
// 本物の Backlog には、テストでは書かない（scripts/lib/backlog-daily.test.js は fetch を差し替える）。
'use strict';

const TYPE_NAME = '記録';
const PRIORITY_NAME = '低';
const STATUS_OPEN = '処理中';
const STATUS_DONE = '完了';
const RESOLUTION_DONE = '対応済み';
const FIELD_VALUES = { 起票者: '自動', 対象リポジトリ: 'QA', 担当: 'リーダー' };
const SUMMARY_RE = /^日次レポート \d{4}-\d{2}（自動）$/;

const summaryOf = (month) => `日次レポート ${month}（自動）`;
const idByName = (list, name, what) => {
  const found = list.find((x) => x.name === name);
  if (!found) throw new Error(`Backlog の${what}「${name}」が見つかりません`);
  return found.id;
};

// 戻り値: { issueKey, posted, reason }。失敗は例外（呼び出し側で警告に留める）
async function postDailyReport({ client, projectKey, jstDate, body, marker, dedupe }) {
  const month = jstDate.slice(0, 7);
  const summary = summaryOf(month);
  const project = await client.getProject(projectKey);
  const statuses = await client.getProjectList(projectKey, 'statuses');
  const doneId = idByName(statuses, STATUS_DONE, '状態');

  // 今の月の課題と、前の月までの未完了の課題を探す（件名は完全一致。keyword は本文・コメントにも当たるため）
  const found = (await client.listIssues([['projectId[]', String(project.id)], ['keyword', '日次レポート'], ['count', '100']])).filter((i) => SUMMARY_RE.test(i.summary));
  let current = found.find((i) => i.summary === summary);

  if (!current) {
    const types = await client.getProjectList(projectKey, 'issueTypes');
    const priorities = await client.getSpaceList('priorities');
    const fields = await client.getProjectList(projectKey, 'customFields');
    const form = [
      ['projectId', String(project.id)],
      ['summary', summary],
      ['issueTypeId', String(idByName(types, TYPE_NAME, '種別'))],
      ['priorityId', String(idByName(priorities, PRIORITY_NAME, '優先度'))],
      ['description', `[自動]\n## 何の記録か\n${month} の日次レポート（scripts/daily-report.js が毎朝コメントとして書く）。月が変わると、新しい課題が作られ、この課題は完了になる。同じ日の二重の投稿は、目印（<!-- daily-report:日付 -->）で防ぐ。`],
    ];
    for (const [fieldName, itemName] of Object.entries(FIELD_VALUES)) {
      const field = fields.find((f) => f.name === fieldName);
      if (!field) throw new Error(`Backlog のカスタム属性「${fieldName}」が見つかりません`);
      form.push([`customField_${field.id}`, String(idByName(field.items || [], itemName, `カスタム属性「${fieldName}」の値`))]);
    }
    const created = await client.addIssue(form);
    await client.updateIssue(created.issueKey, [['statusId', String(idByName(statuses, STATUS_OPEN, '状態'))]]);
    current = created;
  }

  // 前の月までの課題は完了にする（今の月でない・未完了のもの）
  for (const issue of found) {
    if (issue.summary === summary || (issue.status && issue.status.id === doneId)) continue;
    const resolutions = await client.getSpaceList('resolutions');
    await client.updateIssue(issue.issueKey, [['statusId', String(doneId)], ['resolutionId', String(idByName(resolutions, RESOLUTION_DONE, '完了理由'))]]);
  }

  if (dedupe) {
    const comments = await client.getComments(current.issueKey);
    if (comments.some((c) => (c.content || '').includes(marker))) {
      return { issueKey: current.issueKey, posted: false, reason: `今日（${jstDate}）のレポートは投稿済み` };
    }
  }
  const comment = await client.addComment(current.issueKey, `[自動]\n${body}`);
  return { issueKey: current.issueKey, posted: true, commentId: comment.id };
}

module.exports = { postDailyReport, summaryOf };
