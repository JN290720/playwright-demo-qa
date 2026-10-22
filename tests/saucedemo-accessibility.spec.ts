import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CREDENTIALS, SHIPPING_INFO } from './fixtures/users';
import { expectNoA11yViolations } from './helpers/a11y';
import { TIMEOUTS } from './helpers/timeouts';

/**
 * アクセシビリティ（a11y = 障害のある人や高齢の人でも使えるか）のテスト。
 * - 自動検査（axe）: WCAG 2.1 Level A / AA の違反が 0 件であること
 * - キーボード操作: マウスを使わず、キーボードだけで操作できること（視覚障害・運動障害のある人の利用を想定）
 * 除外しているルールは docs/a11y-known-issues.md に理由を書いている。
 */
test.describe('SauceDemo Accessibility (a11y) Tests', () => {

  // 1. ログインページ（公開ページ）
  test('P1: ログインページが WCAG 2.1 Level A & AA 基準を満たしていること', async ({ page }, testInfo) => {
    await new LoginPage(page).goto();
    await expectNoA11yViolations(page, testInfo);
  });

  // 💡 ログイン後ページのテスト群
  test.describe('ログイン後の全主要ページ監査', () => {

    // 各テスト前にログインを実行
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAs(CREDENTIALS.standard);
      await expect(new InventoryPage(page).title).toBeVisible();
    });

    // 2. 商品一覧ページ (Inventory)
    test('P2: 商品一覧ページが WCAG 基準を満たしていること', async ({ page }, testInfo) => {
      // （以前は、並び替えのドロップダウンのラベル欠落（select-name）を除外していたが、サイトで修正されたため除外を外した。2026-10-20）
      await expectNoA11yViolations(page, testInfo);
    });

    // 3. 商品詳細ページ (Inventory Item)
    test('P3: 商品詳細ページが WCAG 基準を満たしていること', async ({ page }, testInfo) => {
      // 最初の商品のタイトルをクリックして詳細画面へ移動
      await page.locator('.inventory_item_name').first().click();
      await page.locator('[data-test="back-to-products"]').waitFor({ state: 'visible' });
      await expectNoA11yViolations(page, testInfo);
    });

    // 4. ショッピングカートページ (Cart)・空のカート
    test('P4: カート画面（空）が WCAG 基準を満たしていること', async ({ page }, testInfo) => {
      await new InventoryPage(page).cartLink.click();
      await new CheckoutPage(page).checkoutButton.waitFor({ state: 'visible' });
      await expectNoA11yViolations(page, testInfo);
    });

    // 4b. 商品が入ったカート（実際の購入前に見る画面）
    test('P4b: カート画面（商品あり）が WCAG 基準を満たしていること', async ({ page }, testInfo) => {
      const inventoryPage = new InventoryPage(page);
      await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
      await inventoryPage.cartLink.click();
      await expect(new CheckoutPage(page).cartItems).toHaveCount(1);
      await expectNoA11yViolations(page, testInfo);
    });

    // 5. 購入手続き情報入力画面 (Checkout Step One)
    test('P5: 購入手続き入力画面が WCAG 基準を満たしていること', async ({ page }, testInfo) => {
      await new InventoryPage(page).cartLink.click();
      const checkoutPage = new CheckoutPage(page);
      await checkoutPage.checkoutButton.click();
      await checkoutPage.firstNameInput.waitFor({ state: 'visible' });
      await expectNoA11yViolations(page, testInfo);
    });

    // 5b. 購入手続きの入力エラー表示（エラーが画面に出ているときの状態）
    test('P5b: 購入手続きの入力エラー表示が WCAG 基準を満たしていること', async ({ page }, testInfo) => {
      await new InventoryPage(page).cartLink.click();
      const checkoutPage = new CheckoutPage(page);
      await checkoutPage.checkoutButton.click();
      await checkoutPage.continueButton.click(); // 何も入力せずに進む → エラーが表示される
      await expect(page.locator('[data-test="error"]')).toBeVisible();
      await expectNoA11yViolations(page, testInfo);
    });

    // 6. 購入確認画面 (Checkout Step Two)
    test('P6: 購入確認画面が WCAG 基準を満たしていること', async ({ page }, testInfo) => {
      await new InventoryPage(page).cartLink.click();
      const checkoutPage = new CheckoutPage(page);
      await checkoutPage.checkoutButton.click();
      await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
      await checkoutPage.finishButton.waitFor({ state: 'visible' });
      await expectNoA11yViolations(page, testInfo);
    });

    // 7. 購入完了画面
    test('P7: 購入完了画面が WCAG 基準を満たしていること', async ({ page }, testInfo) => {
      await new InventoryPage(page).cartLink.click();
      const checkoutPage = new CheckoutPage(page);
      await checkoutPage.checkoutButton.click();
      await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
      await checkoutPage.finishButton.click();
      await expect(checkoutPage.completeHeader).toBeVisible();
      await expectNoA11yViolations(page, testInfo);
    });

    // 8. サイドメニューを開いた状態
    test('P8: サイドメニュー展開時が WCAG 基準を満たしていること', async ({ page }, testInfo) => {
      const loginPage = new LoginPage(page);
      await loginPage.openSideMenu();
      await expect(loginPage.sideMenu).toBeVisible();
      await expectNoA11yViolations(page, testInfo);
    });

  });

  // 💡 既知のサイト側の不備: サイドメニューの「Reset App State」にマウスを乗せると、文字色（#3ddc91）のコントラストが 1.77:1 で、
  //    基準の 4.5:1 を満たさない（WCAG 1.4.3）。docs/a11y-known-issues.md、Issue #113 参照。
  //    test.fail() = 「失敗すること」を期待するテスト。サイトが直って成功すると、テストが失敗して気づける。
  test('P8b: [既知の不備] サイドメニューのリンクにマウスを乗せたときも、WCAG 基準を満たしていること', async ({ page }, testInfo) => {
    test.fail(true, 'Reset App State のホバー時の文字色のコントラストが不足（docs/a11y-known-issues.md）');
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await expect(new InventoryPage(page).title).toBeVisible();
    await loginPage.openSideMenu();
    await expect.poll(async () => (await loginPage.sideMenu.boundingBox())?.x).toBe(0);
    await page.locator('[data-test="reset-sidebar-link"]').hover();
    await expectNoA11yViolations(page, testInfo);
  });

  // ---------------------------------------------------------------------------
  // エラー表示（ログイン失敗）
  // ---------------------------------------------------------------------------
  test('P9: ログイン失敗のエラー表示が WCAG 基準を満たしていること', async ({ page }, testInfo) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.invalid);
    await expect(loginPage.errorMessage).toBeVisible();
    await expectNoA11yViolations(page, testInfo);
  });

  // ---------------------------------------------------------------------------
  // キーボード操作
  // ---------------------------------------------------------------------------
  test.describe('キーボード操作', () => {

    test('K1: ログイン画面で、Tab キーで「ユーザー名 → パスワード → ログイン」の順に移動し、Enter で送信できること', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      // ページの表示が終わる前に Tab を押すと、フォーカスの移動が取りこぼされて不安定になる（週次の全テストで 1 回失敗した）
      await expect(loginPage.loginButton).toBeVisible();

      await page.keyboard.press('Tab');
      await expect(loginPage.usernameInput).toBeFocused();
      await page.keyboard.type(CREDENTIALS.standard.username);

      await page.keyboard.press('Tab');
      await expect(loginPage.passwordInput).toBeFocused();
      await page.keyboard.type(CREDENTIALS.standard.password);

      await page.keyboard.press('Tab');
      await expect(loginPage.loginButton).toBeFocused();

      await page.keyboard.press('Enter');
      await expect(new InventoryPage(page).title).toHaveText('Products');
    });

    test('K2: ログイン画面で、パスワード入力欄で Enter を押すと送信できること', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.usernameInput.fill(CREDENTIALS.standard.username);
      await loginPage.passwordInput.fill(CREDENTIALS.standard.password);
      await loginPage.passwordInput.press('Enter');
      await expect(new InventoryPage(page).title).toHaveText('Products');
    });

    test('K3: サイドメニューを、キーボード（Enter）だけで開いて閉じられること', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAs(CREDENTIALS.standard);
      await expect(new InventoryPage(page).title).toBeVisible();

      await loginPage.menuButton.focus();
      await page.keyboard.press('Enter');
      await expect(loginPage.sideMenu).toBeVisible();

      // メニュー内の「閉じる」ボタンへフォーカスして Enter で閉じる
      // メニューが開くアニメーション（左からスライド）が終わるのを待つ。途中で操作すると、フォーカスや Enter が取りこぼされる
      await expect.poll(async () => (await loginPage.sideMenu.boundingBox())?.x).toBe(0);
      const closeButton = page.locator('#react-burger-cross-btn');
      await closeButton.focus();
      await expect(closeButton).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(loginPage.sideMenu).toBeHidden();
    });

    // 💡 既知のサイト側の不備: カートのリンクは href の無い要素（role="button"）で、フォーカスできず、Tab の移動順にも入らず、Enter / Space でも開かない。
    //    （キーボードだけでは、カートを開けない = WCAG 2.1.1「キーボード」の違反）。docs/a11y-known-issues.md、Issue #111 参照。
    //    test.fail() = 「失敗すること」を期待するテスト。サイトが直って成功すると、このテストが失敗して、気づける。
    test('K3b: [既知の不備] カートのリンクを、キーボード（Tab → Enter）で開けること', async ({ page }) => {
      test.fail(true, 'SauceDemo のカートのリンクが、キーボードで操作できない（docs/a11y-known-issues.md）');
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAs(CREDENTIALS.standard);
      const inventoryPage = new InventoryPage(page);
      await expect(inventoryPage.title).toBeVisible();

      // フォーカスできること（今は、focus() を呼んでもフォーカスされない）
      await inventoryPage.cartLink.focus();
      await expect(inventoryPage.cartLink).toBeFocused({ timeout: TIMEOUTS.FOCUS });
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/cart\.html/);
    });

    test('K4: 購入フロー（カートを開く操作を除く）を、キーボードだけで完走できること', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const inventoryPage = new InventoryPage(page);
      const checkoutPage = new CheckoutPage(page);

      await loginPage.goto();
      await loginPage.usernameInput.fill(CREDENTIALS.standard.username);
      await loginPage.passwordInput.fill(CREDENTIALS.standard.password);
      await loginPage.passwordInput.press('Enter');
      await expect(inventoryPage.title).toBeVisible();

      // フォーカスして Enter（マウスのクリックの代わり）
      const addButton = page.locator('[data-test="add-to-cart-sauce-labs-backpack"]');
      await addButton.focus();
      await page.keyboard.press('Enter');
      await expect(inventoryPage.cartBadge).toHaveText('1');

      // カートのリンクは、キーボードで開けない（既知の不備。K3b）ため、ここだけマウスで開く
      await inventoryPage.cartLink.click();
      await expect(checkoutPage.checkoutButton).toBeVisible();
      await checkoutPage.checkoutButton.focus();
      await page.keyboard.press('Enter');

      await checkoutPage.firstNameInput.fill(SHIPPING_INFO.firstName);
      await checkoutPage.lastNameInput.fill(SHIPPING_INFO.lastName);
      await checkoutPage.postalCodeInput.fill(SHIPPING_INFO.postalCode);
      // 「Continue」ボタンへ移動して Enter（入力欄で Enter を押すと、Continue ではなく「Cancel」が実行され、カートに戻ってしまう。docs/a11y-known-issues.md、Issue #112 参照）
      await checkoutPage.continueButton.focus();
      await page.keyboard.press('Enter');
      await expect(checkoutPage.finishButton).toBeVisible();
      await checkoutPage.finishButton.focus();
      await page.keyboard.press('Enter');

      await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
    });

  });
});
