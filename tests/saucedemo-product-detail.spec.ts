import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CREDENTIALS } from './fixtures/users';

/**
 * 商品詳細ページの機能のテスト（#131）。
 *
 * 【目的】一覧から開く商品詳細ページで、商品の情報（名前・価格・説明・画像）が、一覧と一致して表示されるか、
 *   詳細ページからの購入導線（カートへの追加・削除、一覧に戻る）が、意図どおりに動くかを確認する。
 * 商品 ID = URL の `?id=4` の部分（どの商品かを表す番号。このサイトの有効な ID は 0〜5 の 6 商品）。
 */
const PRODUCT_IDS = [0, 1, 2, 3, 4, 5] as const;

async function login(page: Page) {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  await loginPage.goto();
  await loginPage.loginAs(CREDENTIALS.standard);
  await expect(inventoryPage.title).toHaveText('Products');
  return inventoryPage;
}

test.describe('商品詳細ページ（機能）', () => {
  for (const id of PRODUCT_IDS) {
    test(`D3: 商品 ID ${id} の詳細ページに、商品名・価格・説明・画像が、一覧と同じ内容で表示されること`, async ({ page }) => {
      await login(page);
      // 一覧での、この商品の表示内容（一覧の中で、この商品へのリンクを持つ行）
      const row = page.locator('.inventory_item', { has: page.locator(`[data-test="item-${id}-title-link"]`) });
      const name = (await row.locator('.inventory_item_name').textContent()) ?? '';
      const price = (await row.locator('.inventory_item_price').textContent()) ?? '';
      const description = (await row.locator('.inventory_item_desc').textContent()) ?? '';

      await page.locator(`[data-test="item-${id}-title-link"]`).click();

      // （一覧の要素が、切り替わる間、残るため、詳細ページ専用のクラスで特定する。#71 と同じ）
      await expect(page.locator('.inventory_details_container')).toBeVisible();
      await expect(page).toHaveURL(`https://www.saucedemo.com/inventory-item.html?id=${id}`);
      await expect(page.locator('.inventory_details_name')).toHaveText(name);
      await expect(page.locator('.inventory_details_price')).toHaveText(price);
      await expect(page.locator('.inventory_details_desc')).toHaveText(description);
      await expect(page.locator('img.inventory_details_img')).toBeVisible();
      await expect(page.locator('img.inventory_details_img')).toHaveAttribute('alt', name);
    });
  }

  test('D4: 詳細ページで「Add to cart」→ カートのバッジが 1 →「Remove」→ バッジが消えること', async ({ page }) => {
    const inventoryPage = await login(page);
    await page.locator('[data-test="item-4-title-link"]').click();
    await expect(page.locator('.inventory_details_container')).toBeVisible();

    await page.locator('[data-test="add-to-cart"]').click();
    await expect(inventoryPage.cartBadge).toHaveText('1');
    await expect(page.locator('[data-test="remove"]')).toBeVisible();

    await page.locator('[data-test="remove"]').click();
    await expect(inventoryPage.cartBadge).toHaveCount(0);
    await expect(page.locator('[data-test="add-to-cart"]')).toBeVisible();
  });

  test('D5: 詳細ページで追加した商品が、「Back to products」で戻った一覧で「Remove」表示になっていること', async ({ page }) => {
    const inventoryPage = await login(page);
    await page.locator('[data-test="item-4-title-link"]').click();
    await expect(page.locator('.inventory_details_container')).toBeVisible();
    await page.locator('[data-test="add-to-cart"]').click();
    await expect(inventoryPage.cartBadge).toHaveText('1');

    await page.locator('[data-test="back-to-products"]').click();

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.title).toHaveText('Products');
    await expect(page.locator('[data-test="remove-sauce-labs-backpack"]')).toBeVisible();
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });
});
