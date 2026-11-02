# このリポジトリの実測値

このファイルは、リポジトリの現状を**実測値だけ**でまとめたものです。推測で埋めた値はありません。取れない値は「不明（理由）」と書いています。

- **基準点**: 2026-11-03 08:35（JST）時点の `origin/main`（コミット `5288679`）。この時刻より後に作られた実行・マージは含みません（同じ基準点を、すべての項目に使っています）。
- **更新の方法**: 数値は、各行の「出所」の手順で再計測できます。値が変わったら、この文書を更新します（PR で）。

## 数え方の定義（最初に読んでください）

数が 147・154・462 のように食い違って見えた経緯があるため、次の 3 つを分けて書きます。

| 用語 | 意味 | 今の値 |
|---|---|---|
| **テストケース数** | spec ファイル内の `test()` の数。`--list` の結果を、1 プロジェクト分だけ数えた値（同じ位置・同じタイトルは 1 件） | 153 |
| **実行件数** | プロジェクトに展開した後の件数（テストケース × 実行環境）。`--list` を、プロジェクトごとに数えた合計 | 474（PC Chrome・スマホ Chrome・Safari は各 153、Android は 15） |
| **@prd の件数** | 本番（prod）で実行されるテストケース（`@prd` タグ）。1 プロジェクトあたり | 8（3 プロジェクトで 24 実行） |

- 「実行件数」は「テストケース数」よりも大きくなります。同じテストを複数の環境で動かすためです。
- 過去の 147・154・462 の出所は、この文書では確認できませんでした（不明）。この文書では、上の定義の値だけを使います。

## 1. テストの規模

| 項目 | 値 | 集計日 | 出所（再計測の手順） |
|---|---|---|---|
| spec ファイル数 | 24 | 2026-11-03 | `tests/*.spec.ts` の数（`ls tests/*.spec.ts \| wc -l`） |
| テストケース数（spec 内の test） | 153 | 2026-11-03 | `ENV=staging ENV_NAME=staging npx playwright test --list --reporter=json`。PC Chrome の分（一意に数えた値） |
| 実行件数（PC Chrome） | 153 | 2026-11-03 | 同上（プロジェクト `desktop-chrome`） |
| 実行件数（スマホ Chrome） | 153 | 2026-11-03 | 同上（`mobile-chrome`） |
| 実行件数（Safari） | 153 | 2026-11-03 | 同上（`desktop-safari`。PR では `@safari-pr` の 18 件だけ） |
| 実行件数（Android） | 15 | 2026-11-03 | `ENV=staging ENV_NAME=staging npx playwright test -c tests-android/playwright.config.ts --list --reporter=json` |
| 実行件数の合計（展開後） | 474 | 2026-11-03 | 上の合計（153 × 3 + 15） |
| @prd の件数 | 8（1 プロジェクトあたり） | 2026-11-03 | `ENV=prod npx playwright test --list --reporter=json`（既定の prod は `@prd` だけ） |
| @safari-pr の件数 | 18（staging の 1 プロジェクトあたり） | 2026-11-03 | 同上（タグの集計） |
| VRT のスナップショット画像数 | 42 枚（テストケース数ではない。VRT のテストは 14 件 × 3 環境） | 2026-11-03 | `tests/saucedemo-visual-regression.spec.ts-snapshots/` の画像数 |
| `test.fail()` で追跡する既知の不具合（テストケース数） | 15 | 2026-11-03 | テスト観点表（下の「観点別」の出所）の「既知」列 |
| `test.fail(` の出現行数 | 24 | 2026-11-03 | `grep -rn "test\.fail(" tests --include=*.ts \| wc -l`。上の 15 と数え方が違う（1 行に複数の対象が無いか未照合。レビューで照合） |
| 「テストにしない観点」の件数と一覧の場所 | 不明（理由: 「テストにしない」として一覧にした記録を確認できなかった。`docs/test-matrix.md` の「─（対象外）」の記号は、定義が要る） | — | — |

