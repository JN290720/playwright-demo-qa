import { test as base, expect, _android as android } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LoginPage } from '../tests/pages/LoginPage';
import { InventoryPage } from '../tests/pages/InventoryPage';
import { CheckoutPage } from '../tests/pages/CheckoutPage';
import { CREDENTIALS, SHIPPING_INFO } from '../tests/fixtures/users';

// Playwright の Android API（experimental）で、実機（エミュレータ）の Chrome の page を取得する。
// 既存の Page Object はそのまま使える（#85 でローカル動作確認済み）。
const test = base.extend<{ page: Page }>({
  // Playwright の fixture は、第 1 引数を分割代入で受ける必要がある（使う fixture が無いので空）
  // eslint-disable-next-line no-empty-pattern
  page: async ({}, use) => {
    const [device] = await android.devices();
    await device.shell('am force-stop com.android.chrome');
    const context = await device.launchBrowser();
    const page = await context.newPage();
    await use(page);
    await context.close();
    await device.close();
  },
});

test('Android: ログイン → カート追加 → 購入完了まで行えること', async ({ page }) => {
  const login = new LoginPage(page);
  const inventory = new InventoryPage(page);
  const checkout = new CheckoutPage(page);

  await login.goto();
  await login.loginAs(CREDENTIALS.standard);
  await expect(inventory.title).toHaveText('Products');
  await inventory.addItemToCart('add-to-cart-sauce-labs-backpack');
  await expect(inventory.cartBadge).toHaveText('1');
  await inventory.cartLink.click();
  await checkout.checkoutButton.click();
  await checkout.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
  await checkout.finishButton.click();
  await expect(checkout.completeHeader).toHaveText('Thank you for your order!');
});
