# CLAUDE.md

Playwright による E2E テスト・ビジュアルレグレッションテスト(VRT)と、GitHub Actions による CI/CD のデモプロジェクト。
全体像は [docs/overview.md](docs/overview.md)、詳細な手順は [README.md](README.md) を参照。このファイルには、作業時に守るルールの要点だけを書く。

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
- `tests/pages/`: Page Object Model(画面ごとの部品。一覧は書かず、このフォルダを見る)
- `tests/saucedemo-visual-regression.spec.ts-snapshots/`: VRT のベースライン画像
- `.env.staging` / `.env.prod`: 環境ごとの設定。`ENV` 環境変数で切り替える(未指定は `prod`)
- `playwright.config.ts`: プロジェクトは `desktop-chrome` / `mobile-chrome` / `desktop-safari`。PR では `desktop-safari` は**縮小版（`@safari-pr` タグ付きの 16 件）だけ**、PR 以外(main など)は全テスト
- `.github/workflows/`: 一覧と、各ワークフローのトリガー・副作用は [README.md](README.md) の「CI/CD パイプライン」を参照

  - 同時実行（`concurrency`）: PR のテストは、同じ PR への新しい push で**古い実行をキャンセル**する。コメントの実行（`/update-vrt`）は、コメントごとに独立したグループで、キャンセルしない。Deploy / Post-Deploy は、キャンセルせず同時に 1 つだけ実行する

## コマンド

```
npm ci
npx playwright install --with-deps
npm run test              # 環境指定なし(ENV 未指定は prod)。@prd タグ付きの主要機能のみ
npm run test:stg          # ENV=staging。全テスト(フル検証)
npm run test:prod         # ENV=prod。@prd タグ付きの主要機能のみ
npx playwright test --ui  # UI モード(デバッグ用)
npx playwright show-report
```

### stg と prd の実行範囲(ユーザー判断 #45)

テスト対象のデモサイトは 1 つで、環境ごとの対象は無い。**stg / prd は「テスト内容」で分ける**。

| 環境 | どこで使う | 実行するテスト |
|---|---|---|
| **stg**（`ENV=staging`） | PR の CI（`pull-request.yml`） | **全テスト**（フル検証） |
| **prd**（既定・`ENV=prod`） | デプロイ後（`test.yml` の Post-Deploy Test） | **`@prd` タグ付きの、必須の主要機能のみ** |

- 切り分けは `playwright.config.ts` の `grep` で一括して行う（`ENV_NAME` が `staging` 以外なら `@prd` のみ）。**各 spec に `ENV_NAME` の判定を書かない**
- prd で動かすテストには、`test.describe('...', { tag: '@prd' }, ...)` のように **`@prd` タグ**を付ける。現在の対象: 購入フロー（ログイン → 購入完了）、ログイン・カート追加、TodoMVC の基本機能
- **タグの無いテストは、prd では実行されない**（破壊的・異常系、セキュリティ入力、a11y、VRT、network、API、ソート・カート、購入入力の検証など）。新しいテストは、既定では stg のみ
- ローカルで、タグの無いテストを実行するときは `ENV=staging`（`npm run test:stg`）を付ける。付けないと「No tests found」になる

## テストの規約

- 画面操作は Page Object Model(`tests/pages/`)に寄せ、spec に直接セレクタを書き散らさない。
- `test.only` は残さない(CI で `forbidOnly` により失敗する)。
- テスト名は、何を確認するかが分かる日本語で書く(既存の spec に合わせる)。
- **新しい spec ファイルを追加したら、`scripts/generate-test-catalog.js` の `FILE_INFO` に、対象サイトと観点を追記する**（テスト観点表 = 公開サイトの `test-catalog.html` の分類に使う。未登録だと「未分類」になり、CI に警告が出る）
- 待機は固定の `waitForTimeout` ではなく、Playwright の自動待機・`expect` を使う。

## VRT の運用

