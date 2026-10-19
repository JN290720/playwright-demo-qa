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
npm run test              # 環境指定なし(ENV 未指定は prod)で全テスト
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

## PR を出す前の確認(ローカルと CI の役割分担)

QA リポジトリの PR の CI(Linux。実際の実行環境)は、変更を検証する場所。ただし、**ローカルで安く確認できることは、PR を出す前に確認する**(CI の時間・失敗の履歴・レビューの手間を無駄にしないため)。ローカルで確認できないことは、PR の CI(またはマージ後)で確認する。

| 変更の種類 | ローカルで確認する | PR の CI / マージ後に確認する |
|---|---|---|
| テスト・POM | `npm run typecheck` / `npx playwright test --list` / 変更した spec を **staging（`ENV=staging`）と既定（prod）の両方**で実行 / 新規・変更したテストは **CI 相当（`CI=true`）の並列・リトライなしで繰り返す**（`--retries=0 --repeat-each=3` など） | VRT（Linux の基準画像との比較）、全テストの通過 |
| ワークフロー | YAML の構文（`js-yaml` など）/ 中のシェル・スクリプトを bash などで単体確認 | ワークフローの実際の動作 / `schedule`・`issue_comment` は**マージ後**に手動実行などで確認 |
| 設定（`playwright.config.ts`・`package.json` など） | `npm run typecheck` / `npx playwright test --list` | 全テストの通過（特に VRT） |
| ドキュメント | 不要 | CI の通過のみ |

- **リトライなしで確認する理由**: CI は `retries: 2` で、不安定なテストが「成功」に見える。リトライなし・並列で繰り返すと、競合状態（flaky）を事前に見つけられる（実例: #71）
- **ローカルでは確認できないもの**: VRT（基準画像は Linux 用で、Windows では比較できない）、gh-pages・Pages・権限・`/update-vrt`
- CI でしか確認できない変更は、**ドラフト PR** で出して CI を確認してから、レビュー可能にしてよい
- PR 本文の「動作確認」には、**ローカルで確認したこと / CI で確認すること / マージ後に確認すること**を分けて書く
- CI が失敗した PR は放置せず、原因を調べて修正する(または、方針が変わったならクローズする)

## ブランチ・コミット・PR

- ブランチ名は `種別/内容` の形式。種別は `feature` / `fix` / `ci` / `docs` / `refactor` / `test` / `chore`。
- コミットメッセージは `種別: 概要`(日本語)。例: `ci: PRテストワークフローの修正`。
- `main` に直接 push しない。必ずブランチを切って PR にする。
- PR 本文は [PR テンプレート](.github/PULL_REQUEST_TEMPLATE.md) の見出し(概要 / 関連 Issue / 変更内容 / 動作確認)に沿って書く。
- 1 つの PR では 1 つの目的だけを扱う。無関係な変更を混ぜない。

## 権限・シークレット

- ワークフローの `permissions` は最小限にする(Issue #33 の方針)。広げる必要がある場合は、理由をコメントに書く。
- `.env.staging` / `.env.prod` は**機微な値を入れない設定用ファイル**(現在は `ENV_NAME` と `RUN_FULL_TESTS` のみ)。パスワード・トークンなどは追加せず、GitHub Secrets を使う。
- `.env` はコミットしない。シークレットの値をログ・コメント・コミットに出力しない。

## Claude に作業を任せるとき

QA の役割は、プロダクト・プロジェクトの品質を**どれだけ効率よく保つか**を考えて実行すること。そのため、**マージ以外は確認を取らず、自主的に進めてよい**。常に最善案を示し、ユーザーへの相談は「ユーザーの判断が本当に必要なとき」に限る。

自主的に行ってよいこと(確認不要):
- テストコード・POM の追加と修正、ドキュメントの更新
- 調査、再実行、レビューコメント、Issue / PR の要約
- Issue の作成、Issue 上での相談(Claude とのコメントのやり取り)と最善案のまとめ
- ブランチの作成、コミット、プッシュ、PR の作成
- `.github/workflows/` の変更、依存パッケージの更新、VRT 画像の更新(`/update-vrt`)の **PR 作成まで**
- 行き詰まったときは、他に課題がないかを調べて Issue を作成し、自主的に進める

**必ずユーザーに確認すること**:
- **マージ**(`main` へのマージ)。1 件マージし、両リポジトリのワークフロー(テスト・デプロイ)が完了して成功してから、次をマージする
- 判断をユーザーに委ねる必要がある事項(方針の分岐、コスト・権限に関わること)

その他、取り返しのつかない操作(force push、ブランチ・リポジトリの削除、Secrets の値の取り扱い)は慎重に扱い、事前に確認する。

進め方:
- QA リポジトリで先に作成・検証 → 本体リポジトリへ PR(本体へのマージも確認が必要)
- 作業を進める前に、本体と QA の**両方**のワークフロー状況を確認する

GitHub Actions 上の Claude の制約:
- GitHub App の仕様上、Claude は **`.github/workflows/` 配下のファイルを直接変更・コミットできない**。
- ワークフローの変更を頼まれたときは、変更案(diff)をコメントで示し、人が適用する(または人がブランチを作って変更する)。
- ローカルの Claude Code(人の権限で動く)は、この制約を受けないため、ワークフローの変更も PR 作成まで自主的に行える(マージは確認が必要)。

やってはいけないこと:
- `--no-verify` などによる hook の回避
- シークレットの値の出力
- 確認なしでの外部への公開・送信
