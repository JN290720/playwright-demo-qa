#!/usr/bin/env bash
# 週次テスト（weekly-full-test.yml）のレポートを、gh-pages の weekly-report/ に上書きで公開する（D35。最新 1 件・履歴なし）。
#
# 使い方: publish-weekly-report.sh <gh-pages をチェックアウトしたディレクトリ> <公開するレポートのディレクトリ>
#
# 💡 PR 用の pr-reports/ や、main 用の main-deploy-report/・main-test-* とは別のフォルダを使う（衝突しない）。
# 💡 push が競合したとき（cannot lock ref など）に備えて、最大 3 回まで取り込み直して再試行する（既存のワークフローと同じ方針）。
# 💡 フォルダは毎回作り直す。古い run の trace などが残らないようにするため。
set -euo pipefail

pages_dir="${1:?gh-pages のディレクトリを指定してください}"
report_dir="${2:?公開するレポートのディレクトリを指定してください}"
dest="weekly-report"

[ -f "$report_dir/index.html" ] || { echo "レポートが見つかりません（index.html なし）: $report_dir" >&2; exit 1; }
[ -d "$pages_dir/.git" ] || [ -f "$pages_dir/.git" ] || { echo "gh-pages のチェックアウトが見つかりません: $pages_dir" >&2; exit 1; }

git -C "$pages_dir" config user.name "github-actions[bot]"
git -C "$pages_dir" config user.email "github-actions[bot]@users.noreply.github.com"

for attempt in 1 2 3; do
  git -C "$pages_dir" fetch -q origin gh-pages
  git -C "$pages_dir" reset -q --hard origin/gh-pages

  rm -rf "${pages_dir:?}/$dest"
  mkdir -p "$pages_dir/$dest"
  cp -R "$report_dir"/. "$pages_dir/$dest/"
  git -C "$pages_dir" add -A -- "$dest"

  if git -C "$pages_dir" diff --cached --quiet; then
    echo "レポートに変更がないため、push は不要です"
    exit 0
  fi

  git -C "$pages_dir" commit -q -m "ci: 週次テストのレポートを更新 [skip ci]"
  if git -C "$pages_dir" push -q origin HEAD:gh-pages; then
    echo "週次レポートを公開しました: $dest/"
    exit 0
  fi
  echo "::warning::push attempt $attempt failed; retry"
  sleep $((RANDOM % 20 + 5))
done

echo "::error::push failed after 3 attempts"
exit 1
