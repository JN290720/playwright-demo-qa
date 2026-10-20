import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CREDENTIALS, SHIPPING_INFO } from './fixtures/users';
import { openSideMenu } from './helpers/side-menu';

/**
 * カートと購入手続きの、途中でやめる・戻る・開き直すといった操作のテスト（#132）。
 *
 * 【目的】購入は、お金に直結する最重要の導線。途中でやめる（Cancel）・ページを開き直す・空のカートで進むなど、
 *   利用者が普通に行う操作で、カートの中身や画面遷移が、意図どおりに扱われるかを確認する。
 * Cancel = 購入手続きの途中で、前の画面に戻るボタン。保持 = 画面を開き直しても、カートの中身が残ること。
 */
async function loginAndAddBackpack(page: Page) {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  await loginPage.goto();
  await loginPage.loginAs(CREDENTIALS.standard);
  await expect(inventoryPage.title).toHaveText('Products');
  await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
  await expect(inventoryPage.cartBadge).toHaveText('1');
  return { inventoryPage };
}

test.describe('カート・購入手続きの異常系・やり直し', () => {
  // 💡 既知のサイト側の不備（Issue #140）: 空のカートで「Checkout」を押すと、エラーなしで、購入者情報の入力画面に進める。
  //    期待値は不明（一般には、空のカートでは進めない）。docs/known-site-issues.md 参照。
  //    test.fail() = 「失敗すること」を期待するテスト。サイトが直って成功すると、テストが失敗して気づける。
  test('C1: [既知の不具合] 空のカートでは、「Checkout」で購入者情報の入力画面に進めないこと', async ({ page }) => {
    test.fail(true, '空のカートで Checkout を押すと、入力画面に進める（#140 / docs/known-site-issues.md）');
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await expect(inventoryPage.title).toHaveText('Products');
    await inventoryPage.cartLink.click();
    const checkoutPage = new CheckoutPage(page);
    await expect(checkoutPage.cartItems).toHaveCount(0);

    await checkoutPage.checkoutButton.click();

    await expect(page).not.toHaveURL(/checkout-step-one/, { timeout: 3_000 });
  });

  test('C2: 購入手続き（入力画面）で「Cancel」を押すと、カートに戻り、カートの中身が保たれること', async ({ page }) => {
    const { inventoryPage } = await loginAndAddBackpack(page);
    const checkoutPage = new CheckoutPage(page);
    await inventoryPage.cartLink.click();
    await checkoutPage.checkoutButton.click();
    await expect(checkoutPage.firstNameInput).toBeVisible();

    await page.locator('[data-test="cancel"]').click();

    await expect(page).toHaveURL(/cart\.html/);
    await expect(checkoutPage.cartItems).toHaveCount(1);
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });

  test('C3: 購入確認画面で「Cancel」を押すと、商品一覧に戻ること', async ({ page }) => {
    const { inventoryPage } = await loginAndAddBackpack(page);
    const checkoutPage = new CheckoutPage(page);
    await inventoryPage.cartLink.click();
    await checkoutPage.checkoutButton.click();
    await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
    await expect(checkoutPage.finishButton).toBeVisible();

    await page.locator('[data-test="cancel"]').click();

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.title).toHaveText('Products');
  });

  test('C4: ページを再読み込みしても、カートの中身（バッジと「Remove」の表示）が保たれること', async ({ page }) => {
    const { inventoryPage } = await loginAndAddBackpack(page);

    await page.reload();

    await expect(inventoryPage.title).toHaveText('Products');
    await expect(inventoryPage.cartBadge).toHaveText('1');
    await expect(page.locator('[data-test="remove-sauce-labs-backpack"]')).toBeVisible();
  });

  test('C6: 「Add to cart」を素早く 2 回押しても、カートのバッジと商品のボタンの表示が食い違わないこと', async ({ page }) => {
    // 実測: 2 回目の押下は、追加された直後の同じボタン（「Remove」に変わっている）を押すため、追加が取り消される。
    // 「何件になるか」ではなく、「バッジの件数と、「Remove」の表示が、一致している（カートが壊れない）」ことを確認する
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await expect(inventoryPage.title).toHaveText('Products');

    await page.locator('[data-test="add-to-cart-sauce-labs-bike-light"]').dblclick();

    const removeButtons = page.locator('[data-test^="remove-"]');
    await expect(async () => {
      const removed = await removeButtons.count();
      await expect(inventoryPage.cartBadge).toHaveCount(Math.min(removed, 1));
    }).toPass({ timeout: 5_000 });
  });

  // 💡 既知のサイト側の不備（Issue #145）: ログアウトしても、カートの中身が消えず、別のユーザーでログインしても、
  //    前のユーザーのカートが見える（共用のパソコンでは、前の人のカートが次の人に見える）。
  //    期待値は不明（一般には、ログアウトでカートの表示は消える、または、ユーザーごとに分けられる）。docs/known-site-issues.md 参照。
  //    test.fail() = 「失敗すること」を期待するテスト。サイトが直って成功すると、テストが失敗して気づける。
  test('C5: [既知の不具合] ログアウト後に別のユーザーでログインしても、前のユーザーのカートが見えないこと', async ({ page }) => {
    test.fail(true, 'ログアウトしても、カートの中身が残り、別のユーザーに見える（#145 / docs/known-site-issues.md）');
    const { inventoryPage } = await loginAndAddBackpack(page);
    const loginPage = new LoginPage(page);

    await openSideMenu(loginPage);
    await page.locator('[data-test="logout-sidebar-link"]').click();
    await expect(loginPage.loginButton).toBeVisible();

    await loginPage.loginAs(CREDENTIALS.visual); // 別のユーザー
    await expect(inventoryPage.title).toHaveText('Products');

    await expect(inventoryPage.cartBadge).toHaveCount(0, { timeout: 3_000 });
  });
});
