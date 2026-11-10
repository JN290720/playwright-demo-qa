import { test, expect } from './fixtures/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CREDENTIALS, SHIPPING_INFO } from './fixtures/users';

test.describe('SauceDemo 購入手続きの途中の再読み込み', () => {
  test('R1: 購入の途中で再読み込みしても、購入者情報は空に戻り、購入確認・購入完了の表示は変わらないこと（現状の記録）', async ({ page }) => {
    // 目的: 購入の途中で再読み込みしたときの現状の挙動を記録する（#300 の決定「現状の挙動を正」）。
    // 期待値は実測（#303 6677013649）の値。「購入者情報が空に戻る」が仕様かどうかの判断は、このテストではしない。
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const checkoutPage = new CheckoutPage(page);

    await test.step('1. ログイン → 商品を 1 件カートへ → 「Checkout」で購入者情報の画面へ進む', async () => {
      await loginPage.goto();
      await loginPage.loginAs(CREDENTIALS.standard);
      await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
      await inventoryPage.cartLink.click();
      await checkoutPage.checkoutButton.click();
      await expect(page).toHaveURL(/checkout-step-one\.html/);
    });

    await test.step('2. 名・姓・郵便番号を入力し、「Continue」を押さずに再読み込みする → 入力値は空に戻る', async () => {
      await checkoutPage.firstNameInput.fill(SHIPPING_INFO.firstName);
      await checkoutPage.lastNameInput.fill(SHIPPING_INFO.lastName);
      await checkoutPage.postalCodeInput.fill(SHIPPING_INFO.postalCode);

      await page.reload();

      // 【検証】3 項目とも空。URL は購入者情報の画面のまま
      await expect(checkoutPage.firstNameInput).toHaveValue('');
      await expect(checkoutPage.lastNameInput).toHaveValue('');
      await expect(checkoutPage.postalCodeInput).toHaveValue('');
      await expect(page).toHaveURL(/checkout-step-one\.html/);
    });

    await test.step('3. 入力し直して「Continue」→ 購入確認の画面で再読み込みする → 表示は変わらない', async () => {
      await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
      await expect(page).toHaveURL(/checkout-step-two\.html/);
      await expect(checkoutPage.subtotalLabel).toBeVisible();

      // 再読み込みの前に、表示を控える
      const before = {
        items: await checkoutPage.cartItems.count(),
        subtotal: await checkoutPage.subtotalLabel.textContent(),
        tax: await checkoutPage.taxLabel.textContent(),
        total: await checkoutPage.totalLabel.textContent(),
      };

      await page.reload();

      // 【検証】商品 1 件・小計 $29.99・税 $2.40・合計 $32.39（再読み込みの前と同じ）。URL は購入確認の画面
      await expect(page).toHaveURL(/checkout-step-two\.html/);
      await expect(checkoutPage.cartItems).toHaveCount(before.items);
      await expect(checkoutPage.subtotalLabel).toHaveText(before.subtotal ?? '');
      await expect(checkoutPage.taxLabel).toHaveText(before.tax ?? '');
      await expect(checkoutPage.totalLabel).toHaveText(before.total ?? '');
      await expect(checkoutPage.subtotalLabel).toContainText('$29.99');
      await expect(checkoutPage.taxLabel).toContainText('$2.40');
      await expect(checkoutPage.totalLabel).toContainText('$32.39');
    });

    await test.step('4. 「Finish」→ 購入完了の画面で再読み込みする → 完了の表示が出たままで、カートは空', async () => {
      await checkoutPage.finishButton.click();
      await expect(checkoutPage.completeHeader).toBeVisible();

      await page.reload();

      // 【検証】完了メッセージが出たまま。カートのバッジが無い
      await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
      await expect(page).toHaveURL(/checkout-complete\.html/);
      await expect(inventoryPage.cartBadge).toHaveCount(0);
    });
  });
});
