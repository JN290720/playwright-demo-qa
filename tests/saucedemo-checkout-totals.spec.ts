import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { CREDENTIALS, SHIPPING_INFO } from './fixtures/users';

/**
 * 購入確認画面の、金額（小計・税・合計）の計算のテスト（#133）。
 *
 * 【目的】金額の計算の誤りは、利用者の信頼とお金に直結する。商品の数・組み合わせ・端数（税の四捨五入）で、
 *   計算が合っているかを確認する。商品の価格は、画面の表示から動的に取得し、値の直書きによる壊れやすさを避ける（既存の E2E と同じ方針）。
 * 小計 = 各商品の価格の合計 ／ 税 = 小計の 8%（四捨五入）／ 合計 = 小計 + 税。
 * データ駆動 = 同じ手順を、複数のデータ（商品の組み合わせ）で繰り返すテスト。
 */
const BUTTONS = {
  backpack: 'add-to-cart-sauce-labs-backpack',
  bikeLight: 'add-to-cart-sauce-labs-bike-light',
  boltTShirt: 'add-to-cart-sauce-labs-bolt-t-shirt',
  fleeceJacket: 'add-to-cart-sauce-labs-fleece-jacket',
  onesie: 'add-to-cart-sauce-labs-onesie',
  redTShirt: 'add-to-cart-test.allthethings()-t-shirt-(red)',
} as const;

const CASES = [
  { id: 'A1', name: '1 件（最安: Onesie）', items: [BUTTONS.onesie] },
  { id: 'A2', name: '1 件（最高額: Fleece Jacket）', items: [BUTTONS.fleeceJacket] },
  { id: 'A3', name: '同じ価格の 2 件（Bolt T-Shirt と Test.allTheThings() T-Shirt）', items: [BUTTONS.boltTShirt, BUTTONS.redTShirt] },
  { id: 'A4', name: '6 件すべて', items: Object.values(BUTTONS) },
  { id: 'A5', name: '任意の 3 件（Backpack・Bike Light・Fleece Jacket）', items: [BUTTONS.backpack, BUTTONS.bikeLight, BUTTONS.fleeceJacket] },
] as const;

/** 一覧での、この商品（ボタン）の価格 */
async function listPriceOf(page: Page, buttonDataTest: string) {
  const row = page.locator('.inventory_item', { has: page.locator(`[data-test="${buttonDataTest}"]`) });
  return CheckoutPage.parseAmount((await row.locator('.inventory_item_price').textContent()) ?? '');
}

test.describe('購入確認画面の金額（小計・税・合計）', () => {
  for (const c of CASES) {
    test(`${c.id}: ${c.name}で、小計・税・合計が正しく計算され、各商品の価格が一覧と一致すること`, async ({ page }) => {
      const loginPage = new LoginPage(page);
      const inventoryPage = new InventoryPage(page);
      const checkoutPage = new CheckoutPage(page);
      await loginPage.goto();
      await loginPage.loginAs(CREDENTIALS.standard);
      await expect(inventoryPage.title).toHaveText('Products');

      // 一覧での価格を、画面から取得してから、商品をカートに入れる
      const listPrices: number[] = [];
      for (const button of c.items) {
        listPrices.push(await listPriceOf(page, button));
        await inventoryPage.addItemToCart(button);
      }
      await expect(inventoryPage.cartBadge).toHaveText(String(c.items.length));

      await inventoryPage.cartLink.click();
      await checkoutPage.checkoutButton.click();
      await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
      await expect(checkoutPage.finishButton).toBeVisible();

      // 確認画面の各商品の価格が、一覧の価格と一致する（順番に依存しないよう、並べ替えて比較）
      const summaryPrices = (await checkoutPage.summaryItemPrices.allTextContents()).map(CheckoutPage.parseAmount);
      expect([...summaryPrices].sort((a, b) => a - b)).toEqual([...listPrices].sort((a, b) => a - b));

      // 小計 = 各商品の価格の合計、税 = 小計の 8%（四捨五入）、合計 = 小計 + 税
      const expectedSubtotal = listPrices.reduce((sum, price) => sum + price, 0);
      const subtotal = CheckoutPage.parseAmount(await checkoutPage.subtotalLabel.innerText());
      const tax = CheckoutPage.parseAmount(await checkoutPage.taxLabel.innerText());
      const total = CheckoutPage.parseAmount(await checkoutPage.totalLabel.innerText());
      expect(subtotal).toBeCloseTo(expectedSubtotal, 2);
      expect(tax).toBeCloseTo(Math.round(subtotal * 8) / 100, 2); // セント単位の四捨五入（8% = ×8÷100）
      expect(total).toBeCloseTo(subtotal + tax, 2);
    });
  }
});
