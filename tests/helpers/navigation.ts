import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * 目的の URL に着くまで、ブラウザの「戻る」を押す。
 * 戻る回数の直書き（画面の遷移の数に依存）を避け、URL で到達を判定する。上限に達しても着かなければ失敗する。
 */
export async function goBackUntilUrl(page: Page, urlPattern: RegExp, maxSteps = 6) {
  for (let step = 0; step < maxSteps && !urlPattern.test(page.url()); step++) {
    await page.goBack();
  }
  await expect(page).toHaveURL(urlPattern);
}
