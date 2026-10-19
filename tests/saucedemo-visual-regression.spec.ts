import { test, expect, Page } from '@playwright/test';
import { CREDENTIALS, SHIPPING_INFO } from './fixtures/users';

/**
 * 💡 レンダリング完了を 100% 待つためのカスタムヘルパー関数
 */
async function waitForRenderComplete(page: Page) {
  // 1. ページ遷移＆ネットワークの安定を待つ
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');

  // 2. Webフォントの読み込み完了を待つ（フォントのガタつき防止）
  await page.evaluate(() => document.fonts.ready);

  // 3. 画面上の全 <img> タグの画像ロードが完了（complete）するのを待つ
  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve); // エラー時もタイムアウト防止でresolve
        });
      })
    );
  });

  // 4. 最後に1フレーム（描画サイクル）待機
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
}

test.describe('SauceDemo Visual Regression Tests (完全同期・全ページ対応版)', () => {

  // 1. ログインページ (PC)
  test('P1: ログインページの見た目に変更がないこと (PC)', async ({ page }) => {
    await page.goto('https://www.saucedemo.com/');
    await waitForRenderComplete(page);

    await expect(page).toHaveScreenshot('login-page-pc.png', {
      fullPage: true,
    });
  });

  // 💡 ログイン後ページのテスト群
  test.describe('ログイン後全ページのビジュアル比較', () => {

    // 各テスト前にログインを実行して商品一覧へ移動
    test.beforeEach(async ({ page }) => {
      await page.goto('https://www.saucedemo.com/');
      await page.locator('[data-test="username"]').fill(CREDENTIALS.standard.username);
      await page.locator('[data-test="password"]').fill(CREDENTIALS.standard.password);
      await page.locator('[data-test="login-button"]').click();
      await page.locator('.title').waitFor({ state: 'visible' });
    });

    // 2. 商品一覧ページ
    test('P2: 商品一覧ページの見た目に変更がないこと (PC)', async ({ page }) => {
      await waitForRenderComplete(page);

      await expect(page).toHaveScreenshot('inventory-page-pc.png', {
        fullPage: true,
      });
    });

    // 3. 商品詳細ページ
    test('P3: 商品詳細ページの見た目に変更がないこと (PC)', async ({ page }) => {
      await page.locator('.inventory_item_name').first().click();
      await page.locator('[data-test="back-to-products"]').waitFor({ state: 'visible' });

      await waitForRenderComplete(page);

      await expect(page).toHaveScreenshot('inventory-item-page-pc.png', {
        fullPage: true,
      });
    });

    // 4. ショッピングカートページ
    test('P4: カート画面の見た目に変更がないこと (PC)', async ({ page }) => {
      await page.locator('.shopping_cart_link').click();
      await page.locator('[data-test="checkout"]').waitFor({ state: 'visible' });

      await waitForRenderComplete(page);

      await expect(page).toHaveScreenshot('cart-page-pc.png', {
        fullPage: true,
      });
    });

    // 5. 購入手続き情報入力画面 (Step One)
    test('P5: 購入手続き入力画面の見た目に変更がないこと (PC)', async ({ page }) => {
      await page.locator('.shopping_cart_link').click();
      await page.locator('[data-test="checkout"]').click();
      await page.locator('[data-test="firstName"]').waitFor({ state: 'visible' });

      await waitForRenderComplete(page);

      await expect(page).toHaveScreenshot('checkout-step-one-pc.png', {
        fullPage: true,
      });
    });

    // 6. 購入確認画面 (Step Two)
    test('P6: 購入確認画面の見た目に変更がないこと (PC)', async ({ page }) => {
      await page.locator('.shopping_cart_link').click();
      await page.locator('[data-test="checkout"]').click();
      await page.locator('[data-test="firstName"]').fill(SHIPPING_INFO.firstName);
      await page.locator('[data-test="lastName"]').fill(SHIPPING_INFO.lastName);
      await page.locator('[data-test="postalCode"]').fill(SHIPPING_INFO.postalCode);
      await page.locator('[data-test="continue"]').click();
      await page.locator('[data-test="finish"]').waitFor({ state: 'visible' });

      await waitForRenderComplete(page);

      await expect(page).toHaveScreenshot('checkout-step-two-pc.png', {
        fullPage: true,
      });
    });

    // 7. 購入完了画面 (Complete)
    test('P7: 購入完了画面の見た目に変更がないこと (PC)', async ({ page }) => {
      await page.locator('.shopping_cart_link').click();
      await page.locator('[data-test="checkout"]').click();
      await page.locator('[data-test="firstName"]').fill(SHIPPING_INFO.firstName);
      await page.locator('[data-test="lastName"]').fill(SHIPPING_INFO.lastName);
      await page.locator('[data-test="postalCode"]').fill(SHIPPING_INFO.postalCode);
      await page.locator('[data-test="continue"]').click();
      await page.locator('[data-test="finish"]').click();
      await page.locator('[data-test="back-to-products"]').waitFor({ state: 'visible' });

      await waitForRenderComplete(page);

      await expect(page).toHaveScreenshot('checkout-complete-pc.png', {
        fullPage: true,
      });
    });

    // 8. サイドメニュー展開状態
    test('P8: サイドメニュー展開時の見た目に変更がないこと (PC)', async ({ page }) => {
      await page.locator('#react-burger-menu-btn').click();
      await page.locator('.bm-menu-wrap').waitFor({ state: 'visible' });

      await waitForRenderComplete(page);

      await expect(page).toHaveScreenshot('side-menu-pc.png', {
        fullPage: true,
      });
    });

  });
});