- CI(Linux)が比較に使うのは **`*-linux.png`**。
- Windows などローカルで生成された `*-win32.png` / `*-darwin.png` は**コミットしない**。
- 画像を更新するときは、**PR に `/update-vrt` とコメントする**(CI が Linux 環境で撮り直して PR ブランチにコミットする)。ローカルで撮り直した画像をコミットしない。
- `/update-vrt` で自動コミットされた画像は `[skip ci]` 付きのため、テストは再実行されない。必要なら空コミットなどで再実行する。
- 画像を更新する PR には、更新した理由(サイト側の変更など)を PR 本文に書く。
- **PR で動く Safari の縮小版（`@safari-pr` タグ付きの 16 件）**: PR の CI は、Safari では VRT 14 件・購入フロー・ログイン/カートだけを実行する（ユーザー判断 D31、#152）。対象は**タグで選ぶ**（ファイル名・describe の名前に依存しない）。PR で動かすテストを増減するときは、`@safari-pr` を付け外しする
- **Safari の基準画像（`*-desktop-safari-linux.png`）が、WebKit の更新などで古くなり、Safari の VRT だけが文字の縁の差で失敗したら、`/update-vrt project=desktop-safari`（ユーザーの承認が要る操作）で撮り直す**。ほかの原因（実害・flaky）は、先に切り分ける
- **試行の期限と、戻す基準**: 2026-11-21 まで（1 か月）。指標: ①PR で Safari の縮小版**だけ**が失敗した件数と原因（実害 / 基準の古さ / flaky）②PR の `test` ジョブの時間（目安: 5 分以内。導入前の平均 196 秒）。①が 0 件で、基準の撮り直しが負担なら、PR は Chrome 2 つに戻す（`playwright.config.ts` の PR 用の `desktop-safari` を削除）

## PR を出す前の確認(ローカルと CI の役割分担)

QA リポジトリは、**失敗を安全に検知するための検証用プロジェクト**。PR の CI(Linux。実際の実行環境)が失敗しても本体には影響しないため、**ローカルで確認を済ませてからでなくても、PR を先に出してよい**(ユーザー判断 2026-10-19)。CI で失敗を検知して直す進め方で問題ない。

ただし、次を守る。
- **CI が失敗した PR は見逃さず**、原因を調べて修正する(方針が変わったならクローズする)。失敗のまま放置・マージしない
- **取り消せない・外部に影響する操作**（削除を行うスクリプト、設定・Secrets の変更、`/update-vrt` など）は、先に dry-run やダミー構成で確認する
- **flaky は CI でも検知できるようにする**（#37）。今の CI は `retries: 2` で、リトライで通った不安定なテストは結果上は成功になるが、警告として表示される。そのため、ローカルのリトライなしの確認が役に立つ間は、並行して行う

ローカルで**先に確認すると速く・安く済むこと**（任意。ローカルで確認できないことは、PR の CI またはマージ後に確認する）:

| 変更の種類 | ローカルで確認すると早いこと | PR の CI / マージ後に確認すること |
|---|---|---|
| テスト・POM | `npm run typecheck` / `npx playwright test --list` / 変更した spec を **staging（`ENV=staging`）と既定（prod）の両方**で実行 / 新規・変更したテストは **CI 相当（`CI=true`）の並列・リトライなしで繰り返す**（`--retries=0 --repeat-each=3` など） | VRT（Linux の基準画像との比較）、全テストの通過 |
| ワークフロー | YAML の構文（`js-yaml` など）/ 中のシェル・スクリプトを bash などで単体確認 | ワークフローの実際の動作 / `schedule`・`issue_comment` は**マージ後**に手動実行などで確認 |
| 設定（`playwright.config.ts`・`package.json` など） | `npm run typecheck` / `npx playwright test --list` | 全テストの通過（特に VRT） |
| ドキュメント | 不要 | CI の通過のみ |

- **リトライなしで確認する理由**: CI は `retries: 2` で、リトライで通った不安定なテストは結果上は成功になる（警告として表示される）。リトライなし・並列で繰り返すと、競合状態（flaky）を事前に見つけられる（実例: #71）
- **ローカルでは確認できないもの**: VRT（基準画像は Linux 用で、Windows では比較できない）、gh-pages・Pages・権限・`/update-vrt`
- CI でしか確認できない変更は、**ドラフト PR** で出して CI を確認してから、レビュー可能にしてよい
- PR 本文の「動作確認」には、**ローカルで確認したこと / CI で確認すること / マージ後に確認すること**を分けて書く

## テストレポートの公開（GitHub Pages）

