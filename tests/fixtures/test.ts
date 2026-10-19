import { test as base, _android as android } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * 通常の `test` と同じように使える、Android 対応の `test`（#85）。
 *
 * - 通常（`ANDROID` 未設定）: Playwright の `test` そのもの。動作は何も変わらない
 * - `ANDROID=1`: エミュレータ上の Chrome（実機の Chrome）の `page` に差し替える
 *   （`tests-android/playwright.config.ts` から実行する。エミュレータの起動は android-test.yml が行う）
 *
 * Android は `projects` で指定できない（Playwright の Android 対応は experimental）ため、`page` を差し替えている。
 * 端末は 1 台なので、`workers: 1` で実行すること。
 */
const androidTest = base.extend<{ page: Page }>({
  // Playwright の fixture は第 1 引数を分割代入で受ける必要がある（使う fixture が無いので空）
  page: async ({}, use) => {
    const [device] = await android.devices();
    if (!device) throw new Error('Android の端末（エミュレータ）が見つかりません。adb devices を確認してください');
    await device.shell('am force-stop com.android.chrome');
    const context = await device.launchBrowser();
    // 実機の Chrome は、テスト間でプロフィール（Cookie・localStorage）が残る。
    // 前のテストのログイン状態やカートが影響しないよう、最初に消す（繰り返し実行で 2 回目以降が失敗した対策）
    await context.clearCookies();
    const page = await context.newPage();
    await page.goto('https://www.saucedemo.com/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await use(page);
    await context.close();
    await device.close();
  },
});

export const test = (process.env.ANDROID === '1' ? androidTest : base) as typeof base;
export { expect } from '@playwright/test';
