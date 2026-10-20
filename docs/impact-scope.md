# 影響範囲の調べ方

PR の「影響範囲」欄を書くための手順です。変更したファイルを使っている spec を、import をたどって列挙します。リポジトリのルートで、次のとおり実行できます（Git Bash）。

## 手順

1. **変更したファイルを列挙する**

   ```bash
   git diff --name-only origin/main...HEAD
   ```

2. **変更したファイルを import しているファイルを、再帰的にたどる**（下のスクリプトを、`impact.sh` として保存し、変更したファイルを引数に渡す）

   ```bash
   bash impact.sh tests/pages/LoginPage.ts
   ```

   スクリプトの中身（リポジトリのルートで実行する）:

   ```bash
   #!/usr/bin/env bash
   # 変更したファイルを import しているファイルを、再帰的にたどり、spec を列挙する
   queue=("$@")
   seen=()
   while [ ${#queue[@]} -gt 0 ]; do
     f=${queue[0]}; queue=("${queue[@]:1}")
     base=$(basename "$f" .ts)
     for g in $(grep -rl --include='*.ts' -E "from ['\"][^'\"]*/${base}['\"]" tests tests-android tests-perf 2>/dev/null); do
       if [[ ! " ${seen[*]} " =~ " $g " ]]; then
         seen+=("$g"); queue+=("$g")
       fi
     done
   done
   printf '%s\n' "${seen[@]}" | grep 'spec\.ts$' | sort
   ```

3. **spec 以外の影響を調べる**（ワークフロー・設定・文書）

   ```bash
   git grep -n "<変更したファイル名>" -- .github playwright.config.ts tests-android/playwright.config.ts tests-perf/playwright.config.ts
   ```

4. **欄に書く**: 上の結果の件数（spec の数）と、プロジェクト（desktop-chrome・mobile-chrome・desktop-safari・Android）、実行の段階（PR の CI・デプロイ後（prd）・週次・Android 夜間・性能）。

## 例（この repo で実測）

`tests/pages/LoginPage.ts` を変えた場合、`bash impact.sh tests/pages/LoginPage.ts` は **17 件**の spec を返す（`tests/` の 16 件と、`tests-perf/` の 1 件。作成時点の `origin/main` に対する実測）。`LoginPage` を直接 import しない spec（ヘルパー `tests/helpers/` を経由するもの）も含まれる。

## 注意

- **多めに出る**（誤検知の方向）: 名前（`LoginPage`）の一致で探すため、同じ名前の別のファイルも拾うことがある。欄に書くときは、本当に使っているかを、件数の確認の上で書く
- **「影響なし」と書くとき**: 上のコマンドの結果が 0 件であることと、そのコマンド自体を貼る（PR テンプレートの欄の注記どおり）
- **不明な点**: 調べられなかったものは、「不明」と書く（推測で「影響なし」と書かない）
- **実行の段階の確認**: spec が `@prd` タグを持つかで、デプロイ後（prd）で動くかが決まる（`git grep -n "@prd" -- tests`）

## 欄と調べ方の対応

| 欄 | 調べ方 |
| :--- | :--- |
| 影響する画面・機能 | 変更したファイルの役割（POM なら対応する画面）と、手順 2 の spec の題名 |
| 影響する spec・プロジェクト | 手順 2。プロジェクトは、`playwright.config.ts` の `projects`（desktop-chrome・mobile-chrome・desktop-safari）と、`tests-android/` |
| 影響する実行の段階・環境 | `@prd` の有無（prd）。`.github/workflows/` の参照（手順 3） |
| 影響するファイル・ワークフロー | 手順 1 と手順 3 |
| 調べ方 | 使ったコマンドと、件数（この文書の手順）。コマンドを貼る |