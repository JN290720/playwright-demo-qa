# コントリビュートガイド

このリポジトリ(`playwright-demo-qa`)は、`playwright-demo`(本体)へ反映する前に変更を検証する **QA 用**のリポジトリです。
Claude 向けの作業ルールは [CLAUDE.md](CLAUDE.md) にまとめています。ここでは、人が参加するときの流れを説明します。

## 変更の流れ

1. **Issue を作る**(または既存の Issue を選ぶ)。優先度ラベル(`P0`〜`P3`)を付ける
2. `main` からブランチを作る(`種別/内容`。例: `ci/fix-timeout`、`test/add-checkout-case`)
3. 変更する。ローカルでのテストは任意です(先に確認すると、速く・安く直せます。下記。`npm run test:stg` が、PR の CI と同じ範囲です)
4. PR を作る([PR テンプレート](.github/PULL_REQUEST_TEMPLATE.md)に沿って書く)。ローカルの確認を終えてからでなくてもかまいません。失敗は CI で検知します
5. CI(`PR Test & VRT Update`)の結果を確認する。失敗したら原因を調べて直す。方針が変わったら PR を閉じる。失敗のまま放置・マージしない
6. レビュー後、`main` へマージする
7. 本体 `playwright-demo` へ、同じ内容を PR として反映する(本体のマージも CI が通ってから)

詳しい流れは、[README.md](README.md) の「リポジトリ構成と検証フロー」を参照してください。

## ローカルでの準備とテスト実行

```
npm ci
npx playwright install --with-deps
npm run test              # 既定（ENV 未指定 = prod）。@prd タグの主要機能のみ
npm run test:stg          # staging。全テスト（PR の CI と同じ範囲）
npx playwright test --ui  # UI モード
```

## ブランチ名・コミット・PR のルール

- **種別**（この一覧を正とする。README・CLAUDE.md は、ここを参照する）:
  - `feat`: 新機能の追加（例: `feat: ログイン画面にパスワード表示切り替えを追加`）
  - `fix`: バグ・不具合の修正（例: `fix: カート画面で削除時に合計金額が更新されない不具合を修正`）
  - `test`: テストコードの追加・修正（例: `test: SauceDemoのE2E自動テスト（基本機能・異常系）を追加`）
  - `refactor`: リファクタリング（挙動を変えないコード整理）（例: `refactor: Page Object Pattern を導入してテストコードを再構築`）
  - `docs`: ドキュメントの更新（例: `docs: Playwrightのローカル実行手順をREADMEに追加`）
  - `chore`: 設定ファイル・ビルド・ライブラリ更新など（例: `chore: Playwrightを最新バージョンへアップデート`）
  - `ci`: CI/CD ワークフロー（GitHub Actions 等）の修正（例: `ci: VRTの自動更新コメントトリガーをPRテストに統合`）
- ブランチ名: `種別/内容`（例: `feat/add-login-toggle`）
- コミットメッセージ・PR タイトル: `種別: 概要`（日本語）。例: `ci: PRテストワークフローの修正`。scope（対象の機能名）は任意で、`種別(scope): 概要` の形でもよい（例: `test(saucedemo): E2E自動テストコードを追加`）
- 概要は 50 文字程度。語尾は「〜を追加」「〜を修正」など、実施した内容で終える。詳細は PR 本文に書く
- `main` へ直接 push しない
- 1 つの PR では 1 つの目的だけを扱う

## VRT(画像比較)の画像を更新したいとき

- ローカルで撮り直した画像(`*-win32.png` / `*-darwin.png`)は**コミットしない**
- PR に `/update-vrt` とコメントする(リポジトリの OWNER / MEMBER / COLLABORATOR のみ有効)。CI が Linux 環境で撮り直して、PR ブランチにコミットする

## セキュリティ

[SECURITY.md](SECURITY.md) を参照してください。
