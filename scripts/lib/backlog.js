// Backlog（課題管理）へ書くための共通の部品。自動の仕組み（dependency-review など）の書き先を、GitHub の Issue から Backlog の課題へ移すために使う。
//
// 設定は環境変数で渡す（公開のリポジトリなので、スペースの URL や課題キーはコードに書かない）:
//   BACKLOG_API_KEY  … シークレット。発行したユーザーの権限をそのまま持つため、PR のジョブには渡さない
//   BACKLOG_SPACE    … 変数。スペースの URL（例 https://xxx.backlog.com）。ホスト名だけでもよい
//   NOTIFY_TARGETS   … 書き先。カンマ区切りで github / backlog（既定は github だけ）
//
// 移行の間（1 週間）は GitHub と両方に書く。GitHub 側が正なので、Backlog への書き込みの失敗は、呼び出し側で警告に留める。
'use strict';

// 書き先の一覧を返す（未知の値は無視。空なら github）
function parseTargets(value = process.env.NOTIFY_TARGETS) {
  const known = new Set(['github', 'backlog']);
  const list = String(value || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => known.has(s));
  return new Set(list.length ? list : ['github']);
}

// スペースの URL を、末尾のスラッシュなしの https://… にそろえる
function normalizeSpace(space) {
  const s = String(space || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  return /^https?:\/\//.test(s) ? s : `https://${s}`;
}

// 設定が足りているか。足りなければ、その理由（ログに出してよい文。値は含めない）
function missingConfig(env = process.env, extra = []) {
  const names = ['BACKLOG_API_KEY', 'BACKLOG_SPACE', ...extra];
  const missing = names.filter((n) => !String(env[n] || '').trim());
  return missing.length ? `Backlog の設定がありません: ${missing.join(', ')}` : null;
}

function createClient({ apiKey = process.env.BACKLOG_API_KEY, space = process.env.BACKLOG_SPACE, fetchImpl = fetch } = {}) {
  const base = `${normalizeSpace(space)}/api/v2`;

  async function request(method, pathname, form) {
    const sep = pathname.includes('?') ? '&' : '?';
    const res = await fetchImpl(`${base}${pathname}${sep}apiKey=${encodeURIComponent(apiKey)}`, {
      method,
      ...(form ? { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' }, body: new URLSearchParams(form).toString() } : {}),
    });
    // エラーの文には、API キーを含む URL を出さない（パスと状態だけ）
    if (!res.ok) throw new Error(`Backlog ${method} ${pathname} -> ${res.status}`);
    return res.json();
  }

  return {
    request,
    // 課題にコメントする。戻り値は作られたコメント（id など）
    addComment: (issueKey, content) => request('POST', `/issues/${encodeURIComponent(issueKey)}/comments`, { content }),
  };
}

module.exports = { parseTargets, normalizeSpace, missingConfig, createClient };
