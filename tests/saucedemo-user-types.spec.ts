import { test, expect } from '@playwright/test';
import { CheckoutPage } from './pages/CheckoutPage';
import { loginAndShowInventory } from './helpers/login';
import { CREDENTIALS, SHIPPING_INFO, STANDARD_PRICES } from './fixtures/users';
import { TIMEOUTS } from './helpers/timeouts';

/**
 * ユーザー種別ごとの挙動のテスト（#15）。
 *
 * SauceDemo には、標準ユーザー以外に、意図的に遅延や不具合を再現するユーザーが用意されている。
 * - performance_glitch_user: ログインに遅延がある（それでも使えること）
 * - problem_user / error_user / visual_user: 不具合がある（下の「既知の不具合」）
 *
 * 💡 既知の不具合の扱い（ユーザー判断 #15）:
 *   「正しい挙動」を期待するテストを書き、test.fail()（= 失敗することを期待する）を付ける。
 *   - 今は不具合があるので、テストは「失敗」し、期待どおりとして成功扱いになる（CI は赤くならない）
 *   - サイトが直って成功すると、テストが失敗して気づける → その時は test.fail() を外す
 *   一覧と確認日は docs/known-site-issues.md を参照。
 */

// ログイン後、一覧の表示を待つ時間。遅延があるユーザー（performance_glitch_user）に合わせ、全ユーザーで共通にしている
const INVENTORY_TIMEOUT = { timeout: TIMEOUTS.SLOW_USER };

test.describe('ユーザー種別: performance_glitch_user（遅延がある）', () => {
  test('ログインに遅延があっても、ログインでき、購入完了まで行えること', async ({ page }) => {
    // ログインに約 5 秒かかる。テストのタイムアウト（30 秒）の範囲で完了できること（タイムアウトの妥当性の確認）
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.performanceGlitch, INVENTORY_TIMEOUT);

    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await expect(inventoryPage.cartBadge).toHaveText('1');
    await inventoryPage.cartLink.click();

    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.checkoutButton.click();
    await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
    await checkoutPage.finishButton.click();
    await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
  });
});

test.describe('ユーザー種別: problem_user（意図的な不具合）', () => {
  test('前提: problem_user でログインでき、商品一覧に 6 件が表示されること', async ({ page }) => {
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.problem, INVENTORY_TIMEOUT);
    await expect(inventoryPage.productItems).toHaveCount(6);
  });

  test('前提: problem_user で、購入者情報の入力欄まで進めること', async ({ page }) => {
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.problem, INVENTORY_TIMEOUT);
    await inventoryPage.cartLink.click();
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.checkoutButton.click();
    await expect(checkoutPage.firstNameInput).toBeVisible();
    await expect(checkoutPage.lastNameInput).toBeVisible();
  });

  test('[既知の不具合] 商品画像が、商品ごとに異なること', async ({ page }) => {
    test.fail(true, 'problem_user は、全商品の画像が同じになる（docs/known-site-issues.md）');
    await loginAndShowInventory(page, CREDENTIALS.problem, INVENTORY_TIMEOUT);
    const sources = await page.locator('.inventory_item_img img').evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')));
    expect(new Set(sources).size).toBe(sources.length);
  });

  test('[既知の不具合] 「価格の安い順」で並び替えられること', async ({ page }) => {
    test.fail(true, 'problem_user は、並び替えが効かない（docs/known-site-issues.md）');
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.problem, INVENTORY_TIMEOUT);
    await inventoryPage.selectSortOption('lohi');
    const prices = (await inventoryPage.itemPrices.allTextContents()).map((text) => parseFloat(text.replace('$', '')));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('[既知の不具合] 6 件すべてを、カートに入れられること', async ({ page }) => {
    test.fail(true, 'problem_user は、一部の商品の「Add to cart」が効かない（docs/known-site-issues.md）');
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.problem, INVENTORY_TIMEOUT);
    const buttons = page.locator('[data-test^="add-to-cart"]');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      await buttons.nth(0).click(); // 押すたびに、次の「Add to cart」が先頭に来る（押せたものは Remove に変わる）
    }
    await expect(inventoryPage.cartBadge).toHaveText(String(count));
  });

  test('[既知の不具合] 購入者情報の「姓」の入力が、姓の欄に保持されること', async ({ page }) => {
    test.fail(true, 'problem_user は、姓の入力が名の欄に入る（docs/known-site-issues.md）');
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.problem, INVENTORY_TIMEOUT);
    await inventoryPage.cartLink.click();
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.checkoutButton.click();
    await checkoutPage.firstNameInput.fill(SHIPPING_INFO.firstName);
    await checkoutPage.lastNameInput.fill(SHIPPING_INFO.lastName);
    await expect(checkoutPage.lastNameInput).toHaveValue(SHIPPING_INFO.lastName);
  });
});

