# CLAUDE.md

Playwright による E2E テスト・ビジュアルレグレッションテスト(VRT)と、GitHub Actions による CI/CD のデモプロジェクト。
詳細な手順は [README.md](README.md) を参照。このファイルには、作業時に守るルールの要点だけを書く。

## リポジトリの関係(重要)

| リポジトリ | 役割 |
|---|---|
| `playwright-demo-qa` | **QA 用**。変更はまずここで検証する |
| `playwright-demo` | **本プロジェクト**。QA で検証済みの変更だけをマージする |

- 本来の運用は「QA リポジトリで自動テストが問題なく動くことを確認 → 本プロジェクトへマージ」。
- 本プロジェクトは、デモとして一部この流れを省略して直接 PR を出すことがある(簡略構成)。簡略構成を前提にせず、変更の検証は QA 側を優先すること。
- このファイルは両リポジトリで同じ内容を保つ。変更するときも、先に QA で行う。

## 構成

- `tests/*.spec.ts`: テスト本体
- `tests/pages/`: Page Object Model(`LoginPage` / `InventoryPage` / `TodoPage`)
- `tests/saucedemo-visual-regression.spec.ts-snapshots/`: VRT のベースライン画像
- `.env.staging` / `.env.prod`: 環境ごとの設定。`ENV` 環境変数で切り替える(未指定は `prod`)
- `playwright.config.ts`: プロジェクトは `desktop-chrome` / `mobile-chrome`。`desktop-safari` は PR 以外(main など)のみ
- `.github/workflows/`: `pull-request.yml` / `deploy.yml` / `test.yml` / `claude.yml`

## コマンド

```
npm ci
npx playwright install --with-deps
npm run test:stg          # ENV=staging で全テスト
npm run test:prod         # ENV=prod で全テスト
npx playwright test --ui  # UI モード(デバッグ用)
npx playwright show-report
```

## テストの規約

- 画面操作は Page Object Model(`tests/pages/`)に寄せ、spec に直接セレクタを書き散らさない。
- `test.only` は残さない(CI で `forbidOnly` により失敗する)。
- テスト名は、何を確認するかが分かる日本語で書く(既存の spec に合わせる)。
- 待機は固定の `waitForTimeout` ではなく、Playwright の自動待機・`expect` を使う。

## VRT の運用

- CI(Linux)が比較に使うのは **`*-linux.png`**。
- Windows などローカルで生成された `*-win32.png` / `*-darwin.png` は**コミットしない**。
- 画像を更新するときは、**PR に `/update-vrt` とコメントする**(CI が Linux 環境で撮り直して PR ブランチにコミットする)。ローカルで撮り直した画像をコミットしない。
- `/update-vrt` で自動コミットされた画像は `[skip ci]` 付きのため、テストは再実行されない。必要なら空コミットなどで再実行する。
- 画像を更新する PR には、更新した理由(サイト側の変更など)を PR 本文に書く。

## ブランチ・コミット・PR

- ブランチ名は `種別/内容` の形式。種別は `feature` / `fix` / `ci` / `docs` / `refactor` / `test` / `chore`。
- コミットメッセージは `種別: 概要`(日本語)。例: `ci: PRテストワークフローの修正`。
- `main` に直接 push しない。必ずブランチを切って PR にする。
- PR 本文は [PR テンプレート](.github/workflows/PULL_REQUEST_TEMPLATE.md) の見出し(概要 / 関連 Issue / 変更内容 / 動作確認)に沿って書く。
  - 注意: テンプレートが `.github/workflows/` にあるため、GitHub の PR 作成画面には自動で反映されない。また、記載の `npm run test` は存在しない(`test:stg` / `test:prod` を使う)。
- 1 つの PR では 1 つの目的だけを扱う。無関係な変更を混ぜない。

## 権限・シークレット

- ワークフローの `permissions` は最小限にする(Issue #33 の方針)。広げる必要がある場合は、理由をコメントに書く。
- `.env.staging` / `.env.prod` は**機微な値を入れない設定用ファイル**(現在は `ENV_NAME` と `RUN_FULL_TESTS` のみ)。パスワード・トークンなどは追加せず、GitHub Secrets を使う。
- `.env` はコミットしない。シークレットの値をログ・コメント・コミットに出力しない。

## Claude に作業を任せるとき

自由にやってよいこと:
- テストコード・POM の追加と修正、ドキュメントの更新
- 調査、レビューコメント、Issue / PR の要約

**必ず人に確認してから行うこと**:
- `.github/workflows/` の変更(権限・トリガーを含む)
- 依存パッケージの更新(`package.json` / `package-lock.json`)
- VRT 画像の更新(`/update-vrt` の実行を含む)
- Secrets・`.env.*` に関わる変更
- `main` へのマージ、ブランチ・リポジトリの削除、force push

GitHub Actions 上の Claude の制約:
- GitHub App の仕様上、Claude は **`.github/workflows/` 配下のファイルを直接変更・コミットできない**。
- ワークフローの変更を頼まれたときは、変更案(diff)をコメントで示し、人が適用する(または人がブランチを作って変更する)。
- ローカルの Claude Code(人の権限で動く)は、この制約を受けないが、上記の「必ず人に確認する」対象であることは変わらない。

やってはいけないこと:
- `--no-verify` などによる hook の回避
- シークレットの値の出力
- 確認なしでの外部への公開・送信
