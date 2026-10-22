import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CREDENTIALS } from './fixtures/users';

/**
 * 商品詳細ページの異常系のテスト（#131）。
 *
 * 【目的】URL の商品 ID を書き換える・存在しない商品を開くなど、利用者（や悪意のある人）が行いうる操作で、
 *   サイトが壊れず、適切に振る舞うか（「見つかりません」の表示と、一覧へ戻る導線があるか）を確認する。
 * 商品 ID = URL の `?id=4` の部分。有効な ID は 0〜5 の 6 商品。
 */
const INVALID_URLS = [
  { name: '存在しない ID（999）', url: '/inventory-item.html?id=999' },
  { name: 'マイナスの ID（-1）', url: '/inventory-item.html?id=-1' },
  { name: '数字ではない ID（abc）', url: '/inventory-item.html?id=abc' },
  { name: 'ID なし', url: '/inventory-item.html' },
] as const;

test.describe('商品詳細ページ（存在しない商品）', () => {
  for (const item of INVALID_URLS) {
    test(`D1: ${item.name} で開くと、「ITEM NOT FOUND」が表示され、「Back to products」で一覧に戻れること`, async ({ page }) => {
      const loginPage = new LoginPage(page);
      const inventoryPage = new InventoryPage(page);
      await loginPage.goto();
      await loginPage.loginAs(CREDENTIALS.standard);
      await expect(inventoryPage.title).toHaveText('Products');

      await page.goto(item.url);

      // 💡 外部サイトの文言が変わっても壊れにくいよう、見出しの文言は、部分一致（大文字・小文字を区別しない）で確認する
      await expect(page.getByText(/item not found/i)).toBeVisible();
      await expect(page.locator('[data-test="back-to-products"]')).toBeVisible();

      // D2: 「Back to products」で、一覧に戻れる
      await page.locator('[data-test="back-to-products"]').click();
      await expect(page).toHaveURL(/inventory\.html/);
      await expect(inventoryPage.title).toHaveText('Products');
    });
  }
});
