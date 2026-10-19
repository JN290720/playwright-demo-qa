import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CREDENTIALS, SHIPPING_INFO } from './fixtures/users';

test.describe('SauceDemo 正常系 E2E（購入フロー）', () => {
  test('ログイン → 商品をカートへ追加 → 購入情報入力 → 金額確認 → 注文完了まで行えること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const checkoutPage = new CheckoutPage(page);

    // 1. ログイン
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await expect(inventoryPage.title).toHaveText('Products');

    // 2. 商品を 2 件カートへ追加し、バッジの件数を確認
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-bike-light');
    await expect(inventoryPage.cartBadge).toHaveText('2');

    // 3. カートを開き、追加した 2 件が入っていることを確認
    await inventoryPage.cartLink.click();
    await expect(checkoutPage.cartItems).toHaveCount(2);

    // 4. チェックアウトへ進み、購入者情報を入力
    await checkoutPage.checkoutButton.click();
    await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);

    // 5. 購入確認画面で、小計・税・合計が整合していることを検証
    //    （商品価格は動的に合算し、値の直書きによる壊れやすさを避ける）
    await expect(checkoutPage.finishButton).toBeVisible();
    const itemPrices = (await checkoutPage.summaryItemPrices.allTextContents()).map(CheckoutPage.parseAmount);
    expect(itemPrices).toHaveLength(2);
    const expectedSubtotal = itemPrices.reduce((sum, price) => sum + price, 0);

    const subtotal = CheckoutPage.parseAmount(await checkoutPage.subtotalLabel.innerText());
    const tax = CheckoutPage.parseAmount(await checkoutPage.taxLabel.innerText());
    const total = CheckoutPage.parseAmount(await checkoutPage.totalLabel.innerText());

    expect(subtotal).toBeCloseTo(expectedSubtotal, 2); // 小計 = 各商品価格の合計
    expect(tax).toBeCloseTo(subtotal * 0.08, 1);       // 税 ≒ 小計の 8%（四捨五入の誤差を許容）
    expect(total).toBeCloseTo(subtotal + tax, 2);      // 合計 = 小計 + 税

    // 6. 注文を確定し、完了メッセージを確認
    await checkoutPage.finishButton.click();
    await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');

    // 7. 注文完了後はカートが空になる（バッジが消える）
    await expect(inventoryPage.cartBadge).toHaveCount(0);
  });
});
