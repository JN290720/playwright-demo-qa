# ラベルの一覧と付け方（起票者のラベルを中心に）

全員が同じ GitHub アカウントで起票・コメントするため、**誰が起票したか**を、ラベルで示します。Issue と PR のテンプレートの「誰が」の欄と、あわせて使います。今日以降の Issue・PR から付けます（さかのぼりません）。

## 起票者のラベル（1 つ付ける）

| ラベル | 意味（起票した人） |
| :--- | :--- |
| `by-leader` | リーダー |
| `by-worker` | 作業エージェント |
| `by-reviewer` | レビューエージェント |
| `by-designer` | テスト設計エージェント |
| `by-quality` | 品質管理エージェント |
| `by-user` | ユーザー |

- 起票者は 1 つだけ。**発見者と起票者は別のことがある**（例: レビューが見つけ、品質管理が起票 → `by-quality`）。発見者・対応者・レビュー者・承認者は、本文の「誰が」の欄に書く（署名の識別子で）

## 付け方

```bash
# Issue を作るとき
gh issue create --title "…" --body-file body.md --label by-quality --label P3

# PR を作るとき
gh pr create --title "…" --body-file body.md --label by-worker

# 後から付けるとき
gh issue edit <番号> --add-label by-quality
gh pr edit <番号> --add-label by-quality
```

- Issue フォーム（`.github/ISSUE_TEMPLATE/*.yml`）の既定ラベル（`labels:`）は固定のため、起票者ごとの自動付与はできない。起票者のラベルは、手で付ける

## 絞り込みの例

```bash
gh issue list --label by-worker            # 作業エージェントが起票した Issue
gh pr list --label by-quality --state all  # 品質管理が起票した PR
```

## 他のラベル

- 優先度（`P0`〜`P3`）: 人が Issue に付ける（[CONTRIBUTING.md](../CONTRIBUTING.md)）
- 自動で作られる Issue のラベル（失敗の通知・日次・依存関係・観点・既知の不具合）と、運用ラベル（`needs-user-decision`・`blocked-by-merge`・`ready-for-pr`・`backlog`）: [README](../README.md) の「Issue のラベルの意味」を参照

## 管理用ラベルの役割の境界

次の 4 つは、Issue の「今の状態」を分けるためのラベル。原則として、1 つの Issue には、どれか 1 つだけを付ける（例外が要るときは、Issue の本文に理由を書く）。

| ラベル | 役割（付ける条件） | 付ける人 | 外す・閉じる条件 | スクリプトの扱い（確認した範囲） |
| :--- | :--- | :--- | :--- | :--- |
| `improvement-proposal` | 改善の提案（まだ採否が決まっていない）。提案の入口（従来は [#152](https://github.com/JN290720/playwright-demo-qa/issues/152) のような提案の場。今は Backlog（PWQA）で扱い、PR には課題キーだけを書く） | エージェント・人 | 採否が決まったら外し、採用なら `backlog`、却下なら閉じる（運用の想定） | 参照なし（スクリプト・文書・テンプレートからは読まれていない） |
| `backlog` | 採用が決まったが、未着手の作業（順番を待つもの） | 人（リーダーの判断） | 着手したら外す（作業の Issue・PR に移る）（運用の想定） | `daily-report` の Issue 一覧から除外する（`backlog` の Issue は、日次の open 一覧に出ない） |
| `knowledge` | 記録・報告（決定記録・日次レポート・観点の親子・体制の一覧など）。次のアクションが基本無いもの | 人・エージェント | 決定記録（日付ごと）は翌日の朝に閉じる。それ以外（日次レポート・観点の親子・体制の一覧・バックログ）は開いたままでよい | 優先度ラベルの警告（「優先度ラベルが無い Issue」）から除外する |
| `user-board` | リーダー → ユーザーの報告・判断依頼（ユーザーに見てもらう板） | リーダー | 常設のため閉じない（従来の板 [#155](https://github.com/JN290720/playwright-demo-qa/issues/155)。今の課題は Backlog（PWQA）。PR には課題キーだけを書く） | 参照なし（スクリプト・文書・テンプレートからは読まれていない。運用の想定） |

- 迷ったとき: 採否が未定なら `improvement-proposal`、採用済みで未着手なら `backlog`、記録だけなら `knowledge`、ユーザーの判断を求めるなら `user-board`
- 例外: [#25](https://github.com/JN290720/playwright-demo-qa/issues/25)（改善バックログと相談事項）は、`knowledge` と `backlog` を併用する（規則の例外）
- 「参照なし」は、このリポジトリのスクリプト・文書・テンプレートを grep した結果。運用上の使い方は、リーダーの判断に従う