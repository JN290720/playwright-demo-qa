#!/usr/bin/env bash
# gh-pages ブランチのチェックアウト内から、削除してよいレポートのディレクトリを選んで標準出力に出す。
# （削除そのものは行わない。呼び出し側のワークフローが dry-run / 削除を決める）
#
# 使い方: select-gh-pages-deletions.sh <gh-pages のディレクトリ> <open な PR の head ref 一覧ファイル> <main-test-* の保持件数>
#
# 削除対象:
#   1. pr-reports/<ブランチ名>/ のうち、対応する open な PR が無いもの
#   2. main-test-<run_id>/ のうち、run_id が新しい順に <保持件数> 件より古いもの
# 削除しないもの: main-deploy-report/（常に最新 1 つ）、その他
set -euo pipefail

pages_dir="${1:?gh-pages のディレクトリを指定してください}"
open_refs="${2:?open な PR の head ref 一覧ファイルを指定してください}"
keep="${3:?main-test-* の保持件数を指定してください}"

case "$keep" in ''|*[!0-9]*) echo "保持件数は数字で指定してください: $keep" >&2; exit 2;; esac

# open な PR の一覧が読めないときは、安全のため何も出さずに失敗する
# （読めないまま進むと「open な PR が無い」と扱われ、open な PR のレポートまで削除対象になる）
[ -f "$open_refs" ] || { echo "open な PR の一覧ファイルが見つかりません: $open_refs" >&2; exit 2; }
[ -d "$pages_dir" ] || { echo "gh-pages のディレクトリが見つかりません: $pages_dir" >&2; exit 2; }
# cd のあとでも読めるように、絶対パスにしておく
open_refs="$(cd "$(dirname "$open_refs")" && pwd)/$(basename "$open_refs")"

cd "$pages_dir"

# --- 1. pr-reports/ ---------------------------------------------------------
# レポートのルートは index.html を持つディレクトリ。ただし Playwright のレポートは
# 中に trace/index.html も持つため、「祖先にも index.html を持つディレクトリがあるもの」は除外し、
# 最も浅いディレクトリだけをレポートのルートとみなす（ブランチ名に / を含む場合も同様）。
if [ -d pr-reports ]; then
  find pr-reports -name index.html -type f | sed 's#/index.html$##' | LC_ALL=C sort |
  awk '
    { if (last != "" && index($0, last "/") == 1) next; last = $0; print }
  ' |
  while IFS= read -r dir; do
    ref="${dir#pr-reports/}"
    # ブランチ名として不正（.. を含む等）なものは、安全のため触らない
    case "$ref" in ''|*..*|/*) continue;; esac
    if ! grep -Fxq -- "$ref" "$open_refs"; then
      echo "$dir"
    fi
  done
fi

# --- 2. main-test-<run_id>/ -------------------------------------------------
# run_id は単調増加。数字の昇順に並べ、新しい側の <keep> 件を残して、それより古いものを出す。
{ find . -maxdepth 1 -type d -name 'main-test-*' -printf '%f\n' 2>/dev/null || true; } |
  sed -n 's/^main-test-\([0-9][0-9]*\)$/\1/p' |
  sort -n |
  { if [ "$keep" -eq 0 ]; then cat; else head -n "-$keep" 2>/dev/null || true; fi; } |
  sed 's/^/main-test-/'
