import { test, expect } from '@playwright/test';
import { CheckoutPage } from './pages/CheckoutPage';
import { loginAndShowInventory } from './helpers/login';
import { openSideMenu } from './helpers/side-menu';
import { TIMEOUTS } from './helpers/timeouts';

/**
 * サイドメニュー（左上のハンバーガーメニュー）とログアウトの機能のテスト（#57）。
 * 「メニューを開く」だけでなく、各リンクの遷移先・Reset App State（カートの初期化）・メニューを閉じる操作を確認する。
 * PC とスマホ（`mobile-chrome`）の両方で実行される。
 */

const sideMenuLinks = {
  allItems: '[data-test="inventory-sidebar-link"]',
  about: '[data-test="about-sidebar-link"]',
  logout: '[data-test="logout-sidebar-link"]',
  reset: '[data-test="reset-sidebar-link"]',
} as const;

test.describe('サイドメニューとログアウト', () => {
  test('メニューに、All Items / About / Logout / Reset App State のリンクが表示されること', async ({ page }) => {
    const { loginPage } = await loginAndShowInventory(page);
    await openSideMenu(loginPage);

    for (const selector of Object.values(sideMenuLinks)) {
      await expect(page.locator(selector)).toBeVisible();
    }
  });

  test('All Items: 別の画面（カート）から、商品一覧へ戻れること', async ({ page }) => {
    const { loginPage, inventoryPage } = await loginAndShowInventory(page);
    await inventoryPage.cartLink.click();
    await expect(new CheckoutPage(page).checkoutButton).toBeVisible();

    await openSideMenu(loginPage);
    await page.locator(sideMenuLinks.allItems).click();

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.title).toHaveText('Products');
  });

  test('About: 外部サイト（Sauce Labs）へ遷移すること', async ({ page }) => {
    // 外部サイトには実際には接続せず（遅い・変わる・テスト対象外のため）、遷移先だけを確認する
    await page.route('https://saucelabs.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Sauce Labs (mock)</title>' }));
    const { loginPage } = await loginAndShowInventory(page);
    await openSideMenu(loginPage);

    await expect(page.locator(sideMenuLinks.about)).toHaveAttribute('href', 'https://saucelabs.com/');
    await page.locator(sideMenuLinks.about).click();
    await expect(page).toHaveURL('https://saucelabs.com/');
  });

  test('Logout: ログイン画面に戻り、入力欄が空で、直接アクセスしても商品一覧が見られないこと', { tag: '@prd' }, async ({ page }) => {
    const { loginPage } = await loginAndShowInventory(page);
    await openSideMenu(loginPage);
    await page.locator(sideMenuLinks.logout).click();

    // ログイン画面に戻り、前のユーザー名が残っていない
    await expect(loginPage.loginButton).toBeVisible();
    await expect(page).toHaveURL('/');
    await expect(loginPage.usernameInput).toHaveValue('');
    await expect(loginPage.passwordInput).toHaveValue('');

    // ログアウト後は、商品一覧へ直接アクセスしてもログインを求められる
    await page.goto('/inventory.html');
    await expect(loginPage.errorMessage).toContainText('You can only access \'/inventory.html\' when you are logged in');
  });

  test('Reset App State: カートが空になること（バッジが消え、カートに商品が無い）', async ({ page }) => {
    const { loginPage, inventoryPage } = await loginAndShowInventory(page);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-bike-light');
    await expect(inventoryPage.cartBadge).toHaveText('2');

    await openSideMenu(loginPage);
    await page.locator(sideMenuLinks.reset).click();

    // Reset の後も、メニューは開いたまま（スマホでは画面を覆うため、閉じてから操作する）
    await page.locator('#react-burger-cross-btn').click();
    await expect(loginPage.sideMenu).toBeHidden();

    await expect(inventoryPage.cartBadge).toHaveCount(0);
    await inventoryPage.cartLink.click();
    await expect(new CheckoutPage(page).cartItems).toHaveCount(0);
  });

  // 💡 既知のサイト側の不具合: Reset App State の後も、商品の「Remove」ボタンが「Add to cart」に戻らない
  //    （ページを再読み込みすると戻る）。docs/known-site-issues.md 参照。
  //    test.fail() = 「失敗すること」を期待するテスト。サイトが直って成功すると、テストが失敗して気づける。
  test('[既知の不具合] Reset App State の後、商品のボタンが「Add to cart」に戻ること', async ({ page }) => {
    test.fail(true, 'Reset App State の後も、ボタンが「Remove」のまま（docs/known-site-issues.md）');
    const { loginPage, inventoryPage } = await loginAndShowInventory(page);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await expect(page.locator('[data-test="remove-sauce-labs-backpack"]')).toBeVisible();

    await openSideMenu(loginPage);
    await page.locator(sideMenuLinks.reset).click();

    await expect(page.locator('[data-test="add-to-cart-sauce-labs-backpack"]')).toBeVisible({ timeout: TIMEOUTS.SHORT });
  });

  test('メニューを閉じる: ×ボタンで閉じられること', async ({ page }) => {
    const { loginPage } = await loginAndShowInventory(page);
    await openSideMenu(loginPage);

    await page.locator('#react-burger-cross-btn').click();
    await expect(loginPage.sideMenu).toBeHidden();
  });

  test('メニューを閉じる: Esc キーで閉じられること', async ({ page }) => {
    const { loginPage } = await loginAndShowInventory(page);
    await openSideMenu(loginPage);

    await page.keyboard.press('Escape');
    await expect(loginPage.sideMenu).toBeHidden();
  });
});
