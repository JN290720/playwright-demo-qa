import { test, expect } from './fixtures/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CREDENTIALS, SHIPPING_INFO } from './fixtures/users';
import { goBackUntilUrl } from './helpers/navigation';

test.describe('SauceDemo 購入完了後の状態（戻る操作）', () => {
  test('購入完了後にブラウザの「戻る」で一覧まで戻っても、カートが空のままであること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const checkoutPage = new CheckoutPage(page);

    // 1. ログイン → 商品を 1 件カートへ → 購入を完了する
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await inventoryPage.cartLink.click();
    await checkoutPage.checkoutButton.click();
    await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
    await checkoutPage.finishButton.click();
    await expect(checkoutPage.completeHeader).toBeVisible();

    // 2. 一覧に戻るまで「戻る」を押す（一覧 → カート → 購入入力 → 購入確認 → 購入完了、と進んだので 4 回。回数は直書きしない）
    await goBackUntilUrl(page, /\/inventory\.html/);

    // 3. 【検証】カートのバッジが出ていない（0 件）
    await expect(inventoryPage.cartBadge).toHaveCount(0);

    // 4. 【検証】一覧の商品のボタンが、すべて「Add to cart」（「Remove」が 1 つも残っていない）
    await expect(inventoryPage.productItems.first()).toBeVisible();
    await expect(inventoryPage.itemButtons.filter({ hasNotText: 'Add to cart' })).toHaveCount(0);
  });
});
