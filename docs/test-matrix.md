# テスト観点表（画面 × 観点）

「何を、どこまでテストしているか」と、その抜けを一覧にしたものです。優先度付けの根拠として使います。
更新のしかた: テストを追加・削除したら、このファイルも同じ PR で更新してください。

- 対象: SauceDemo（`https://www.saucedemo.com`）に対するテスト
- 凡例: ✅ あり / △ 一部のみ / ❌ なし / ─ 対象外
- 括弧内は、対応する spec（`tests/` のファイル名）とケース番号、または抜けを扱う Issue です（`#` は `playwright-demo-qa` の Issue）
- この表は、`tests/` の spec の内容を読んで書いています（2026-10-20 時点）。spec の名前だけで判断しないでください

## 1. 画面 × 観点

| 画面 | 機能（正常系） | 異常系 | セキュリティ | a11y | VRT | ネットワーク |
|---|---|---|---|---|---|---|
| ログイン | ✅ 導線とカート追加（`login` パターン 2）。購入まで（`e2e-purchase`） | ✅ `qa-destructive` P1〜P5（未入力・無効・ロック・前後の空白） | △ `security-input`（SQLi・XSS 風文字列）、`qa-destructive` P8（パスワードのマスク） | ✅ `accessibility` P1・P9、K1・K2（キーボード） | ✅ VRT P1・P9・P10 | △ `network-mocking` P2（遅延下のログイン） |
| 商品一覧 | ✅ ソート 4 種（名前・価格。`inventory-cart`）、カート追加（`e2e-purchase`） | ❌ 一覧固有の異常系は無し（画像の失敗は、下のネットワーク列） | △ `qa-destructive` P6（未ログインの直リンク） | ✅ `accessibility` P2 | ✅ VRT P2・P14（価格の高い順） | △ `network-mocking` P1（画像 500）、P3（オフライン。強化は #56） |
| 商品詳細 | ✅ `product-detail` D3（一覧と同じ内容）、D4（カート追加と削除）、D5（一覧へ戻る） | ✅ `product-detail-errors` D1（存在しない商品） | ❌ 未実施（ID の改ざんなど） | ✅ `accessibility` P3 | ✅ VRT P3 | ✅ `network-mocking` P4（画像の読み込み失敗） |
| カート | ✅ 削除・再読み込みの保持・「Continue Shopping」（`inventory-cart`）、C2（Cancel）・C4（再読み込み）（`cart-checkout`） | ✅ C6（素早い 2 回押し。`cart-checkout`） | ❌ | ✅ `accessibility` P4・P4b。※カートのリンクはキーボードで開けない（K3b。`docs/a11y-known-issues.md`） | ✅ VRT P4・P12（空）・P13（商品あり） | △ `network-mocking` P2（遅延下のカート追加） |
| 購入手続き入力 | ✅ 日本語の氏名・郵便番号で確認へ進む（`checkout-validation`）、C2（Cancel。`cart-checkout`）、K4（キーボードで完走） | ✅ 項目ごとの欠落（`checkout-validation`）、全項目未入力（`qa-destructive` P11）。空のカートで進める既知の不具合（C1） | ✅ 姓・名・郵便番号へのインジェクション風文字列 4 種で、ダイアログ・注入要素が 0 件（`checkout-injection`。#169） | ✅ `accessibility` P5・P5b（入力エラー表示）・K4 | ✅ VRT P5・P11 | ❌ |
| 購入確認 | ✅ 小計・税・合計と、各商品の価格（`checkout-totals` の全ケース。`e2e-purchase` の 5）、C3（Cancel。`cart-checkout`） | ❌ | ❌ | ✅ `accessibility` P6 | ✅ VRT P6 | ❌ |
| 購入完了 | ✅ 注文完了まで（`e2e-purchase`。`@prd`）、完了後に「戻る」で一覧まで戻ってもカートが空（`checkout-after-purchase`。#168） | ✅ `qa-destructive` P12（完了画面の直リンク） | △ 直リンクの扱い（`qa-destructive` P12） | ✅ `accessibility` P7 | ✅ VRT P7 | ❌ |
| サイドメニュー | ✅ 各リンク（All Items / About / Logout / Reset App State）、閉じる（×・Esc）（`sidebar-logout`） | ❌ | ❌ | ✅ `accessibility` P8・K3（キーボードで開閉） | ✅ VRT P8 | ❌ |
| ログアウト | ✅ ログイン画面に戻る・入力欄が空（`sidebar-logout`） | ✅ 戻るボタン後の保護（`qa-destructive` P7）、ログアウト後の直リンクの保護（`checkout-validation`。認可の検証） | △ Cookie の操作（`protected-pages` S6・S7。S8 は既知の不具合） | ❌ | ❌ | ❌ |

