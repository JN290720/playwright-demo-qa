import { test, expect } from './fixtures/test';
import type { Page } from '@playwright/test';
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

/**
 * ページ全体の見た目を、基準画像と比べる。
 *
 * - PC（PC 上のモバイル表示を含む）: ページ全体を 1 枚で撮る（fullPage）
 * - Android（実機の Chrome）: 画面の大きさを変えられないため、全体を 1 枚で撮ると「スクロールの貼り合わせ」になり、
 *   固定ヘッダーが何度も写り込んで不正確になる（#85 の検証で確認）。そのため、画面の高さずつスクロールしながら
 *   上から下まで順に撮る（<名前>-part1, part2, ...）。ページ全体を漏れなく比較できる。
 *   （画面の高さが変わる変更で枚数が増減すると、基準画像の撮り直しが必要になる）
 */
async function expectPageScreenshot(page: Page, name: string) {
  if (process.env.ANDROID !== '1') {
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
    return;
  }
  const { height, viewport } = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
  }));
  const parts = Math.ceil(height / viewport);
  for (let i = 0; i < parts; i++) {
    // 最後の 1 枚は、ページの一番下に合わせる（前の画面と少し重なる）
    const top = Math.min(i * viewport, height - viewport);
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
    // スクロール後の描画（画像の読み込み・再描画）を待つ
    await waitForRenderComplete(page);
    await expect(page).toHaveScreenshot(`${name}-part${i + 1}.png`);
  }
}

test.describe('SauceDemo Visual Regression Tests (完全同期・全ページ対応版)', () => {

  // 1. ログインページ (PC)
  test('P1: ログインページの見た目に変更がないこと (PC)', async ({ page }) => {
    await page.goto('https://www.saucedemo.com/');
    await waitForRenderComplete(page);

    await expectPageScreenshot(page, 'login-page-pc');
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

      await expectPageScreenshot(page, 'inventory-page-pc');
    });

    // 3. 商品詳細ページ
    test('P3: 商品詳細ページの見た目に変更がないこと (PC)', async ({ page }) => {
      await page.locator('.inventory_item_name').first().click();
      await page.locator('[data-test="back-to-products"]').waitFor({ state: 'visible' });

      await waitForRenderComplete(page);

      await expectPageScreenshot(page, 'inventory-item-page-pc');
    });

    // 4. ショッピングカートページ
    test('P4: カート画面の見た目に変更がないこと (PC)', async ({ page }) => {
      await page.locator('.shopping_cart_link').click();
      await page.locator('[data-test="checkout"]').waitFor({ state: 'visible' });

      await waitForRenderComplete(page);

      await expectPageScreenshot(page, 'cart-page-pc');
    });

    // 5. 購入手続き情報入力画面 (Step One)
    test('P5: 購入手続き入力画面の見た目に変更がないこと (PC)', async ({ page }) => {
      await page.locator('.shopping_cart_link').click();
      await page.locator('[data-test="checkout"]').click();
      await page.locator('[data-test="firstName"]').waitFor({ state: 'visible' });

      await waitForRenderComplete(page);

      await expectPageScreenshot(page, 'checkout-step-one-pc');
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

      await expectPageScreenshot(page, 'checkout-step-two-pc');
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

      await expectPageScreenshot(page, 'checkout-complete-pc');
    });

    // 8. サイドメニュー展開状態
    test('P8: サイドメニュー展開時の見た目に変更がないこと (PC)', async ({ page }) => {
      // Android の実機の Chrome では、タップが取りこぼされてメニューが開かないことがあった（#85）ため、
      // 「ボタンを押す → メニューが表示される」までを、表示されるまで繰り返す
      await expect(async () => {
        await page.locator('#react-burger-menu-btn').click();
        await expect(page.locator('.bm-menu-wrap')).toBeVisible({ timeout: 3_000 });
      }).toPass({ timeout: 20_000 });

      await waitForRenderComplete(page);

      await expectPageScreenshot(page, 'side-menu-pc');
    });

  });
});