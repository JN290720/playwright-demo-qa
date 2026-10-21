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

- `knowledge`: ナレッジ・レポート・記録の Issue。次のアクションが基本無いもの。日次レポートの「優先度ラベルが無い」の確認と、判断待ちの表から除外される。決定記録・日次レポート・観点の親子・体制の一覧・バックログに付ける
- 優先度（`P0`〜`P3`）: 人が Issue に付ける（[CONTRIBUTING.md](../CONTRIBUTING.md)）
- 自動で作られる Issue のラベル（失敗の通知・日次・依存関係・観点・既知の不具合）と、運用ラベル（`needs-user-decision`・`blocked-by-merge`・`ready-for-pr`・`backlog`）: [README](../README.md) の「Issue のラベルの意味」を参照