import { test, expect } from './fixtures/test';
import { CheckoutPage } from './pages/CheckoutPage';
import { loginAndShowInventory } from './helpers/login';

// 目的: 購入手順の飛ばし（購入者情報を入れずに、購入確認の画面を直接開く）を、サイトの既知の不具合として記録する（PWQA-51。実測は PWQA-50）。
// 期待値は、一般的な購入サイトの振る舞い（外部サイトで仕様書が無いため「不明」。参考）。
// stg のみ（@prd・@safari-pr は付けない）。
test.describe('SauceDemo 購入手順の飛ばし（購入確認の直接アクセス）', () => {
  test('X1: [既知の不具合] 購入者情報を入れずに購入確認の画面を直接開いても、購入の確定（Finish）ボタンが表示されないこと', async ({ page }) => {
    // 現象（2026-11-15 実測。3 ブラウザ × 3 回で 9/9）: エラーなしで確認画面が表示され、Finish で完了画面まで進める。台帳: docs/known-site-issues.md #17
    // 限界: 期待値は「Finish が表示されない」だけ。①Finish が残ったまま、押すと止まる形で直った場合 ②カート・商品一覧など step-one 以外の画面へ戻す形で直った場合は、このテストでは気づけない（②は Cancel が無く、待ちが時間切れになる）
    test.fail(true, '購入者情報なしで確認画面が開き、Finish が表示される（PWQA-51 / docs/known-site-issues.md #17。限界: 押すと止まる形・step-one 以外へ戻す形で直った場合は気づけない）');
    const { inventoryPage } = await loginAndShowInventory(page);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await expect(inventoryPage.cartBadge).toHaveText('1');

    const checkout = new CheckoutPage(page);
    await page.goto('/checkout-step-two.html');
    // 描画の完了を、2 つとも待つ（webkit は読み込み直後に Finish がまだ無いことがあり、待たないと「予期せず成功」の誤報になる）。
    // Cancel は Finish と同じ下部の欄にあり、step-one にも step-two にもある（step-one に戻す形で直っても、待ちが外れない）
    await expect(checkout.pageTitle).toBeVisible();
    await expect(checkout.cancelButton).toBeVisible();

    // 今は Finish が見えるため、この確認は 2 秒待ってから失敗する（Cancel を待ったあとなので、直ったときは Finish がすぐ無い）
    await expect(checkout.finishButton).toBeHidden({ timeout: 2000 });
  });
});
