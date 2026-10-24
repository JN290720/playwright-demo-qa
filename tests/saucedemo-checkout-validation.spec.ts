import { test, expect, Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CREDENTIALS, SHIPPING_INFO } from './fixtures/users';

// 購入手続きの入力検証と、保護されたページへの未認証アクセス（認可）の検証（#55）

/** ログインして、商品を 1 件カートに入れ、購入手続き入力画面まで進める */
async function goToCheckoutStepOne(page: Page) {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  const checkoutPage = new CheckoutPage(page);
  await loginPage.goto();
  await loginPage.loginAs(CREDENTIALS.standard);
  await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
  await inventoryPage.cartLink.click();
  await checkoutPage.checkoutButton.click();
  await expect(page).toHaveURL(/checkout-step-one\.html/);
}

test.describe('SauceDemo 購入手続き入力の異常系（項目ごとの欠落）', () => {
  // 入力欄の検証は、First Name → Last Name → Postal Code の順に行われる
  const cases = [
    { label: 'First Name が未入力', first: '', last: SHIPPING_INFO.lastName, zip: SHIPPING_INFO.postalCode, message: 'First Name is required' },
    { label: 'Last Name が未入力', first: SHIPPING_INFO.firstName, last: '', zip: SHIPPING_INFO.postalCode, message: 'Last Name is required' },
    { label: 'Postal Code が未入力', first: SHIPPING_INFO.firstName, last: SHIPPING_INFO.lastName, zip: '', message: 'Postal Code is required' },
  ];

  for (const { label, first, last, zip, message } of cases) {
    test(`${label}の場合、「${message}」が表示され、次の画面へ進めないこと`, async ({ page }) => {
      const checkoutPage = new CheckoutPage(page);
      await goToCheckoutStepOne(page);

      await checkoutPage.fillShippingInfo(first, last, zip);

      await expect(checkoutPage.errorMessage).toContainText(message);
      await expect(page).toHaveURL(/checkout-step-one\.html/); // 確認画面へは進まない
    });
  }

  test('入力欄に日本語（全角）の氏名・郵便番号を入れても、確認画面へ進めること', async ({ page }) => {
    const checkoutPage = new CheckoutPage(page);
    await goToCheckoutStepOne(page);

    await checkoutPage.fillShippingInfo('太郎', '山田', '１００－０００１');

    await expect(page).toHaveURL(/checkout-step-two\.html/);
  });
});
