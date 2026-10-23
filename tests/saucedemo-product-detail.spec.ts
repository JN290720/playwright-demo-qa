import { test, expect } from '@playwright/test';
import { loginAndShowInventory } from './helpers/login';
import { ProductDetailPage } from './pages/ProductDetailPage';

/**
 * 商品詳細ページの機能のテスト（#131）。
 *
 * 【目的】一覧から開く商品詳細ページで、商品の情報（名前・価格・説明・画像）が、一覧と一致して表示されるか、
 *   詳細ページからの購入導線（カートへの追加・削除、一覧に戻る）が、意図どおりに動くかを確認する。
 * 商品 ID = URL の `?id=4` の部分（どの商品かを表す番号。このサイトの有効な ID は 0〜5 の 6 商品）。
 */
const PRODUCT_IDS = [0, 1, 2, 3, 4, 5] as const;

test.describe('商品詳細ページ（機能）', () => {
  for (const id of PRODUCT_IDS) {
    test(`D3: 商品 ID ${id} の詳細ページに、商品名・価格・説明・画像が、一覧と同じ内容で表示されること`, async ({ page }) => {
      const { inventoryPage } = await loginAndShowInventory(page);
      const detailPage = new ProductDetailPage(page);
      const titleLink = `item-${id}-title-link`;
      // 一覧での、この商品の表示内容（一覧の中で、この商品へのリンクを持つ行）
      const listed = inventoryPage.productInfo(titleLink);
      const name = (await listed.name.textContent()) ?? '';
      const price = (await listed.price.textContent()) ?? '';
      const description = (await listed.description.textContent()) ?? '';

      await inventoryPage.openItemDetail(titleLink);

      // （一覧の要素が、切り替わる間、残るため、詳細ページ専用のクラスで特定する。#71 と同じ）
      await expect(detailPage.container).toBeVisible();
      await expect(page).toHaveURL(`/inventory-item.html?id=${id}`);
      await expect(detailPage.name).toHaveText(name);
      await expect(detailPage.price).toHaveText(price);
      await expect(detailPage.description).toHaveText(description);
      await expect(detailPage.image).toBeVisible();
    });
  }

  test('D4: 詳細ページで「Add to cart」→ カートのバッジが 1 →「Remove」→ バッジが消えること', async ({ page }) => {
    const { inventoryPage } = await loginAndShowInventory(page);
    const detailPage = new ProductDetailPage(page);
    await inventoryPage.openItemDetail('item-4-title-link');
    await expect(detailPage.container).toBeVisible();

    await detailPage.addToCartButton.click();
    await expect(inventoryPage.cartBadge).toHaveText('1');
    await expect(detailPage.removeButton).toBeVisible();

    await detailPage.removeButton.click();
    await expect(inventoryPage.cartBadge).toHaveCount(0);
    await expect(detailPage.addToCartButton).toBeVisible();
  });

  test('D5: 詳細ページで追加した商品が、「Back to products」で戻った一覧で「Remove」表示になっていること', async ({ page }) => {
    const { inventoryPage } = await loginAndShowInventory(page);
    const detailPage = new ProductDetailPage(page);
    await inventoryPage.openItemDetail('item-4-title-link');
    await expect(detailPage.container).toBeVisible();
    await detailPage.addToCartButton.click();
    await expect(inventoryPage.cartBadge).toHaveText('1');

    await detailPage.backToProductsButton.click();

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.title).toHaveText('Products');
    await expect(inventoryPage.dataTestLocator('remove-sauce-labs-backpack')).toBeVisible();
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });
});
