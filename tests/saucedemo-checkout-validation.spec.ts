import { test, expect, Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';

// 購入手続きの入力検証と、保護されたページへの未認証アクセス（認可）の検証（#55）

// ユーザー判断（#55）: このテストは stg 環境のフル検証に含め、prd（Post-Deploy）では実行しない
test.beforeEach(async ({}, testInfo) => {
  if (process.env.ENV_NAME !== 'staging') {
    testInfo.skip(true, 'このテストは Staging 環境限定です');
  }
});

/** ログインして、商品を 1 件カートに入れ、購入手続き入力画面まで進める */
async function goToCheckoutStepOne(page: Page) {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  await loginPage.goto();
  await loginPage.login('standard_user', 'secret_sauce');
  await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
  await inventoryPage.cartLink.click();
  await page.locator('[data-test="checkout"]').click();
  await expect(page).toHaveURL(/checkout-step-one\.html/);
}

test.describe('SauceDemo 購入手続き入力の異常系（項目ごとの欠落）', () => {
  // 入力欄の検証は、First Name → Last Name → Postal Code の順に行われる
  const cases = [
    { label: 'First Name が未入力', first: '', last: 'Yamada', zip: '100-0001', message: 'First Name is required' },
    { label: 'Last Name が未入力', first: 'Taro', last: '', zip: '100-0001', message: 'Last Name is required' },
    { label: 'Postal Code が未入力', first: 'Taro', last: 'Yamada', zip: '', message: 'Postal Code is required' },
  ];

  for (const { label, first, last, zip, message } of cases) {
    test(`${label}の場合、「${message}」が表示され、次の画面へ進めないこと`, async ({ page }) => {
      await goToCheckoutStepOne(page);

      await page.locator('[data-test="firstName"]').fill(first);
      await page.locator('[data-test="lastName"]').fill(last);
      await page.locator('[data-test="postalCode"]').fill(zip);
      await page.locator('[data-test="continue"]').click();

      await expect(page.locator('[data-test="error"]')).toContainText(message);
      await expect(page).toHaveURL(/checkout-step-one\.html/); // 確認画面へは進まない
    });
  }

  test('入力欄に日本語（全角）の氏名・郵便番号を入れても、確認画面へ進めること', async ({ page }) => {
    await goToCheckoutStepOne(page);

    await page.locator('[data-test="firstName"]').fill('太郎');
    await page.locator('[data-test="lastName"]').fill('山田');
    await page.locator('[data-test="postalCode"]').fill('１００－０００１');
    await page.locator('[data-test="continue"]').click();

    await expect(page).toHaveURL(/checkout-step-two\.html/);
  });
});

test.describe('SauceDemo 保護されたページへの未認証アクセス（認可）', () => {
  // 未ログインで直接アクセスすると、ログイン画面へ戻され、エラー文言が表示される
  const protectedPaths = [
    'inventory.html',
    'inventory-item.html?id=4',
    'cart.html',
    'checkout-step-one.html',
    'checkout-step-two.html',
    'checkout-complete.html',
  ];

  for (const path of protectedPaths) {
    test(`未ログインで /${path} に直接アクセスすると、ログイン画面へ戻されること`, async ({ page }) => {
      await page.goto(`https://www.saucedemo.com/${path}`);

      const loginPage = new LoginPage(page);
      await expect(page).toHaveURL('https://www.saucedemo.com/');
      await expect(loginPage.errorMessage).toContainText('when you are logged in');
    });
  }

  test('ログアウトしたあと、カートや購入手続きのページに直接アクセスしても、保護されていること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
    await page.locator('#react-burger-menu-btn').click();
    await page.locator('#logout_sidebar_link').click();
    await expect(page).toHaveURL('https://www.saucedemo.com/');

    for (const path of ['cart.html', 'checkout-step-one.html']) {
      await page.goto(`https://www.saucedemo.com/${path}`);
      await expect(page).toHaveURL('https://www.saucedemo.com/');
      await expect(loginPage.errorMessage).toContainText('when you are logged in');
    }
  });
});
