import { expect } from '@playwright/test';
import type { LoginPage } from '../pages/LoginPage';

/**
 * サイドメニューを開き、開くアニメーション（左からスライド）が終わるまで待つ。
 * 途中で操作すると、クリックやフォーカスが取りこぼされることがあるため（#57 で確認）。
 */
export async function openSideMenu(loginPage: LoginPage) {
  await loginPage.openSideMenu();
  await expect(loginPage.sideMenu).toBeVisible();
  await expect.poll(async () => (await loginPage.sideMenu.boundingBox())?.x).toBe(0);
}
