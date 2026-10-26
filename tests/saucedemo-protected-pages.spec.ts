import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CREDENTIALS } from './fixtures/users';
import { openSideMenu } from './helpers/side-menu';

/**
 * 保護ページ（ログインが必要な画面）への直接アクセスと、セッション（ログイン状態）の検証（#130）。
 *
 * 【目的】ログインしていない人が、URL を直接入力するなどして、保護された画面（カート・購入手続きなど）を見られないか、
 *   ログアウト後に前の画面へ戻れないか、ログイン状態の仕組み（Cookie）が破られないかを確認する（セキュリティ・認可）。
 * 認可 = 「この画面を見てよい人か」の確認。セッション = ログインした状態を保つ仕組み（このサイトは Cookie `session-username`）。
 *
 * 既存: 商品一覧（P6）と購入完了（P12）の直接アクセスは saucedemo-qa-destructive.spec.ts にある。ここでは、残りの画面を、一覧（データ駆動）で確認する。
 */
// addCookies の url は絶対 URL が必要なため、ドメインの定数を残す
const BASE = 'https://www.saucedemo.com';

// 保護されている画面（パスと、エラーメッセージに出るパス）
const PROTECTED = [
  { id: 'S1', name: 'カート', url: '/cart.html', shown: '/cart.html' },
  { id: 'S2', name: '購入手続き入力', url: '/checkout-step-one.html', shown: '/checkout-step-one.html' },
  { id: 'S3', name: '購入確認', url: '/checkout-step-two.html', shown: '/checkout-step-two.html' },
  { id: 'S4', name: '商品詳細', url: '/inventory-item.html?id=4', shown: '/inventory-item.html' },
] as const;

type ProtectedPage = (typeof PROTECTED)[number];

// 未ログインで保護ページを開く（S1〜S4 共通の操作）
async function openWithoutLogin(page: Page, target: ProtectedPage) {
  await page.goto(target.url);
  return new LoginPage(page);
}

const [CART, ...OTHER_PROTECTED] = PROTECTED;

test.describe('保護ページへの直接アクセス（未ログイン）', () => {
  // S1（カート）だけ、デプロイ後（Post-Deploy）にも動かす（認証が破れていないことの確認。D33）。
  // タグは固定の文字列でないと lint（valid-test-tags）を通らないため、S2〜S4 のループとは別のテストにしている
  test(`${CART.id}: 未ログインで「${CART.name}」(${CART.url}) を開くと、ログイン画面に戻り、ログインを求められること`, async ({ page }) => {
    const loginPage = await openWithoutLogin(page, CART);

    await expect(page).toHaveURL('/');
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.errorMessage).toContainText(`You can only access '${CART.shown}' when you are logged in`);
  });

  for (const page_ of OTHER_PROTECTED) {
    test(`${page_.id}: 未ログインで「${page_.name}」(${page_.url}) を開くと、ログイン画面に戻り、ログインを求められること`, async ({ page }) => {
      const loginPage = await openWithoutLogin(page, page_);

      await expect(page).toHaveURL('/');
      await expect(loginPage.loginButton).toBeVisible();
      await expect(loginPage.errorMessage).toContainText(`You can only access '${page_.shown}' when you are logged in`);
    });
  }
});

test.describe('セッション（ログイン状態）の検証', () => {
  test('S5: ログアウト後に、ブラウザの「戻る」を押しても、保護ページ（商品一覧）を見られないこと', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await expect(inventoryPage.title).toHaveText('Products');

    await openSideMenu(loginPage);
    await page.locator('[data-test="logout-sidebar-link"]').click();
    await expect(loginPage.loginButton).toBeVisible();

    await page.goBack();

    await expect(loginPage.loginButton).toBeVisible();
    await expect(inventoryPage.title).toHaveCount(0);
  });

  test('S6: ログイン状態の Cookie を削除すると、保護ページを開けないこと', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await expect(new InventoryPage(page).title).toHaveText('Products');

    await context.clearCookies();
    await page.goto('/inventory.html');

    await expect(page).toHaveURL('/');
    await expect(loginPage.errorMessage).toContainText("You can only access '/inventory.html' when you are logged in");
  });

  // Cookie の値を「ロックされたユーザー」「存在しないユーザー」にすると、ログイン状態として扱われない
  for (const value of ['locked_out_user', 'nonexistent_user']) {
    test(`S7: Cookie（session-username）の値を「${value}」にしても、保護ページを開けないこと`, async ({ page, context }) => {
      await page.goto('/');
      await context.addCookies([{ name: 'session-username', value, url: BASE }]);
      await page.goto('/inventory.html');

      await expect(page).toHaveURL('/');
      await expect(new LoginPage(page).loginButton).toBeVisible();
    });
  }

  // 💡 既知のサイト側の不備（Issue #141）: ログインしなくても、Cookie に「有効なユーザー名」を設定するだけで、
  //    パスワードなしで、ログイン済みとして扱われる（購入完了まで行える）。docs/known-site-issues.md 参照。
  //    test.fail() = 「失敗すること」を期待するテスト。サイトが直って成功すると、テストが失敗して気づける。
  test('S8: [既知の不具合] ログインせずに、Cookie（session-username）だけを手で作っても、保護ページを開けないこと', async ({ page, context }) => {
    test.fail(true, 'Cookie に有効なユーザー名を設定するだけで、パスワードなしでログインできる（#141 / docs/known-site-issues.md）');
    await page.goto('/');
    await context.addCookies([{ name: 'session-username', value: CREDENTIALS.standard.username, url: BASE }]);
    await page.goto('/inventory.html');

    await expect(page).toHaveURL('/');
    await expect(new LoginPage(page).loginButton).toBeVisible();
  });

  test('S9: ログアウトしたあと、カートや購入手続きのページに直接アクセスしても、保護されていること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await loginPage.menuButton.click();
    await loginPage.logoutLink.click();
    await expect(page).toHaveURL('/');

    for (const path of ['cart.html', 'checkout-step-one.html']) {
      await page.goto(`/${path}`);
      await expect(page).toHaveURL('/');
      await expect(loginPage.errorMessage).toContainText('when you are logged in');
    }
  });
});
