import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { LoginPage } from '../tests/pages/LoginPage';
import { InventoryPage } from '../tests/pages/InventoryPage';
import { CheckoutPage } from '../tests/pages/CheckoutPage';
import { CREDENTIALS, SHIPPING_INFO } from '../tests/fixtures/users';

/**
 * 表示速度の記録（#136。ユーザー判断: 記録のみ。失敗にしない）。
 *
 * 【目的】外部の公開サイトの表示速度の推移を、後から見られるようにする。**しきい値は設けない**（遅くても、テストは失敗しない）。
 * 結果は reports/perf.json に書き、scripts/summarize-perf.js が、Job Summary に表（中央値・最小・最大）として出す。
 * 用語: LCP（Largest Contentful Paint）= 画面の主要な内容が表示されるまでの時間。load = ページと、画像などの読み込みが終わるまでの時間。
 */
const RUNS = 5;
const results: Record<string, number[]> = {};
const record = (name: string, ms: number) => (results[name] = [...(results[name] ?? []), Math.round(ms)]);

async function timed(name: string, action: () => Promise<void>) {
  const start = Date.now();
  await action();
  record(name, Date.now() - start);
}

/** ページの Navigation Timing（読み込み完了）と LCP を取得する */
async function pageTimings(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ load: number; lcp: number }>((resolve) => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        let lcp = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) lcp = e.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => resolve({ load: nav.loadEventEnd, lcp }), 500);
      }),
  );
}

test.afterAll(() => {
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(path.join('reports', 'perf.json'), JSON.stringify({ recordedAt: new Date().toISOString(), runs: RUNS, results }, null, 2));
});

test('PF1〜PF3: 主要な画面の表示速度を記録する（記録のみ。しきい値なし）', async ({ browser }) => {
  for (let i = 0; i < RUNS; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);
    const checkoutPage = new CheckoutPage(page);

    // PF1: ログイン画面を開く（読み込み完了・LCP）
    await timed('PF1 ログイン画面の表示（ページ遷移から、ログインボタンの表示まで）', async () => {
      await loginPage.goto();
      await expect(loginPage.loginButton).toBeVisible();
    });
    const t = await pageTimings(page);
    record('PF1 ログイン画面: load（読み込み完了）', t.load);
    record('PF1 ログイン画面: LCP（主要な内容の表示）', t.lcp);

    // PF2: ログイン → 商品一覧
    await timed('PF2 ログイン操作から、商品一覧の表示まで', async () => {
      await loginPage.loginAs(CREDENTIALS.standard);
      await expect(inventoryPage.title).toHaveText('Products');
    });

    // PF3: 商品一覧 → カート → 購入手続き → 確認 → 完了（画面ごとの遷移時間）
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await timed('PF3 商品一覧 → カート', async () => {
      await inventoryPage.cartLink.click();
      await expect(checkoutPage.checkoutButton).toBeVisible();
    });
    await timed('PF3 カート → 購入手続き入力', async () => {
      await checkoutPage.checkoutButton.click();
      await expect(checkoutPage.firstNameInput).toBeVisible();
    });
    await timed('PF3 購入手続き入力 → 購入確認', async () => {
      await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
      await expect(checkoutPage.finishButton).toBeVisible();
    });
    await timed('PF3 購入確認 → 購入完了', async () => {
      await checkoutPage.finishButton.click();
      await expect(checkoutPage.completeHeader).toBeVisible();
    });

    await context.close();
  }

  // 失敗にするのは、「測定できなかった」場合だけ（遅いかどうかでは、失敗にしない）
  expect(Object.keys(results).length).toBeGreaterThan(0);
});