### 観点別の内訳（テストケース数）

出所: `node scripts/generate-test-catalog.js <出力先>` が作る `test-catalog.json` の `viewpoint`。観点の分類は、スクリプトの `FILE_INFO` の定義どおりです。

| 観点 | テストケース数 |
|---|---|
| 機能（正常系） | 46 |
| 機能（特殊ユーザー） | 14 |
| 異常系 | 19 |
| 異常系・破壊的操作 | 19 |
| セキュリティ | 16 |
| アクセシビリティ | 17 |
| VRT（見た目） | 14 |
| ネットワーク | 5 |
| API | 3 |
| 未分類 | 0 |
| **合計** | **153** |

## 2. CI/CD の運用

| 項目 | 値 | 集計日 | 出所 |
|---|---|---|---|
| ワークフローの本数 | 9 | 2026-11-03 | `.github/workflows/*.yml` の数 |
| ワークフローの起動条件 | 下の表 | 2026-11-03 | 各 YAML の `on:` |
| PR テストの所要時間（pull_request の成功した直近 20 件） | 平均 245 秒、最短 192 秒、最長 385 秒 | 2026-11-03 | `gh run list --workflow pull-request.yml --event pull_request --created ">=2026-10-04" --limit 300 --json conclusion,createdAt,updatedAt,status`。基準点より前に作成されたもの（`createdAt < 2026-11-02T23:35:00Z`）、`conclusion` が `success`、`createdAt` の新しい順に 20 件。所要時間 = `updatedAt − createdAt`（秒）。平均は小数第 1 位で計算し、整数に四捨五入（245.3 → 245） |
| 週次フルテストの所要時間（成功した直近 20 件） | 平均 2,669 秒（2668.8 を四捨五入）、最短 210 秒、最長 47,901 秒（外れ値あり） | 2026-11-03 | 基準点: 2026-11-03 08:35 JST（`origin/main` の `5288679`）。対象: `weekly-full-test.yml` の実行のうち、作成日時が基準点より前・`conclusion` が `success` のもの。作成日時の新しい順に先頭 20 件。所要時間 = `updatedAt − createdAt`（秒）。コマンド: `gh run list --workflow weekly-full-test.yml --created ">=2026-10-04" --limit 300 --json conclusion,createdAt,updatedAt,status`（期間の上限は取得の範囲）。対象の期間: 2026-10-23（最古）〜 2026-11-02（最新）。基準点より前の完了 44 件のうち成功 36 件 |
| Android 夜間テストの所要時間（成功した直近 20 件） | 平均 380 秒（380.2 を四捨五入）、最短 317 秒、最長 466 秒 | 2026-11-03 | 基準点: 2026-11-03 08:35 JST（`origin/main` の `5288679`）。対象: `android-test.yml` の実行のうち、作成日時が基準点より前・`conclusion` が `success` のもの。作成日時の新しい順に先頭 20 件。所要時間 = `updatedAt − createdAt`（秒）。コマンド: `gh run list --workflow android-test.yml --created ">=2026-10-04" --limit 300 --json conclusion,createdAt,updatedAt,status`（期間の上限は取得の範囲）。対象の期間: 2026-10-20（最古）〜 2026-11-01（最新）。基準点より前の完了 59 件のうち成功 45 件 |
| デプロイ後テスト（`test.yml`）の所要時間（成功した直近 20 件） | 平均 107 秒（106.8 を四捨五入）、最短 61 秒、最長 277 秒 | 2026-11-03 | 基準点: 2026-11-03 08:35 JST（`origin/main` の `5288679`）。対象: `test.yml` の実行のうち、作成日時が基準点より前・`conclusion` が `success` のもの。作成日時の新しい順に先頭 20 件。所要時間 = `updatedAt − createdAt`（秒）。コマンド: `gh run list --workflow test.yml --created ">=2026-10-04" --limit 300 --json conclusion,createdAt,updatedAt,status`（期間の上限は取得の範囲）。対象の期間: 2026-10-24（最古）〜 2026-11-01（最新）。基準点より前の完了 154 件のうち成功 147 件 |

