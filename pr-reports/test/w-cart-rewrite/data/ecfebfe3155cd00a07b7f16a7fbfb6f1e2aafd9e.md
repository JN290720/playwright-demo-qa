# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saucedemo-cart-rewrite.spec.ts >> SauceDemo カートの書き換え（cart-contents） >> W3: [既知の不具合] JSON でない値に書き換えても、画面が表示され、カートは空として扱われ、ページ上の例外が出ないこと
- Location: tests/saucedemo-cart-rewrite.spec.ts:51:7

# Error details

```
Error: 画面が表示されること（本文が 0 文字ではない）

expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

```
Error: ページ上の例外が出ないこと

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 1
Received array:  ["Unexpected token 'o', \"not-json{\" is not valid JSON"]
```

# Test source

```ts
  1  | import { test, expect } from './fixtures/test';
  2  | import { CheckoutPage } from './pages/CheckoutPage';
  3  | import { loginAndShowInventory } from './helpers/login';
  4  | import { SHIPPING_INFO } from './fixtures/users';
  5  | 
  6  | // 目的: ブラウザの保存（localStorage の `cart-contents`）を書き換えたときの、カート画面の扱いを記録する（#307。親 #97）。
  7  | // 期待値は、一般的な購入サイトの振る舞い（外部サイトで仕様書が無いため「不明」が基本。参考）。
  8  | // 読み取りの順（#307 の v6）: W1・W2・W4 は「load → カート一覧の枠（.cart_list）の表示を待つ → バッジの件数を数える」。
  9  | //   バッジの出現は待たない（直ってバッジが消えたとき、時間切れの失敗を「想定どおりの失敗」と取り違えないため）。
  10 | //   W3 は「load のみ → 待たずに読める値を確かめる」（画面が白くなり、待つ対象の要素が出ないため）。
  11 | test.describe('SauceDemo カートの書き換え（cart-contents）', () => {
  12 |   // 全ケース共通の前提 W0: ログインして、商品を 1 件カートに入れる（基準の値は [4]）
  13 |   test.beforeEach(async ({ page }) => {
  14 |     const { inventoryPage } = await loginAndShowInventory(page);
  15 |     await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
  16 |     await expect(inventoryPage.cartBadge).toHaveText('1');
  17 |   });
  18 | 
  19 |   test('W1: [既知の不具合] 存在しない商品 ID（99）に書き換えても、バッジの件数とカート一覧の件数が一致すること', async ({ page }) => {
  20 |     // 現象（2026-11-10 実測。3 ブラウザ × 5 回で 15/15）: バッジ 1・カート一覧 0 件（一致しない）。台帳: docs/known-site-issues.md #14
  21 |     test.fail(true, 'バッジ 1・カート一覧 0 件で、件数が一致しない（#307 / docs/known-site-issues.md）');
  22 |     const cart = new CheckoutPage(page);
  23 |     await cart.rewriteCartContents('[99]');
  24 |     await page.goto('/cart.html');
  25 |     await expect(cart.cartList).toBeVisible();
  26 | 
  27 |     expect(await cart.readBadgeCount()).toBe(await cart.cartItems.count());
  28 |   });
  29 | 
  30 |   test('W2: [既知の不具合] 小数の商品 ID（1.5）に書き換えても、バッジの件数とカート一覧の件数が一致すること', async ({ page }) => {
  31 |     // 現象（2026-11-10 実測。3 ブラウザ × 5 回で 15/15）: バッジ 1・カート一覧 0 件（一致しない）。台帳: docs/known-site-issues.md #15。#280 と関連
  32 |     test.fail(true, 'バッジ 1・カート一覧 0 件で、件数が一致しない（#307 / docs/known-site-issues.md）');
  33 |     const cart = new CheckoutPage(page);
  34 |     await cart.rewriteCartContents('[1.5]');
  35 |     await page.goto('/cart.html');
  36 |     await expect(cart.cartList).toBeVisible();
  37 | 
  38 |     expect(await cart.readBadgeCount()).toBe(await cart.cartItems.count());
  39 |   });
  40 | 
  41 |   test('W3 前提: 書き換える前は、カート画面の読み込みが完了し、商品が 1 件表示されること', async ({ page }) => {
  42 |     // 環境の故障（ブラウザの起動・ログイン・サイトの停止）を、次の W3（test.fail）が隠さないための確認
  43 |     const cart = new CheckoutPage(page);
  44 |     // 直リンクの /cart.html は、画面が出ても 404 を返す（2026-11-10 実測。作業・レビューで再現。#307 6768099888）。状態コードは確かめない
  45 |     await page.goto('/cart.html');
  46 | 
  47 |     await expect(cart.cartList).toBeVisible();
  48 |     await expect(cart.cartItems).toHaveCount(1);
  49 |   });
  50 | 
  51 |   test('W3: [既知の不具合] JSON でない値に書き換えても、画面が表示され、カートは空として扱われ、ページ上の例外が出ないこと', async ({ page }) => {
  52 |     // 現象（2026-11-10 実測。3 ブラウザ × 5 回で 15/15）: 画面が白く（本文 0 文字）、ページ上に JSON の parse エラーが出る。台帳: docs/known-site-issues.md #16
  53 |     // 待つのは load のみ（既定の goto）。Checkout ボタンなどは、画面が白いと出ないため待たない（時間切れで失敗しないようにする）
  54 |     test.fail(true, '白い画面（本文 0 文字）と、ページ上の JSON の parse エラー（#307 / docs/known-site-issues.md）');
  55 |     const cart = new CheckoutPage(page);
  56 |     const pageErrors: string[] = [];
  57 |     // 開く前に登録する（開いたあとだと取りこぼす）
  58 |     page.on('pageerror', (error) => pageErrors.push(error.message));
  59 |     await cart.rewriteCartContents('not-json{');
  60 |     await page.goto('/cart.html');
  61 | 
  62 |     // 3 つとも確かめる（どれか 1 つの失敗でも、期待値と違うことが分かる）
  63 |     expect.soft((await page.locator('body').innerText()).length, '画面が表示されること（本文が 0 文字ではない）').toBeGreaterThan(0);
> 64 |     expect.soft(pageErrors, 'ページ上の例外が出ないこと').toHaveLength(0);
     |                                              ^ Error: ページ上の例外が出ないこと
  65 |     await expect.soft(cart.cartItems, 'カートが空として扱われること').toHaveCount(0);
  66 |   });
  67 | 
  68 |   test('W4: 同じ商品 ID の重複（[4, 4]）は、2 行・バッジ 2・小計 $59.98 として、正しく扱われること', async ({ page }) => {
  69 |     const cart = new CheckoutPage(page);
  70 |     await cart.rewriteCartContents('[4,4]');
  71 |     await page.goto('/cart.html');
  72 |     await expect(cart.cartList).toBeVisible();
  73 | 
  74 |     await expect(cart.cartItems).toHaveCount(2);
  75 |     expect(await cart.readBadgeCount()).toBe(2);
  76 | 
  77 |     // 小計は、購入確認の画面（Continue のあと）に出る。購入の確定（Finish）は押さない
  78 |     await cart.checkoutButton.click();
  79 |     await cart.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
  80 |     await expect(cart.subtotalLabel).toContainText('$59.98');
  81 |   });
  82 | });
  83 | 
```