import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';

// 「$29.99」のような価格表示を数値へ変換する
const toNumber = (text: string) => parseFloat(text.replace('$', ''));

test.describe('SauceDemo 商品一覧（ソート）とカート操作', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('standard_user', 'secret_sauce');
  });

  // ソート 4 種を、期待する並び順と照らして検証（件数が 1 件以上あることも担保する）
  const sortCases = [
    { option: 'az', label: '名前（A → Z）', compare: (a: string, b: string) => a.localeCompare(b, 'en') },
    { option: 'za', label: '名前（Z → A）', compare: (a: string, b: string) => b.localeCompare(a, 'en') },
  ];
  for (const { option, label, compare } of sortCases) {
    test(`ソート: ${label} で商品名が正しく並び変わること`, async ({ page }) => {
      const inventoryPage = new InventoryPage(page);
      await inventoryPage.selectSortOption(option);

      const names = await inventoryPage.itemNames.allTextContents();
      expect(names.length).toBeGreaterThan(1);
      expect(names).toEqual([...names].sort(compare));
    });
  }

  const priceSortCases = [
    { option: 'lohi', label: '価格（安い順）', compare: (a: number, b: number) => a - b },
    { option: 'hilo', label: '価格（高い順）', compare: (a: number, b: number) => b - a },
  ];
  for (const { option, label, compare } of priceSortCases) {
    test(`ソート: ${label} で価格が正しく並び変わること`, async ({ page }) => {
      const inventoryPage = new InventoryPage(page);
      await inventoryPage.selectSortOption(option);

      const prices = (await inventoryPage.itemPrices.allTextContents()).map(toNumber);
      expect(prices.length).toBeGreaterThan(1);
      expect(prices).toEqual([...prices].sort(compare));
    });
  }

  test('カート: カートに入れた商品を、カート画面から削除するとバッジが消えること', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const cartItems = page.locator('.cart_item'); // カート画面の商品行

    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await expect(inventoryPage.cartBadge).toHaveText('1');

    await inventoryPage.cartLink.click();
    await expect(cartItems).toHaveCount(1);

    await page.locator('[data-test="remove-sauce-labs-backpack"]').click();
    await expect(cartItems).toHaveCount(0);
    await expect(inventoryPage.cartBadge).toHaveCount(0);
  });

  test('カート: ページを再読み込みしてもカートの内容が保持されること', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-bike-light');
    await expect(inventoryPage.cartBadge).toHaveText('2');

    await page.reload();

    await expect(inventoryPage.cartBadge).toHaveText('2');
    await expect(page.locator('[data-test="remove-sauce-labs-backpack"]')).toBeVisible();
    await expect(page.locator('[data-test="remove-sauce-labs-bike-light"]')).toBeVisible();
  });

  test('カート: 「Continue Shopping」で商品一覧に戻り、カートの内容が維持されること', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);

    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await inventoryPage.cartLink.click();
    await page.locator('[data-test="continue-shopping"]').click();

    await expect(inventoryPage.title).toHaveText('Products');
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });

  test('商品詳細: 商品名から詳細ページへ移動し、「Back to products」で一覧へ戻れること', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    const firstName = (await inventoryPage.itemNames.first().innerText()).trim();

    await inventoryPage.itemNames.first().click();
    await expect(page).toHaveURL(/inventory-item\.html\?id=\d+/);
    await expect(page.locator('[data-test="inventory-item-name"]')).toHaveText(firstName);

    await page.locator('[data-test="back-to-products"]').click();
    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.title).toHaveText('Products');
  });
});
