import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CREDENTIALS } from './fixtures/users';

/**
 * 商品詳細ページ（inventory-item.html）の id に、不正な値を入れたときの検証（#272）。
 *
 * 【判定の方針】HTTP 状態（404）は判定に使わない。404 は一覧・カートなど、サイト全体のページでも出るため（#272 の実測）。
 *   画面上の表示（商品名の欄・ダイアログ・注入された要素・ページエラー）だけで判定する。
 *
 * 【構成】
 *   A-1（合格のテスト）: 一覧にない id 6 件を順に開き、合格条件 1〜4 を確かめる（1 テスト）。
 *   B-1・B-3・B-4（観察のテスト）: 合否の判定に入れず、表示を記録（testInfo.annotations）するだけ。仕様が決まるまでの材料。
 *   B-2（既知の不具合）: 15/15 で再現したため、test.fail() で記録する（#280。直ると「予期せず成功」になる）。
 *
 * 💡 既存の saucedemo-product-detail-errors.spec.ts（D1）と、-1・abc が重なる。A-1 に残す理由は PR 本文に書く。
 */

// A-1: 一覧にない id（注入の値は、既存の checkout-injection（#169）と同じ値）
const UNLISTED_IDS = [
  { name: 'マイナス（-1）', id: '-1' },
  { name: '一覧にない大きな数（99）', id: '99' },
  { name: '数字ではない（abc）', id: 'abc' },
  { name: '空', id: '' },
  { name: 'NUL 文字（%00）', id: '%00' },
  { name: 'XSS（img の onerror）', id: '<img src=x onerror=alert(1)>' },
];

// 💡 注入された要素の検査（onerror 属性・alert を含む script）は、既存の checkout-injection と同じ方式（#169）。
//    `1<script>` は URL で符号化されるため、この検査では注入そのものは検出されない（観察 B-2 で、表示だけを見る）

/** 画面の観察を、テストの注釈（annotations）に残す。HTML レポートと JSON レポートで読める */
function record(testInfo: TestInfo, label: string, observed: Record<string, string>) {
  testInfo.annotations.push({ type: 'observation', description: `${label} ${JSON.stringify(observed)}` });
}

/** 標準ユーザーでログインする（観察のテストで使う） */
async function login(page: Page) {
  await new LoginPage(page).goto();
  await new LoginPage(page).loginAs(CREDENTIALS.standard);
}

/** 商品詳細を開き、商品名・価格・説明を読む。商品名の欄が見えるまで待つ（固定待機なし） */
async function openDetail(page: Page, id: string) {
  const detail = new ProductDetailPage(page);
  await page.goto(`/inventory-item.html?id=${id}`);
  await expect(detail.name).toBeVisible();
  const url = new URL(page.url());
  return {
    name: (await detail.name.innerText()).trim(),
    price: (await detail.price.innerText().catch(() => '')).trim(),
    description: (await detail.description.innerText().catch(() => '')).trim(),
    url: url.pathname + url.search,
  };
}

/**
 * 1 つの入力について、合格条件 1〜4 の違反を集める（違反の文言の配列を返す。空なら合格）。
 * 条件 1（ページエラー）・4（ダイアログ）は、画面を開く前から登録したイベントの記録を渡す。
 */
async function findProblems(
  page: Page,
  label: string,
  observed: { productNames: string[]; dialogMessages: string[]; pageErrors: string[] },
): Promise<string[]> {
  const problems: string[] = [];
  const detail = new ProductDetailPage(page);

  // 合格条件 1: ページエラーが出ていないこと
  if (observed.pageErrors.length > 0) {
    problems.push(`${label}: ページエラーが出た（${observed.pageErrors.join(' / ')}）`);
  }
  // 合格条件 2: 一覧にない id で、一覧の商品名が出ていないこと
  const shown = (await detail.name.innerText()).trim();
  if (observed.productNames.includes(shown)) {
    problems.push(`${label}: 一覧の商品名が表示された（${shown}）`);
  }
  // 合格条件 3: 内部情報（スタックトレース等）が出ていないこと
  const bodyText = await page.locator('body').innerText();
  if (/TypeError|ReferenceError|SyntaxError|stack trace/i.test(bodyText)) {
    problems.push(`${label}: 内部情報らしき文字列が表示された`);
  }
  // 合格条件 4: ダイアログが出ず、注入された要素が無いこと
  if (observed.dialogMessages.length > 0) {
    problems.push(`${label}: ダイアログが出た（${observed.dialogMessages.join(' / ')}）`);
  }
  if ((await page.locator('[onerror]').count()) > 0) {
    problems.push(`${label}: onerror 属性つきの要素が出ている`);
  }
  if ((await page.locator('script', { hasText: 'alert(1)' }).count()) > 0) {
    problems.push(`${label}: alert を含む script 要素が出ている`);
  }
  return problems;
}