補足:
- VRT は、`desktop-chrome` / `mobile-chrome` / `desktop-safari` の 3 プロジェクト × 14 画面（P1〜P14）= 42 枚のベースライン（`*-linux.png`）がある。VRT の spec は、3 プロジェクトすべてで実行される
- **実行環境（#45）**: stg（PR の CI）は**全テスト**、prd（Post-Deploy）は **`@prd` タグ付きの必須の主要機能のみ**。`@prd` の対象: 購入フロー E2E、ログイン・カート追加、TodoMVC の基本機能。a11y / VRT / network / security / API / ソート・カート / 購入入力の検証 / 破壊的・異常系は、stg のみ
- **モバイル**: `playwright.config.ts` に `testMatch` の指定が無いため、すべての spec は `mobile-chrome` でも実行される（機能テストも含む）
- SauceDemo 以外の対象（TodoMVC、`playwright.dev`、jsonplaceholder）は、デモ用として、この表の対象外（`todomvc-*.spec.ts`（basic / smoke / destructive）、`api-demo.spec.ts`。TodoMVC のテストは、名前で対象が分かるようにリネーム済み。#17）

## 2. 不足している観点（リスク順）

前回の表（#152 の提案より前）に挙げた抜けのうち、解消済みのもの（テストが存在する）と、残っているものを分けています。

### 解消済み（spec が存在する）

| もとの抜け | 扱った spec | 状態 |
|---|---|---|
| 購入フロー正常系 E2E と、金額（小計・税・合計）の検証（#14 / PR #28） | `e2e-purchase`（`@prd`）、`checkout-totals` | 解消 |
| チェックアウト入力の異常系（項目ごとの欠落）（#55） | `checkout-validation` | 解消 |
| 保護ページへの直リンク、ログアウト後の保護（#55） | `qa-destructive` P6・P7、`checkout-validation`（ログアウト後の直接アクセス）、`protected-pages` S5〜S7 | 解消 |
| 商品詳細の、画像が読み込めないときの表示（ネットワーク。P4） | `network-mocking` P4 | 解消 |
| ソート 4 種、カート操作、商品詳細（#16 / PR #31） | `inventory-cart`、`product-detail`、`product-detail-errors` | 解消 |
| モバイルの機能テスト（#14 の実装で兼ねる） | 全 spec が `mobile-chrome` でも実行される | 解消 |

### 残っているもの

| 優先度 | 抜け | なぜリスクか | 扱う Issue / PR |
|---|---|---|---|
| P1 | 検証が弱いテスト（XSS、P9、P12）。緑でも品質を保証していない可能性 | 緑でも、確認していることが少ない | #29 / PR #30（状態は未確認） |
| P2 | network P2・P3 が、題名どおりに検証していない可能性 | 何が起きても通る | #56 / PR #59（状態は未確認） |
| P2 | 購入入力欄のインジェクション風文字列（姓・名・郵便番号）の扱い | 入力が画面にそのまま出る・スクリプトが動くかを、確認していない | #55 に統合するか（[#152 の調査](https://github.com/JN290720/playwright-demo-qa/issues/152) A-2。判断待ち） |
| P3 | 購入完了後に「戻る」を押したときの状態（カート・再購入） | 前の状態が見えると、二重の購入につながる | 新しい観点 Issue（[#152 の調査](https://github.com/JN290720/playwright-demo-qa/issues/152) A-1） |
| P3 | 購入手続きの途中の再読み込み（入力値・カート） | 入力の消失や、カートの不一致 | 新しい観点 Issue（[#152 の調査](https://github.com/JN290720/playwright-demo-qa/issues/152) A-3。仕様の判断が要る） |

## 3. 品質上の注意（観点とは別）

- 認証情報・URL がテストに直書きされている可能性（件数は、次回の調査で確認する）→ #18 / #41
- ログイン手順が a11y / VRT / network の各 spec に重複 → POM に寄せる（`CLAUDE.md` の規約）
- `retries: 2` により、リトライで通った不安定なテストは結果上は成功になる。ただし flaky として警告表示される（Job Summary・PR コメント。#37）
- a11y の除外・既知の不備は、`docs/a11y-known-issues.md` に台帳として記録（カートのリンクがキーボードで開けない不備、ホバー時のコントラスト不足など。`select-name` の除外は、サイトの修正を確認して外した）。失敗を期待するテスト（`test.fail()`）は、サイトが直ると失敗して気づける（#58）

## 4. 重視する観点（判断待ち）

優先順位の案: **機能（購入フロー・金額）→ セキュリティ（認可・セッション）→ a11y → 性能（今回は対象外）**。
ユーザーの判断で変わります（#39）。
