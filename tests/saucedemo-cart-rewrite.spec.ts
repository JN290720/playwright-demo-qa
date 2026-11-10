import { test, expect } from './fixtures/test';
import { CheckoutPage } from './pages/CheckoutPage';
import { loginAndShowInventory } from './helpers/login';
import { SHIPPING_INFO } from './fixtures/users';

// 目的: ブラウザの保存（localStorage の `cart-contents`）を書き換えたときの、カート画面の扱いを記録する（#307。親 #97）。
// 期待値は、一般的な購入サイトの振る舞い（外部サイトで仕様書が無いため「不明」が基本。参考）。
// 読み取りの順（#307 の v6）: W1・W2・W4 は「load → カート一覧の枠（.cart_list）の表示を待つ → バッジの件数を数える」。
//   バッジの出現は待たない（直ってバッジが消えたとき、時間切れの失敗を「想定どおりの失敗」と取り違えないため）。
//   W3 は「load のみ → 待たずに読める値を確かめる」（画面が白くなり、待つ対象の要素が出ないため）。
test.describe('SauceDemo カートの書き換え（cart-contents）', () => {
  // 全ケース共通の前提 W0: ログインして、商品を 1 件カートに入れる（基準の値は [4]）
  test.beforeEach(async ({ page }) => {
    const { inventoryPage } = await loginAndShowInventory(page);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });

  test('W1: [既知の不具合] 存在しない商品 ID（99）に書き換えても、バッジの件数とカート一覧の件数が一致すること', async ({ page }) => {
    // 現象（2026-11-10 実測。3 ブラウザ × 5 回で 15/15）: バッジ 1・カート一覧 0 件（一致しない）。台帳: docs/known-site-issues.md #14
    test.fail(true, 'バッジ 1・カート一覧 0 件で、件数が一致しない（#307 / docs/known-site-issues.md）');
    const cart = new CheckoutPage(page);
    await cart.rewriteCartContents('[99]');
    await page.goto('/cart.html');
    await expect(cart.cartList).toBeVisible();

    expect(await cart.readBadgeCount()).toBe(await cart.cartItems.count());
  });

  test('W2: [既知の不具合] 小数の商品 ID（1.5）に書き換えても、バッジの件数とカート一覧の件数が一致すること', async ({ page }) => {
    // 現象（2026-11-10 実測。3 ブラウザ × 5 回で 15/15）: バッジ 1・カート一覧 0 件（一致しない）。台帳: docs/known-site-issues.md #15。#280 と関連
    test.fail(true, 'バッジ 1・カート一覧 0 件で、件数が一致しない（#307 / docs/known-site-issues.md）');
    const cart = new CheckoutPage(page);
    await cart.rewriteCartContents('[1.5]');
    await page.goto('/cart.html');
    await expect(cart.cartList).toBeVisible();

    expect(await cart.readBadgeCount()).toBe(await cart.cartItems.count());
  });

  test('W3 前提: 書き換える前は、カート画面の読み込みが完了し、商品が 1 件表示されること', async ({ page }) => {
    // 環境の故障（ブラウザの起動・ログイン・サイトの停止）を、次の W3（test.fail）が隠さないための確認
    const cart = new CheckoutPage(page);
    // 応答の HTTP ステータスは確かめない（実測で、/cart.html の直リンクは、画面が表示されても 404 を返す。#307 に報告）
    await page.goto('/cart.html');

    await expect(cart.cartList).toBeVisible();
    await expect(cart.cartItems).toHaveCount(1);
  });

  test('W3: [既知の不具合] JSON でない値に書き換えても、画面が表示され、カートは空として扱われ、ページ上の例外が出ないこと', async ({ page }) => {
    // 現象（2026-11-10 実測。3 ブラウザ × 5 回で 15/15）: 画面が白く（本文 0 文字）、ページ上に JSON の parse エラーが出る。台帳: docs/known-site-issues.md #16
    // 待つのは load のみ（既定の goto）。Checkout ボタンなどは、画面が白いと出ないため待たない（時間切れで失敗しないようにする）
    test.fail(true, '白い画面（本文 0 文字）と、ページ上の JSON の parse エラー（#307 / docs/known-site-issues.md）');
    const cart = new CheckoutPage(page);
    const pageErrors: string[] = [];
    // 開く前に登録する（開いたあとだと取りこぼす）
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await cart.rewriteCartContents('not-json{');
    await page.goto('/cart.html');

    // 3 つとも確かめる（どれか 1 つの失敗でも、期待値と違うことが分かる）
    expect.soft((await page.locator('body').innerText()).length, '画面が表示されること（本文が 0 文字ではない）').toBeGreaterThan(0);
    expect.soft(pageErrors, 'ページ上の例外が出ないこと').toHaveLength(0);
    await expect.soft(cart.cartItems, 'カートが空として扱われること').toHaveCount(0);
  });

  test('W4: 同じ商品 ID の重複（[4, 4]）は、2 行・バッジ 2・小計 $59.98 として、正しく扱われること', async ({ page }) => {
    const cart = new CheckoutPage(page);
    await cart.rewriteCartContents('[4,4]');
    await page.goto('/cart.html');
    await expect(cart.cartList).toBeVisible();

    await expect(cart.cartItems).toHaveCount(2);
    expect(await cart.readBadgeCount()).toBe(2);

    // 小計は、購入確認の画面（Continue のあと）に出る。購入の確定（Finish）は押さない
    await cart.checkoutButton.click();
    await cart.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
    await expect(cart.subtotalLabel).toContainText('$59.98');
  });
});
