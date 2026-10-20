# プロジェクトの全体像

このリポジトリは、デモ用のショッピングサイト（SauceDemo）などに対する自動テストと、その CI/CD（GitHub Actions）を管理する QA 用のリポジトリです。初めて読む人・AI は、この 1 ページから入り、詳しくは各リンク先を読んでください。

## 1. 対象

- **テスト対象のサイト（SauceDemo）**: ログイン・商品一覧・商品詳細・カート・購入手続き・サイドメニュー。意図的な不具合や遅延を再現するユーザー（`problem_user` など）も含む
- **TodoMVC**: 基本操作（追加・完了・削除）と、破壊的な操作
- **API**: jsonplaceholder（テスト用の公開 API）
- **端末・ブラウザ**: PC（Chrome）、スマホ（Chrome。Pixel 5 の画面サイズ）、Safari（`main` のみ）、Android エミュレータ（Chrome）
- 観点ごとに、どの画面を何で確認しているかは [テスト観点表](test-matrix.md) を参照

## 2. 今できること

テストの種類（詳しくは観点表と、`tests/` のファイル名）:

- 機能（正常系・特殊ユーザー・購入フロー）
- 異常系・破壊的な操作・購入手続きのやり直し
- セキュリティ（入力・保護ページへの直接アクセス）
- アクセシビリティ（axe による WCAG 基準の検査）
- VRT（画面の見た目の比較。PC・スマホ・Android）
- ネットワーク（画像の読み込み失敗・遅い通信・オフライン・外部リソースの失敗の模擬）
- API
- 性能（主要な画面の表示速度の記録。しきい値は無く、記録のみ）
- 既知の不具合の記録（`test.fail()`。[既知の不具合の台帳](known-site-issues.md)・[a11y の台帳](a11y-known-issues.md)）

運用（自動化されている作業）:

- PR のテスト（staging・全テスト）と、結果のコメント
- VRT の基準画像の更新（PR への `/update-vrt`、Android の手動実行）
- デプロイ後の確認（本番では、主要機能のみ）
- 週次の全テストと、テスト対象サイトの変化の検知
- テスト観点の Issue の表の自動更新（デプロイのたび。`scripts/sync-test-viewpoint-issues.js`）
- 既知の不具合の「直った可能性」の通知（週次。`scripts/notify-site-fixed.js`。[台帳](known-site-issues.md) の見直しの合図）
- 日次レポート、依存関係レビュー、テストレポートの公開（GitHub Pages）と整理
- 失敗時の自動の Issue による通知（ラベルの意味は [README](../README.md) の「Issue のラベルの意味」）

## 3. ワークフロー（GitHub Actions）

- ワークフロー（いつ動くか・何のためか・結果を誰が見るか）の一覧は、[README](../README.md) の「CI/CD パイプライン」の表を参照（ここには重複させない）
- 手順（VRT の更新・Android の基準画像）は [README](../README.md)
- 作業のルール（ブランチ・コミット・PR）は [CONTRIBUTING.md](../CONTRIBUTING.md)
- AI への作業ルールは [CLAUDE.md](../CLAUDE.md)