test.describe('ユーザー種別: error_user（操作時にエラーが起きる）', () => {
  test('前提: error_user でログインでき、商品一覧に 6 件が表示されること', async ({ page }) => {
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.error, INVENTORY_TIMEOUT);
    await expect(inventoryPage.productItems).toHaveCount(6);
  });

  test('前提: error_user で、購入者情報を入力して確認画面まで進めること', async ({ page }) => {
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.error, INVENTORY_TIMEOUT);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await inventoryPage.cartLink.click();
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.checkoutButton.click();
    await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
    await expect(page).toHaveURL(/checkout-step-two/);
    await expect(checkoutPage.finishButton).toBeVisible();
  });

  test('[既知の不具合] 「価格の安い順」で並び替えられること', async ({ page }) => {
    test.fail(true, 'error_user は、並び替えが効かない（docs/known-site-issues.md）');
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.error, INVENTORY_TIMEOUT);
    await inventoryPage.selectSortOption('lohi');
    const prices = (await inventoryPage.itemPrices.allTextContents()).map((text) => parseFloat(text.replace('$', '')));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('[既知の不具合] 6 件すべてを、カートに入れられること', async ({ page }) => {
    test.fail(true, 'error_user は、一部の商品の「Add to cart」が効かない（docs/known-site-issues.md）');
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.error, INVENTORY_TIMEOUT);
    const buttons = page.locator('[data-test^="add-to-cart"]');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      await buttons.nth(0).click();
    }
    await expect(inventoryPage.cartBadge).toHaveText(String(count));
  });

  test('[既知の不具合] 購入を完了できること', async ({ page }) => {
    test.fail(true, 'error_user は、購入情報の入力・確定でエラーになり、完了できない（docs/known-site-issues.md）');
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.error, INVENTORY_TIMEOUT);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await inventoryPage.cartLink.click();
    const checkoutPage = new CheckoutPage(page);
    await checkoutPage.checkoutButton.click();
    await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
    await checkoutPage.finishButton.click();
    await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!', { timeout: TIMEOUTS.PASS });
  });
});

test.describe('ユーザー種別: visual_user（見た目・表示が崩れる）', () => {
  test('前提: visual_user でログインでき、商品一覧に 6 件が表示されること', async ({ page }) => {
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.visual, INVENTORY_TIMEOUT);
    await expect(inventoryPage.productItems).toHaveCount(6);
  });

  test('[既知の不具合] 商品の価格が、標準ユーザーと同じであること', async ({ page }) => {
    test.fail(true, 'visual_user は、価格が標準と異なる値で表示される（docs/known-site-issues.md）');
    const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.visual, INVENTORY_TIMEOUT);
    const names = await inventoryPage.itemNames.allTextContents();
    const prices = (await inventoryPage.itemPrices.allTextContents()).map((text) => parseFloat(text.replace('$', '')));
    const actual = Object.fromEntries(names.map((name, i) => [name, prices[i]]));
    expect(actual).toEqual(STANDARD_PRICES);
  });
});
