import { test, expect } from './fixtures/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CREDENTIALS } from './fixtures/users';

// 購入手続きの入力欄（姓・名・郵便番号）に入れる、インジェクション風の文字列（#169）。
// 実サイトの実測（2026-10-20）では、どれも拒否されず、スクリプトも動かなかった。
// 300 文字は、注入の検証としては弱い（スクリプトを含まない）。長い入力で画面が崩れないかの確認として置いている
const PAYLOADS = [
  { name: 'XSS（img の onerror）', value: '<img src=x onerror=alert(1)>' },
  { name: 'XSS（script タグ）', value: '<script>alert(1)</script>' },
  { name: 'SQL インジェクション', value: "' OR '1'='1" },
  { name: '300 文字の長い文字列', value: 'A'.repeat(300) },
];

test.describe('SauceDemo セキュリティ入力（購入手続きのインジェクション）検証', () => {
  for (const { name, value } of PAYLOADS) {
    test(`購入入力欄に ${name} を入れても、スクリプトが動かないこと`, async ({ page }) => {
      const loginPage = new LoginPage(page);
      const inventoryPage = new InventoryPage(page);
      const checkoutPage = new CheckoutPage(page);

      // スクリプトが実行されると alert ダイアログが出るため、出たダイアログを記録しておく
      const dialogMessages: string[] = [];
      page.on('dialog', async (dialog) => {
        dialogMessages.push(dialog.message());
        await dialog.dismiss();
      });

      // 1. ログイン → 商品を 1 件カートへ → 購入入力へ進む
      await loginPage.goto();
      await loginPage.loginAs(CREDENTIALS.standard);
      await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
      await inventoryPage.cartLink.click();
      await checkoutPage.checkoutButton.click();

      // 2. 姓・名・郵便番号の全てに同じ文字列を入れて Continue
      await checkoutPage.fillShippingInfo(value, value, value);

      // 3. 結果が出るまで待つ（確認画面へ進む / エラーが出る、どちらでもよい。拒否の仕様はサイトに無く「不明」）
      await expect(checkoutPage.finishButton.or(checkoutPage.errorMessage)).toBeVisible();

      // 4. 【検証】ダイアログが 0 件（スクリプトが実行されていない）
      expect(dialogMessages).toEqual([]);

      // 5. 【検証】注入された要素が 0 件（onerror 属性つきの要素・alert を含む script 要素）
      await expect(page.locator('[onerror]')).toHaveCount(0);
      await expect(page.locator('script', { hasText: 'alert(1)' })).toHaveCount(0);
    });
  }
});
