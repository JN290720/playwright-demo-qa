import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CREDENTIALS } from './fixtures/users';

test.describe('SauceDemo Network Mocking & Resilience Tests', () => {

  // -------------------------------------------------------------
  // 1. 画像アセット障害モック（商品画像の取得失敗時の挙動）
  // -------------------------------------------------------------
  test('P1: 商品画像が 500 エラー（読み込み失敗）の場合でもレイアウトが破綻しないこと', async ({ page }) => {
    // 💡 全ての商品画像 (.jpg / .png) のリクエストを横取りして 500 エラーを返す
    await page.route('**/*.{png,jpg,jpeg}', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'image/png',
        body: ''
      });
    });

    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);

    // 💡 検証: 画像が読み込めなくても画面タイトルや商品名テキスト、ボタンが正しく表示されていること
    await expect(inventoryPage.title).toHaveText('Products');
    await expect(inventoryPage.itemNames.first()).toBeVisible();
    await expect(inventoryPage.dataTestLocator('add-to-cart-sauce-labs-backpack')).toBeEnabled();
  });

  // -------------------------------------------------------------
  // 2. 通信遅延（レスポンス遅延・低速回線）シミュレーション
  // -------------------------------------------------------------
  test('P2: 通信が著しく遅い環境（3秒のディレイ）でもログイン～カート追加が完了すること', async ({ page }) => {
    // 💡 すべてのリクエストに対して 3000ms (3秒) の遅延を付与
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });

    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);

    // 遅延があっても最終的にログイン後の商品一覧が表示されること（タイムアウト設定を拡張）
    await expect(inventoryPage.title).toBeVisible({ timeout: 10000 });

    // 遅延下でも、カートへの追加が完了し、バッジに反映されること
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await expect(inventoryPage.cartBadge).toHaveText('1', { timeout: 10000 });
  });

  // -------------------------------------------------------------
  // 3. ログイン後操作中のオフライン（通信断）テスト
  // -------------------------------------------------------------
  test('P3: 商品一覧を表示後にオフラインになっても、既存描画が維持されること', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await inventoryPage.title.waitFor({ state: 'visible' });

    // 💡 ログイン成功後にネットワークを切断（オフライン化）
    await context.setOffline(true);

    try {
      // 【検証】オフラインになっても、既に描画された商品一覧が残っていること
      await expect(inventoryPage.title).toHaveText('Products');
      await expect(inventoryPage.productItems).not.toHaveCount(0);

      // 【検証】SPA のクライアント側の状態は、通信なしでも動くこと（カートへの追加がバッジに反映される）
      await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
      await expect(inventoryPage.cartBadge).toHaveText('1');
      await expect(inventoryPage.dataTestLocator('remove-sauce-labs-backpack')).toBeVisible();
    } finally {
      // 検証の成否に関わらず、ネットワーク状態を復元する
      await context.setOffline(false);
    }

    // 【検証】通信を復旧したあとも、画面とカートの状態が維持されていること
    await expect(inventoryPage.title).toHaveText('Products');
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });

  // -------------------------------------------------------------
  // 4. 商品詳細ページでの画像の取得失敗（#134 N2）
  // -------------------------------------------------------------
  test('P4: 商品詳細ページで、商品画像が読み込めなくても、商品名・価格・ボタンが使えること', async ({ page }) => {
    // 💡 画像（jpg / png など）のリクエストを失敗させる
    await page.route(/\.(jpg|jpeg|png|webp|svg)(\?.*)?$/, (route) => route.abort());

    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const detailPage = new ProductDetailPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await expect(inventoryPage.title).toHaveText('Products');
    await inventoryPage.openItemDetail('item-4-title-link');

    // 💡 検証: 画像が無くても、商品名・価格・「Add to cart」が表示され、使える。画像には代わりの説明文（alt）がある
    // （一覧の要素が、切り替わる間、残るため、詳細ページ専用のクラスで特定する。#71 と同じ）
    await expect(detailPage.container).toBeVisible();
    await expect(detailPage.name).toHaveText('Sauce Labs Backpack');
    await expect(detailPage.price).toHaveText('$29.99');
    await expect(detailPage.image).toHaveAttribute('alt', 'Sauce Labs Backpack');
    await detailPage.addToCartButton.click();
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });

  // -------------------------------------------------------------
  // 5. 外部リソース（フォント・エラー収集サービス）の取得失敗（#134 N3）
  // -------------------------------------------------------------
  test('P5: 外部サイトのリソース（Google Fonts など）が読み込めなくても、主要な操作が行えること', async ({ page }) => {
    // 💡 このサイト自身（www.saucedemo.com）以外への通信（Google Fonts、エラー収集サービスなど）を、すべて失敗させる
    await page.route((url) => url.hostname !== 'www.saucedemo.com', (route) => route.abort());

    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);

    // 💡 検証: 外部のリソースが無くても、ログイン → 商品一覧 → カートへの追加が行える
    await expect(inventoryPage.title).toHaveText('Products');
    await expect(inventoryPage.productItems).toHaveCount(6);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });
});
