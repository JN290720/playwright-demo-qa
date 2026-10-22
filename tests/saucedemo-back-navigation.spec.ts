import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CREDENTIALS, SHIPPING_INFO } from './fixtures/users';

// 「戻る」系の画面遷移（ケース案 v3 の ①②。#120 の観点の抜けを埋める）
// 💡 見出し（「Checkout: Complete!」→「Products」）と、並び順（戻ると初期値に戻る）は、仕様かどうか不明のため固定しない

test.describe('SauceDemo 戻る系の画面遷移', () => {

  // -------------------------------------------------------------
  // B1: 購入完了画面の「Back Home」で、商品一覧に戻ること
  // -------------------------------------------------------------
  test('B1: 購入完了画面の「Back Home」で、商品一覧（inventory.html）に戻り、カートが空でログイン状態が保たれること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const checkoutPage = new CheckoutPage(page);

    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await inventoryPage.cartLink.click();
    await checkoutPage.checkoutButton.click();
    await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
    await checkoutPage.finishButton.click();
    await expect(checkoutPage.completeHeader).toBeVisible();

    await checkoutPage.backHomeButton.click();

    // 検証: 一覧に戻る（URL）・一覧の 6 件が表示される・カートのバッジが無い・ログイン状態（ログイン画面の要素が無い）
    await expect(page).toHaveURL(/\/inventory\.html$/);
    await expect(inventoryPage.productItems).toHaveCount(6);
    await expect(inventoryPage.cartBadge).toHaveCount(0);
    await expect(loginPage.loginButton).toHaveCount(0);
  });

  // -------------------------------------------------------------
  // B2: 一覧 → 詳細 → ブラウザの「戻る」で、一覧に戻り、カートの状態が保たれること
  // -------------------------------------------------------------
  test('B2: 一覧から詳細を開き、ブラウザの「戻る」で一覧（inventory.html）に戻り、カートのバッジが保たれること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const detailPage = new ProductDetailPage(page);

    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await expect(inventoryPage.cartBadge).toHaveText('1');
    await inventoryPage.selectSortOption('hilo');
    await inventoryPage.itemNames.first().click();
    await expect(detailPage.container).toBeVisible();

    await page.goBack();

    // 検証: 一覧に戻る（URL）・カートのバッジが 1 のまま・一覧の 6 件が表示される
    await expect(page).toHaveURL(/\/inventory\.html$/);
    await expect(inventoryPage.cartBadge).toHaveText('1');
    await expect(inventoryPage.productItems).toHaveCount(6);
  });
});
