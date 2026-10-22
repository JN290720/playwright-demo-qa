# テスト ID の規則と台帳

テストの題名の先頭にある ID（`P1`・`K2`・`C5` など）の使い方と、今ある ID の一覧です。台帳・Issue・PR・会話で ID を書くときは、ここに従ってください。
観点ごとの「何を、どこまでテストしているか」は [テスト観点表](test-matrix.md) を見てください。

## 1. 規則

1. **ID は、spec（ファイル）の中で読む**。`P1` だけでは、どの spec のテストか決まらない。台帳・Issue・PR・会話で書くときは、ファイルの略称を前に付ける（例: `VRT P1`・`qa-destructive P7`）。ID の無いテストは、「ファイル名 + 題名の先頭」で書く。
2. **新しい spec の接頭辞は、既存の接頭辞と重複させない**。英字 1〜4 文字。`P` は優先度（P1〜P3）と紛らわしいため、新しい spec では使わない。
3. **同じ describe の中で、データごとに同じ ID を付けるのは許容する**（例: 商品 ID 0〜5 のループの `D3`）。展開後の件数は、下の「件数」の数え方に従う。
4. **既存の ID は変えない**。ファイル間で重複している `P1`〜`P5` なども、台帳に書いたうえで、そのままにする（タイトルを変えると、台帳・カタログ・既知の不具合の記録が、ずれるため）。
5. **使った ID は、テストを消しても再利用しない**（台帳の参照を壊さないため）。
6. **テストを追加・削除する PR は、この台帳と [テスト観点表](test-matrix.md) も同じ PR で更新する**。

## 2. 件数の数え方

台帳の「件数」は、次のとおりに数えます。

**件数 = ソース上の `test(` の宣言数。データやループで展開した後の件数（ループは回数ぶん数える）。ID の種類数ではない。**

- プロジェクト（`desktop-chrome` など）ごとの数です。VRT は 3 プロジェクトで実行されます。
- 確認は、`npx playwright test --list`（`ENV=staging` で、全テストが対象）で行えます。

## 3. 接頭辞の一覧

| 接頭辞 | 使う spec | 備考 |
|---|---|---|
| `P` | `saucedemo-qa-destructive`・`saucedemo-accessibility`・`saucedemo-network-mocking`・`saucedemo-visual-regression`・`todomvc-destructive` | 5 spec で重複（P1〜P5）。新しい spec では使わない |
| `K` | `saucedemo-accessibility`（キーボード操作） | K1〜K4、K3b |
| `C` | `saucedemo-cart-checkout` | C1〜C6 |
| `A` | `saucedemo-checkout-totals`（金額） | A1〜A5 |
| `S` | `saucedemo-protected-pages`（保護ページ・セッション） | S1〜S8 |
| `D` | `saucedemo-product-detail`・`saucedemo-product-detail-errors` | D1（存在しない商品）と、D3〜D5（詳細ページ） |
| `B` | `saucedemo-back-navigation`（戻る系の画面遷移） | B1・B2 |
| 番号 | `todomvc-basic` | 1〜6（接頭辞ではなく、番号だけ） |

## 4. 台帳（`tests/` の spec、`origin/main` の宣言から実測）

| spec（`tests/` 配下） | 接頭辞（ID） | 件数 | 内訳 |
|---|---|---|---|
| `saucedemo-qa-destructive.spec.ts` | P | 12 | P1〜P12 |
| `saucedemo-accessibility.spec.ts` | P, K | 17 | P1〜P9（P4b・P5b・P8b を含む）12 件、K1〜K4（K3b を含む）5 件 |
| `saucedemo-network-mocking.spec.ts` | P | 5 | P1〜P5 |
| `saucedemo-visual-regression.spec.ts` | P | 14 | P1〜P14（1 プロジェクトあたり。3 プロジェクトで実行） |
| `todomvc-destructive.spec.ts` | P | 7 | P1〜P7（TodoMVC） |
| `saucedemo-cart-checkout.spec.ts` | C | 6 | C1〜C6 |
| `saucedemo-checkout-totals.spec.ts` | A | 6 | A3 の前提（ID なし・1）・A1〜A5（ループ 5） |
| `saucedemo-protected-pages.spec.ts` | S | 9 | S1（1）・S2〜S4（ループ 3）・S5・S6・S7（ループ 2）・S8 |
| `saucedemo-product-detail.spec.ts` | D | 8 | D3（ループ 6）・D4・D5 |
| `saucedemo-product-detail-errors.spec.ts` | D | 4 | D1（ループ 4） |
| `todomvc-basic.spec.ts` | 番号 | 6 | 1〜6 |
| `saucedemo-back-navigation.spec.ts` | B | 2 | B1（購入完了の「Back Home」）・B2（詳細からブラウザの「戻る」） |

**ID の無い spec（11 件）**: `login`・`saucedemo-checkout-after-purchase`・`saucedemo-checkout-injection`・`saucedemo-checkout-validation`・`saucedemo-e2e-purchase`・`saucedemo-inventory-cart`・`saucedemo-security-input`・`saucedemo-sidebar-logout`・`saucedemo-user-types`・`todomvc-smoke`・`api-demo`。ID は任意（新しく書く場合は、規則 2 に従う）。

**合計**: ID の付いた 12 spec で 96 件（1 プロジェクトあたり。件数の列の合計）。

## 5. 参照の例

- 観点表: `VRT P1`（ログインページの見た目）・`qa-destructive P7`（ログアウト後の戻る）・`a11y K2`（ログイン画面で Enter で送信）
- 既知の不具合の記録: 「ファイル › describe › テスト名」（[既知のサイト不具合](known-site-issues.md)）

## 6. 更新のしかた

- 台帳の件数は、手で書いています。テストを追加・削除したら、この表も同じ PR で直します。
- 台帳と実際のずれは、`npx playwright test --list` の件数と、`tests/` の宣言で確かめます。
