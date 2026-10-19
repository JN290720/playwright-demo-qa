# コントリビュートガイド

このリポジトリ(`playwright-demo-qa`)は、`playwright-demo`(本体)へ反映する前に変更を検証する **QA 用**のリポジトリです。
Claude 向けの作業ルールは [CLAUDE.md](CLAUDE.md) にまとめています。ここでは、人が参加するときの流れを説明します。

## 変更の流れ

1. **Issue を作る**(または既存の Issue を選ぶ)。優先度ラベル(`P0`〜`P3`)を付ける
2. `main` からブランチを作る(`種別/内容`。例: `ci/fix-timeout`、`test/add-checkout-case`)
3. 変更して、ローカルでテストを実行する(下記)
4. PR を作る([PR テンプレート](.github/PULL_REQUEST_TEMPLATE.md)に沿って書く)
5. CI(`PR Test & VRT Update`)が通ることを確認する
6. レビュー後、`main` へマージする
7. 本体 `playwright-demo` へ、同じ内容を PR として反映する(本体のマージも CI が通ってから)

詳しい流れは、[README.md](README.md) の「リポジトリ構成と検証フロー」を参照してください。

## ローカルでの準備とテスト実行

```
npm ci
npx playwright install --with-deps
npm run test              # すべてのテスト(ENV 未指定は prod)
npm run test:stg          # staging
npx playwright test --ui  # UI モード
```

## ブランチ名・コミット・PR のルール

- ブランチ名: `feature` / `fix` / `ci` / `docs` / `refactor` / `test` / `chore` のいずれかを先頭に付ける
- コミットメッセージ・PR タイトル: `種別: 概要`(日本語)。例: `ci: PRテストワークフローの修正`
- `main` へ直接 push しない
- 1 つの PR では 1 つの目的だけを扱う

## VRT(画像比較)の画像を更新したいとき

- ローカルで撮り直した画像(`*-win32.png` / `*-darwin.png`)は**コミットしない**
- PR に `/update-vrt` とコメントする(リポジトリの OWNER / MEMBER / COLLABORATOR のみ有効)。CI が Linux 環境で撮り直して、PR ブランチにコミットする

## セキュリティ

[SECURITY.md](SECURITY.md) を参照してください。