- **公開元は `gh-pages` ブランチ**（`build_type=legacy`、本体と同じ構成）。テストレポート（`main-deploy-report/` = 最新、`main-test-<run id>/` = 実行ごと、`pr-reports/<ブランチ>/` = PR ごと）と、`public/`（Deploy App が公開）が、同じ `gh-pages` に置かれる
- 公開元を「GitHub Actions」にしてはいけない（`gh-pages` が配信されず、レポートが 404 になる。実例: #89）
- PR のレポートは、**PR をマージ／クローズすると削除される**（`Cleanup PR Report`）。`main` のレポートは削除されない
- 公開元の設定を API で変えても、**ビルドは自動で始まらない**。`POST /repos/{repo}/pages/builds` で依頼するか、`gh-pages` に push する
- レポートの URL が 404 のときの確認: (1) `gh api repos/{repo}/pages` で `build_type` と `source` (2) `gh-pages` ブランチにファイルがあるか (3) `pages/builds/latest` の `status`

## ブランチ・コミット・PR

- ブランチ名は `種別/内容` の形式。種別は `feat` / `fix` / `ci` / `docs` / `refactor` / `test` / `chore`（一覧と意味は [CONTRIBUTING.md](CONTRIBUTING.md) を参照）。
- コミットメッセージは `種別: 概要`(日本語)。例: `ci: PRテストワークフローの修正`。
- `main` に直接 push しない。必ずブランチを切って PR にする。
- PR 本文は [PR テンプレート](.github/PULL_REQUEST_TEMPLATE.md) の見出し(概要 / 背景・経緯 / 承認の根拠 / 関連 Issue / PR / 変更内容 / 動作確認・テスト内容 / スクリーンショット（任意）/ レビュワーへの連絡・特記事項)に沿って書く。
- 1 つの PR では 1 つの目的だけを扱う。無関係な変更を混ぜない。
- 積み重ね PR（別の PR のブランチを base にした PR）は作らない。依存する変更は、先の PR を `main` にマージしてから、`main` から新しいブランチを切る。base が `main` でない PR は、マージ前に base を確認する。
- 新しいテストは、観点の Issue → ケース案 → 承認 → 実装の順（手順は [CONTRIBUTING.md](CONTRIBUTING.md) の「テストの追加の流れ」）。承認の前に実装しない。
- 専門用語は、初めて出すときに一言の説明を付ける。PR・Issue には目的を書く（[CONTRIBUTING.md](CONTRIBUTING.md) の「用語の注釈」）。

## 権限・シークレット

- ワークフローの `permissions` は最小限にする(Issue #33 の方針)。広げる必要がある場合は、理由をコメントに書く。
- `.env.staging` / `.env.prod` は**機微な値を入れない設定用ファイル**(現在は `ENV_NAME` のみ。未使用だった `RUN_FULL_TESTS` は削除した)。パスワード・トークンなどは追加せず、GitHub Secrets を使う。
- `.env` はコミットしない。シークレットの値をログ・コメント・コミットに出力しない。

## バージョンの固定（ユーザー判断 #35）

基本的に**すべてのバージョンを固定**する（「昨日は通ったのに今日は落ちる」を防ぐ）。

- **Node**: `.nvmrc`（Active LTS の主バージョン）に一本化。ワークフローの `setup-node` は `node-version-file: '.nvmrc'`
- **npm パッケージ**: `package.json` は `^` を付けない完全固定。再現は `npm ci` + `package-lock.json`
- **GitHub Actions**: **コミット SHA で固定**し、版をコメントに残す（例: `uses: actions/checkout@<SHA> # v6.0.3`）。`@v4` のようなタグ指定にしない
- **選定基準**: 公開から **14 日以上**たった安定版 / **メジャーは自動で上げない**（別途検証）/ セキュリティ修正は例外（速やかに採用）
- 更新は、週次の依存関係レビュー（Issue「依存関係レビュー（週次・自動）」。`scripts/dependency-review.js`）の提案を見て、PR で行う。Actions の更新は、新しい版のタグから SHA を調べて置き換える
- PR のブランチは、`.nvmrc` を含む最新の `main` から作る（古いブランチは `setup-node` が失敗する）

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


やってはいけないこと:
- `--no-verify` などによる hook の回避
- シークレットの値の出力
- 確認なしでの外部への公開・送信