### ワークフローの起動条件

| ファイル | 起動条件 |
|---|---|
| `pull-request.yml` | PR の作成・更新（`pull_request`）、PR のコメント（`/update-vrt`。`issue_comment`） |
| `cleanup-pr-report.yml` | PR のクローズ（レポートの削除） |
| `deploy.yml` | `main` への push（デプロイ） |
| `test.yml` | デプロイの完了後（`workflow_run`。デプロイ後テスト） |
| `weekly-full-test.yml` | 毎週（月曜 03:37 JST）と手動 |
| `android-test.yml` | 毎日（03:00 JST）と PR と手動 |
| `daily-report.yml` | 毎日 2 回（5:17 JST と 7:43 JST）と手動 |
| `dependency-review.yml` | 毎週（月曜 9:23 JST）と手動 |
| `cleanup-gh-pages.yml` | 毎週（月曜 03:00 JST）と手動 |

### 直近 30 日の成功率（ワークフロー別）

集計期間: 作成日が 2026-10-04 以降で、基準点（2026-11-02T23:35:00Z = 2026-11-03 08:35 JST）より前のもの。完了した実行だけを数えています。

| ワークフロー | 完了 | 成功 | 成功率 | 内訳 |
|---|---|---|---|---|
| PR のテスト（`pull-request.yml`、pull_request） | 246 | 221 | 90% | 失敗 7・キャンセル 18（同じ PR への新しい push によるキャンセル） |
| デプロイ後テスト（`test.yml`） | 154 | 147 | 95% | — |
| デプロイ（`deploy.yml`） | 154 | 152 | 99% | — |
| 週次フルテスト（`weekly-full-test.yml`） | 44 | 36 | 82% | — |
| Android 夜間テスト（`android-test.yml`） | 59 | 45 | 76% | — |
| 日次レポート（`daily-report.yml`） | 29 | 29 | 100% | — |

- **失敗の主な原因の分類**: 不明（理由: 分類は、各失敗のログを読んで行う作業。この文書の集計では行っていない）。

## 3. 開発の体制

| 項目 | 値 | 集計日 | 出所 |
|---|---|---|---|
| AI エージェントの役割 | 5 役: リーダー（判定・調整）、作業（実装・マージ後の確認）、レビュー（PR の確認）、テスト設計（観点・ケースの設計）、品質管理（文書・改善の提案） | 2026-11-03 | 運用の規則（役割の一覧だけ。個別の指示の内容は書かない） |
| 人間が判断・承認する範囲 | マージ、VRT の基準画像の更新、削除・設定・Secrets、方針の判断 | 2026-11-03 | `CLAUDE.md` の「Claude に作業を任せるとき」 |
| 総コミット数（`origin/main`） | 472 | 2026-11-03 | `git rev-list --count origin/main`（基準点のコミット `5288679`） |
| マージ済み PR 数 | 154 | 2026-11-03 | `gh pr list --state merged --search "merged:<=2026-11-02T23:35:00Z" --limit 1000` の件数（基準点まで） |

## 4. 3 行サマリ

- テストケース 153 件（観点 9 種。PC・スマホ・Safari で各 153 実行、Android の 15 件を加えて 474 実行）を、Playwright（TypeScript）で作成・運用
- 実行環境は 4 つ（PC Chrome・スマホ Chrome・Safari・Android）。本番では `@prd` の 8 件を、デプロイ後に毎回実行
- PR のテストは、平均 245 秒（約 4 分。成功した直近 20 件）で完了

---

この文書の数値は、基準点（2026-11-03 08:35 JST の `origin/main`、コミット `5288679`）のものです。ローカルのチェックアウトは古いことがあるため、最新の `origin/main` で測っています。
