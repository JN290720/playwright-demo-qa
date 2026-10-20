# Playwright Demo & E2E Testing Pipeline

このプロジェクトは、Playwright を使用した Web アプリケーションの自動 E2E テスト・ビジュアルレグレッションテスト（VRT）、および GitHub Actions を活用した CI/CD パイプライン構築デモ用の個人リポジトリです。

> 決まったことと、その理由（日付・判断・関連 Issue）は [docs/decisions.md](docs/decisions.md) を参照してください。
> 全体像（対象・今できること・ワークフローの一覧）は、まず [docs/overview.md](docs/overview.md) を読んでください。

---

## 🛠 テスト環境・使用技術

- **Testing Framework:** [Playwright](https://playwright.dev/)
- **Runtime:** Node.js (LTS)
- **CI/CD:** GitHub Actions
- **Hosting:** GitHub Pages
- **Testing Scope:** PC (`desktop-chrome`) & スマホ (`mobile-chrome`) 環境のマルチ対応（`main` 側のテストでは Safari (`desktop-safari`) も実行）

---

## 📊 テストレポートの確認方法

- **本番（main）ブランチの最新テスト結果**  
  [👉 最新の Post-Deploy テストレポートを見る](https://jn290720.github.io/playwright-demo/main-deploy-report/)  
  *(※ main ブランチへマージ・デプロイされた後に自動更新されます)*

- **Pull Request ごとのテスト結果**  
  各 PR のコメント欄に自動投稿される `[View Test Report]` リンクから、該当 PR のテスト結果・動画・トレースログをブラウザ上で直接確認できます。

---

## 🚀 ローカルでのセットアップと実行

### 1. 依存関係のインストール
```
npm ci
npx playwright install --with-deps
```
### 2. テストの実行
#### 既定（ENV 未指定 = prod）のテストを実行（`@prd` タグの主要機能のみ）
```
npx playwright test
```
#### 全テストを実行（staging。PR の CI と同じ範囲）
```
npm run test:stg
```
#### UI モードでテストを実行（デバッグ用）
```
npx playwright test --ui
```
#### テスト結果の HTML レポートを表示
```
npx playwright show-report
```
---

## 🔄 CI/CD パイプライン (GitHub Actions)

本リポジトリでは、用途に応じて 10 本のワークフロー（`.github/workflows/`）を自動実行しています。「副作用」列は、そのワークフローが外部に書き込むもの（コミット・Issue・削除）です。

| ワークフロー（ファイル） | 発火タイミング | 目的 | 副作用（書き込み先） | 結果を見る人（想定） |
| :--- | :--- | :--- | :--- | :--- |
| **PR Test & VRT Update** (`pull-request.yml`) | PR の作成・更新時（`main`・`master` 向け）／ PR コメントの `/update-vrt`（OWNER / MEMBER / COLLABORATOR のみ有効） | PR のテスト（`ENV=staging`、全テスト）と結果コメント。`/update-vrt` で、Linux の VRT 基準画像を撮り直す（テストはスキップ） | PR へ結果のコメントを投稿・更新。PR のレポートを `gh-pages` へ公開。`/update-vrt` 時は PR ブランチへ画像をコミット（`[skip ci]`） | PR の作成者・レビュワー（PR のコメントに結果が出る） |
| **Deploy App** (`deploy.yml`) | `main` への push（マージ後） | `public/` を公開する。テスト観点の Issue（親とサブ）の「テストケースの表」を、テストのコードから更新する | `gh-pages` へ push。失敗時は Issue（`deploy-failure`）を作成し、復旧したら閉じる。成功時は、テスト観点の Issue（親とサブ）の本文の表を書き換える（内容が変わったときだけ。失敗しても Deploy App は失敗にならない） | マージした人（失敗時は `deploy-failure` の Issue） |
| **Post-Deploy Test** (`test.yml`) | `Deploy App` の**成功後**（`workflow_run`） | `ENV=prod` で、`@prd` タグの主要機能のみを実行（Safari も含む） | `gh-pages` へレポートを公開。失敗時は Issue（`post-deploy-failure`）を作成し、復旧したら閉じる | 開発者（失敗時は `post-deploy-failure` の Issue） |
| **Claude Code** (`claude.yml`) | Issue / PR のコメント・レビュー、Issue の本文・タイトル（作成・アサイン時）の先頭に、起動の文字（アットマーク + claude）を書いた時。助言を求めるときだけ使う | 助言のみ（独立した監査役。変更・マージはしない） | ブランチへの push（`contents: write`）、PR・コメント・Issue の作成と更新。`.github/workflows/` の変更は行えない | 起動の文字を先頭に書いた人（コメントで返答） |
| **PR レポートの削除** (`cleanup-pr-report.yml`) | PR のクローズ・マージ時（`main`・`master` 向け） | その PR のテストレポートを `gh-pages` から消す | `gh-pages` へ削除コミット（`[skip ci]`） | 自動のみ（人は見ない） |
| **Android Emulator Test** (`android-test.yml`) | 毎日 03:00 JST（夜間）／ 手動実行／ Android 関連ファイルを変えた `main` 向け PR（PR では失敗の通知は送らない） | エミュレータ上の Chrome で、VRT と購入 1 件を確認 | 夜間・手動実行の失敗は Issue を作成し、成功に戻ったら閉じる（PR では作らない）。手動で `update_snapshots` を付けたときだけ、選んだブランチへ基準画像をコミット（`main` は不可。下の「Android の基準画像を更新したい場合」を参照） | 開発者（失敗時は `android-failure` の Issue） |
| **Weekly Full Test** (`weekly-full-test.yml`) | 毎週月曜 03:37 JST ／ 手動 ／ 該当ファイルを変えた `main` 向け PR | 全テスト（`ENV=staging`）。サイト側の変化を、PR を待たずに検知する | 失敗時は Issue（`weekly-failure`）を作成し、復旧したら閉じる。`test.fail()` の既知の不具合が予期せず成功したら、サイト不具合の Issue にコメント | 開発者（失敗時は `weekly-failure` の Issue） |
| **Daily Report** (`daily-report.yml`) | 毎朝 05:17 JST（予備 07:43 JST）／ 手動 | 日次のレポートを投稿する | 日次レポート用の Issue を作成・コメント | 担当（毎朝の `daily-report` の Issue） |
| **Dependency Review** (`dependency-review.yml`) | 毎週月曜 09:23 JST ／ 手動 | 依存関係の更新提案（`npm audit` など）を確認する | 提案の Issue（`dependency-review` ラベル）を作成・コメント | 担当（`dependency-review` の Issue。更新の判断） |
| **Cleanup gh-pages Reports** (`cleanup-gh-pages.yml`) | 毎週月曜 03:00 JST（自動実行は**常に dry-run**）／ 手動 | 古いテストレポートを整理する。`main-test-*` は新しい順に `keep`（既定 10）件残す | 手動で `dry_run` を `false` にしたときだけ削除: 削除前に GitHub Release へアーカイブし、`gh-pages` から削除コミット（手動の既定は `dry_run = true`） | 担当（手動実行のときの Actions のログ・Release） |

> 「結果を見る人」の列は、ワークフローの YAML からは確定できない。通知先（Issue のラベル）から推定した運用の想定。

> テストレポートは、`main` の最新が `main-deploy-report/`、PR ごとのものが `pr-reports/<ブランチ名>/` に公開されます（`gh-pages` ブランチ）。

### 🏷 Issue のラベルの意味

自動で作られる Issue は、ラベルで種類が分かります。失敗の通知は、同じラベルの open な Issue があれば、新しく作らずにコメントを追記します（重複を作らない）。ラベルが無いときは、スクリプトが作ります。

| ラベル | 作られる条件 | 閉じ方 | 見る人・すること |
| :--- | :--- | :--- | :--- |
| `deploy-failure` | Deploy App（`main` への反映）が失敗したとき。優先度 `P1` も付く | 次に成功したら、自動で閉じる（復旧のコメントつき） | 開発者: デプロイが失敗した原因を確認する |
| `post-deploy-failure` | Post-Deploy Test（本番の `@prd` テスト）が失敗したとき。`P1` も付く | 次に成功したら、自動で閉じる | 開発者: 本番で主要機能が壊れていないか確認する |
| `weekly-failure` | 週次の全テスト（staging）が失敗したとき。`P1` も付く | 次に成功したら、自動で閉じる | 開発者: 失敗の原因（アプリの不具合か、テスト対象サイトの変化か）を確認する |
| `android-failure` | Android の夜間・手動実行が失敗したとき（PR の実行では作らない）。`P1` も付く | 次に成功したら、自動で閉じる | 開発者: エミュレータ上の VRT・購入テストの失敗を確認する |
| `site-defect` | 既知のサイト不具合が「直った可能性」があるとき（`test.fail()` が予期せず成功） | 閉じない。open の `site-defect` の Issue（常設）に、コメントを追記する。同じ内容のコメントは、重ねて追記しない。常設の Issue が無いときは、コメントは投稿されず、何もしない | 開発者: 実際に直っているか確認し、直っていれば `test.fail()` を外す（[docs/known-site-issues.md](docs/known-site-issues.md)） |
| `test-viewpoint` | テスト観点の Issue（親とサブ）。デプロイのたびに、本文の「テストケースの表」を更新する | 閉じない（本文だけを書き換える） | 開発者: 観点ごとのテストケースを確認する |
| `daily-report` | 日次レポート。open の 1 件に、毎日コメントを追記する | 閉じない | 人: 毎朝、PR・Issue の状況を確認する |
| `dependency-review` | 依存関係レビュー（毎週月曜）。open の 1 件に、提案を追記する | 閉じない | 人: 更新の提案を判断し、PR で行う |
| `needs-user-decision` / `blocked-by-merge` / `ready-for-pr` / `backlog` | 運用ラベル（スクリプトは読むだけ。日次レポートが一覧にする）。`needs-user-decision` は、相談のテンプレート（`.github/ISSUE_TEMPLATE/consultation.yml`）から作ると、自動で付く | 人が外す（ほかのラベルの付け方は運用に従う） | 人: ユーザーの判断が要るもの・マージ待ち・PR を作れるもの・保留かを判断する |

- 優先度 `P0`〜`P3` は、人が Issue に付ける（[CONTRIBUTING.md](CONTRIBUTING.md)）。自動で作られる失敗の Issue だけ、`P1` が付く
- 「閉じない」ものは、スクリプトが閉じない。閉じるかどうかは、人が判断する

---

## 🎭 VRT (Visual Regression Testing) 運用ガイド

当リポジトリでは、Playwright を用いた画面の見た目崩れ検知（VRT）を導入しており、**PC (`desktop-chrome`)** と **スマホ (`mobile-chrome`)** の双方を検証対象としています（`main` 側では Safari (`desktop-safari`) の画像も使います。`/update-vrt` は 3 つとも更新します）。

### 🔄 通常の開発フロー
1. 機能追加やデザイン変更を行った後、PR（Pull Request）を作成します。
2. 自動で `PR Test` ワークフローが走り、既存のベースライン画像と現在の画面を比較します。
3. **テストが成功（✅ PASSED）した場合:** そのままマージ可能です（コメント等の操作は不要です）。

### 📸 VRT画像（ベースライン）を更新したい場合
ボタンの文言変更やデザイン改修などにより、VRTテストが意図した変更で失敗（❌ FAILED）した場合は、以下の手順で画像を最新の状態にアップデートできます。

1. 該当する **PR のコメント欄** に以下のコマンドを投稿します。
   ```text
   /update-vrt
   ```
2. GitHub Actions が自動で起動し、Linux環境の PC / スマホ画面の最新スクリーンショットを再撮影して PR ブランチへ自動コミット＆Push します。
3. 自動でテストが再実行され、グリーン（✅ PASSED）になれば完了です！

> **💡 注意（初回・環境追加時）**
> 新しいテストや画面を追加した直後の初回PRでは、ベースライン画像が存在しないためテストが落ちます。その際も同様にコメントで `/update-vrt` と投稿して画像を生成させてください。

### 📱 Android の基準画像を更新したい場合

Android（エミュレータ上の Chrome）の基準画像は、PR のコメントでは更新できません。Actions の **Android Emulator Test** を手動で実行します。

1. Actions の「Android Emulator Test」→ **Run workflow** を開く
2. **Use workflow from** で、更新したいブランチを選ぶ（`main` では実行できない）
3. `update_snapshots` にチェックを入れて実行する
4. CI のエミュレータで撮り直した画像が、選んだブランチに `test: Android の VRT 基準画像を更新する [skip ci]` としてコミットされる。`[skip ci]` のため、テストは再実行されない（必要なら、空のコミットで再実行する）

> 画像が変わっていないときは、コミットされません。

---

## 🔀 リポジトリ構成と検証フロー（QA → 本体）

本プロジェクトは、2つのリポジトリを使い分けています。

| リポジトリ | 役割 |
| :--- | :--- |
| [`playwright-demo-qa`](https://github.com/JN290720/playwright-demo-qa) | **QA 用**。変更はまずここで検証する |
| [`playwright-demo`](https://github.com/JN290720/playwright-demo) | **本プロジェクト**。QA で検証済みの変更をマージする |

### 変更の流れ

1. **QA リポジトリ**で作業ブランチを作成し、PR を出す
2. CI（`PR Test & VRT Update`）が通ること、自動テストが問題なく動作することを確認し、QA の `main` へマージ
3. 同じ変更を**本プロジェクト**へ PR として反映する
4. 本プロジェクトの CI が通ったら `main` へマージ

### 補足

- 両リポジトリは同じ履歴を共有しています（QA は本体の `main` から複製したものです）。
- 本プロジェクトはデモ用のため、変更内容によっては QA での検証を省略して直接 PR を出すことがあります（簡略構成）。
- Claude（起動の文字は、アットマーク + claude。書き方は CLAUDE.md）への指示や作業ルールは [CLAUDE.md](CLAUDE.md) にまとめています。両リポジトリで同じ内容を保ちます。

---

## 📝 開発フローとブランチ戦略

1. 機能追加・修正時は `main` ブランチから作業ブランチを作成（例: `fix/xxx`, `feat/xxx`）
2. ローカルでのテストは任意です（先に `npm run test:stg` で全テストを確認すると、速く・安く直せます。PR の CI と同じ範囲）
3. PR を作成（自動で `.github/PULL_REQUEST_TEMPLATE.md` が適応されます）。ローカルの確認を終えてからでなくてもかまいません。失敗は CI で検知します
4. CI（`PR Test`）の結果を確認する。失敗したら直す。方針が変わったら PR を閉じる（失敗のまま放置・マージしない）。通過したら `main` へマージ
5. マージ後、自動でデプロイおよび公開後テストが実行されます

---
## PRタイトル命名ルール

PR タイトル（コミットの種別を含む）の書き方と、種別の一覧（`feat` / `fix` / `test` / `refactor` / `docs` / `chore` / `ci`）は、[CONTRIBUTING.md](CONTRIBUTING.md) の「ブランチ名・コミット・PR のルール」を正とします。ここには重複して書きません。
