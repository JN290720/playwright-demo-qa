import { test, expect } from './fixtures/test';
import { CheckoutPage } from './pages/CheckoutPage';
import { loginAndShowInventory } from './helpers/login';
import { openSideMenu } from './helpers/side-menu';
import { SHIPPING_INFO } from './fixtures/users';

// 目的: 購入の途中（購入確認の画面）でサイドメニューの「Reset App State」を押したあとも、購入を確定できてしまうサイトの不具合を記録する（PWQA-61。実測は 9/9）。
// 期待値は、一般的な購入サイトの振る舞い（外部サイトで仕様書が無いため「不明」。参考）。stg のみ（@prd・@safari-pr は付けない）。
test.describe('SauceDemo 購入の途中のカート初期化（Reset App State）', () => {
  test('RS1: [既知の不具合] 購入の途中（step-two）でサイドメニューの Reset App State を押したあと、購入の確定（Finish）ボタンが表示されないこと', async ({ page }) => {
    // 現象（2026-11-16 実測。3 ブラウザ × 3 回で 9/9）: Reset のあと、バッジは 0 になるが、購入確認の画面に商品の行と Finish が残り、Finish で完了画面まで進める。台帳: docs/known-site-issues.md #18（関連: 9・11・17）
    // 限界: 期待値は「Finish が表示されない」だけ。①Finish が残ったまま、押すと止まる形で直った場合 ②Finish が残ったまま、押せなくなる（disabled）形で直った場合は、このテストでは気づけない
    test.fail(true, '購入の途中で Reset App State を押しても、Finish が表示されたまま（PWQA-61 / docs/known-site-issues.md #18。限界: 押すと止まる形・押せなくなる形で直った場合は気づけない）');
    const { loginPage, inventoryPage } = await loginAndShowInventory(page);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
    await expect(inventoryPage.cartBadge).toHaveText('1');
    await inventoryPage.cartLink.click();

    // 通常の手順で、購入確認の画面（step-two）まで進む
    const checkout = new CheckoutPage(page);
    await checkout.checkoutButton.click();
    await expect(page).toHaveURL(/checkout-step-one\.html/);
    // webkit では、入力した値が、画面の描画し直しで空に戻ることがある（webkit を 30 回実行して 1〜5 回。入力 → 値の確認を、値が残るまで繰り返す）。
    // 戻ったまま先へ進めず、「予期した失敗」（test.fail）と取り違えるのを避けるため
    await expect(async () => {
      await checkout.firstNameInput.fill(SHIPPING_INFO.firstName);
      await checkout.lastNameInput.fill(SHIPPING_INFO.lastName);
      await checkout.postalCodeInput.fill(SHIPPING_INFO.postalCode);
      await expect(checkout.firstNameInput).toHaveValue(SHIPPING_INFO.firstName, { timeout: 1000 });
      await expect(checkout.lastNameInput).toHaveValue(SHIPPING_INFO.lastName, { timeout: 1000 });
      await expect(checkout.postalCodeInput).toHaveValue(SHIPPING_INFO.postalCode, { timeout: 1000 });
    }).toPass({ timeout: 15000 });
    await checkout.continueButton.click();
    await expect(page).toHaveURL(/checkout-step-two\.html/);

    // 前提: 見出し・Finish が表示され、バッジが 1（前提が崩れたときに、「予期した失敗」と取り違えないため。X1 と同じく、別のテストにはしない）
    await expect(checkout.pageTitle).toBeVisible();
    await expect(checkout.finishButton).toBeVisible();
    await expect(checkout.cartBadge).toHaveText('1');

    // サイドメニューを開いて Reset App State を押し、メニューを × で閉じる（スマホでは、メニューが画面を覆うため）
    await openSideMenu(loginPage);
    await loginPage.resetLink.click();
    await loginPage.closeMenuButton.click();
    await expect(loginPage.sideMenu).toBeHidden();

    // Reset が終わった目印: バッジが 0 になる
    await expect(checkout.cartBadge).toHaveCount(0);

    // 今は Finish が見えるため、この確認は 5 秒待ってから失敗する。5 秒にする理由: 直った形が「別の画面へ移る」ときに、webkit で移るのが 2 秒を超えても、直ったことに気づけるようにするため
    await expect(checkout.finishButton).toBeHidden({ timeout: 5000 });
  });
});