test.describe('SauceDemo 商品詳細ページ（不正な ID）検証', () => {
  test('A-1: 一覧にない ID（6 件）で開いても、一覧の商品として表示されず、画面が壊れず、注入されないこと', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    // 合格条件 1（ページエラー）と条件 4（ダイアログ）は、画面を開く前に登録する（#169 と同じ順序）
    const dialogMessages: string[] = [];
    const pageErrors: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.dismiss();
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);
    await expect(inventoryPage.title).toHaveText('Products');
    // 一覧の 6 商品の名前は画面から取得する（値を直書きしない）。描画を待ってから読む（allInnerTexts は待たない）
    await expect(inventoryPage.itemNames.first()).toBeVisible();
    const productNames = await inventoryPage.itemNames.allInnerTexts();

    const problems: string[] = [];
    for (const { name, id } of UNLISTED_IDS) {
      dialogMessages.length = 0;
      pageErrors.length = 0;

      await openDetail(page, id);
      problems.push(...(await findProblems(page, name, { productNames, dialogMessages, pageErrors })));
    }

    expect(problems).toEqual([]);
  });

  // 観察 B-1〜B-4: 合否は判定しない。記録のみ（仕様が決まるまでの材料）。
  // 💡 expect は「画面が開いている（URL が商品詳細のまま）」の確認だけ。表示の中身は記録する
  test('B-1: 一覧にない ID で開いたときの商品名の欄の表示を記録する', async ({ page }, testInfo) => {
    await login(page);
    for (const id of ['-1', '99', 'abc', '', '%00']) {
      const observed = await openDetail(page, id);
      expect(observed.url).toContain('/inventory-item.html');
      record(testInfo, `B-1 id=${JSON.stringify(id)}`, { name: observed.name, url: observed.url });
    }
  });

  test('B-2: [既知の不具合] 数字で始まる ID（1.5・1<script>）で、一覧の商品を表示しないこと', async ({ page }, testInfo) => {
    // 15/15 で再現した既知の不具合（#280・台帳）。直ると「予期せず成功」になり、知らせる
    test.fail(true, '#280: 数字で始まる id で、先頭の数字の商品（id=1）が表示される（docs/known-site-issues.md）');
    await login(page);
    const inventoryPage = new InventoryPage(page);
    await expect(inventoryPage.itemNames.first()).toBeVisible();
    const productNames = await inventoryPage.itemNames.allInnerTexts();
    for (const id of ['1.5', '1<script>']) {
      const observed = await openDetail(page, id);
      record(testInfo, `B-2 id=${JSON.stringify(id)}`, { name: observed.name, url: observed.url });
      expect(productNames, `id=${id} で、一覧の商品名が表示された（${observed.name}）`).not.toContain(observed.name);
    }
  });

  test('B-3: 一覧にない ID で開いたときの価格の欄の表示を記録する', async ({ page }, testInfo) => {
    await login(page);
    for (const id of ['99', 'abc']) {
      const observed = await openDetail(page, id);
      expect(observed.url).toContain('/inventory-item.html');
      record(testInfo, `B-3 id=${JSON.stringify(id)}`, { price: observed.price, description: observed.description });
    }
  });

  test('B-4: 同じ ID を 2 つ指定（id=1&id=4）したとき、どの商品が表示されるかを記録する', async ({ page }, testInfo) => {
    await login(page);
    const observed = await openDetail(page, '1&id=4');
    expect(observed.url).toContain('/inventory-item.html');
    record(testInfo, 'B-4 id=1&id=4', { name: observed.name, url: observed.url });
  });
});
