# Playwright Demo & E2E Testing Pipeline

このプロジェクトは、Playwright を使用した Web アプリケーションの自動 E2E テスト・ビジュアルレグレッションテスト（VRT）、および GitHub Actions を活用した CI/CD パイプライン構築デモ用の個人リポジトリです。

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
#### すべての E2E テストを実行
```
npx playwright test
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

本リポジトリでは、用途に応じて 4 つのワークフローを自動実行しています。

| ワークフロー名 | 発火タイミング | 役割 |
| :--- | :--- | :--- |
| **PR Test & VRT Update** (`pull-request.yml`) | • **PR作成・更新時:** 事前検証テスト（PC/スマホ）を実行し、PR画面へ結果コメントを投稿<br>• **`/update-vrt` コメント時:** Linux環境でVRT画像を再撮影・自動コミット（※テスト実行はスキップ。リポジトリの OWNER / MEMBER / COLLABORATOR のコメントのみ有効） | 事前検証テスト（PC/スマホ）の実行と PR 画面への結果自動コメント、および VRT 画像の自動更新 |
| **Deploy App** (`deploy.yml`) | `main` ブランチへの Push / Merge 時 | `public/` を `gh-pages` ブランチへ公開（GitHub Pages の公開元は `gh-pages` ブランチ。テストレポートと同じ場所） |
| **Post-Deploy Test** (`test.yml`) | `Deploy App` の**成功後**（`workflow_run`） | `ENV=prod` で、**必須の主要機能（`@prd` タグ付きのテスト）のみ**を実行（Safari も含む）し、テストレポートを `gh-pages` ブランチへ公開。※ 全テスト（フル検証）は、PR のテスト（`ENV=staging`）で実行する |
| **Claude Code** (`claude.yml`) | Issue / PR のコメント・レビュー・Issue 本文で `@claude` とメンションされた時 | Claude による調査・提案・実装。ワークフロー（`.github/workflows/`）の変更とマージは行えない |

> テストレポートは、`main` の最新が `main-deploy-report/`、PR ごとのものが `pr-reports/<ブランチ名>/` に公開されます（`gh-pages` ブランチ）。

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
- Claude（`@claude`）への指示や作業ルールは [CLAUDE.md](CLAUDE.md) にまとめています。両リポジトリで同じ内容を保ちます。

---

## 📝 開発フローとブランチ戦略

1. 機能追加・修正時は `main` ブランチから作業ブランチを作成（例: `fix/xxx`, `feature/xxx`）
2. ローカルでテスト（`npx playwright test`）を実行して問題ないことを確認
3. PR を作成（自動で `.github/PULL_REQUEST_TEMPLATE.md` が適応されます）
4. CI のチェック（`PR Test`）が通過したことを確認して `main` へマージ
5. マージ後、自動でデプロイおよび公開後テストが実行されます

---
## PRタイトル命名ルール

本リポジトリでは、PR（Pull Request）のコミット履歴やレビューの可読性を保つため、以下の命名ルールを採用しています。

### 基本フォーマット

`<type>(<scope>): <概要（何をしたか）>`

※ `<scope>`（対象機能やモジュール名）は任意です。必要に応じて付与してください。

---

### プレフィックス（`<type>`）一覧

| プレフィックス | 意味・用途 | タイトル例 |
| :--- | :--- | :--- |
| **`test`** | テストコードの追加・修正 | `test: SauceDemoのE2E自動テスト（基本機能・異常系）を追加` |
| **`feat`** | 新機能の追加 | `feat: ログイン画面にパスワード表示切り替えを追加` |
| **`fix`** | バグ・不具合の修正 | `fix: カート画面で削除時に合計金額が更新されない不具合を修正` |
| **`refactor`** | リファクタリング（挙動を変えないコード整理） | `refactor: Page Object Pattern を導入してテストコードを再構築` |
| **`docs`** | ドキュメント（READMEやコメント等）の更新 | `docs: Playwrightのローカル実行手順をREADMEに追加` |
| **`chore`** | 設定ファイル・ビルド・ライブラリ更新など | `chore: Playwrightを最新バージョンへアップデート` |
| **`ci`** | CI/CDワークフロー（GitHub Actions等）の修正 | `ci: VRTの自動更新コメントトリガーをPRテストに統合` |

---

### 記述ルール・マナー

- **要点を簡潔に:** 50文字程度を目安にし、詳細は PR 本文（Description）に記載してください。
- **語尾の統一:** 日本語で記述する場合は「〜を追加」「〜を修正」など、具体的に実施した内容で終わるようにします。
- **スコープの活用例:** 
  - `test(saucedemo): E2E自動テストコードを追加`
  - `test(todomvc): 破壊テストケースを追加`
