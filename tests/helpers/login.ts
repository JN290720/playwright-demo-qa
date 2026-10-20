import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CREDENTIALS } from '../fixtures/users';
import type { Credentials } from '../fixtures/users';

/**
 * ログインして、商品一覧が表示されるまで待つ（ログイン画面を開く → ログイン → 一覧の見出し「Products」を確認）。
 * @param user ログインするユーザー（既定は標準ユーザー）
 * @param options.timeout 一覧の表示を待つ時間（ミリ秒）。未指定は Playwright の既定。遅延があるユーザー（performance_glitch_user など）で延ばす
 * @returns 操作に使った `loginPage` と `inventoryPage`（使わない側は受け取らなくてよい）
 */
export async function loginAndShowInventory(
  page: Page,
  user: Credentials = CREDENTIALS.standard,
  options: { timeout?: number } = {},
) {
  const loginPage = new LoginPage(page);
  const inventoryPage = new InventoryPage(page);
  await loginPage.goto();
  await loginPage.loginAs(user);
  await expect(inventoryPage.title).toHaveText('Products', { timeout: options.timeout });
  return { loginPage, inventoryPage };
}
