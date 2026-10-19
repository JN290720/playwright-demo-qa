import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { CREDENTIALS } from './fixtures/users';

test.describe('SauceDemo 破壊的・異常系テストスイート（全12ケース）', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('P1: 空のユーザー名とパスワードでログイン試行時にエラーが表示されること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login('', '');

    // 未入力時のバリデーションエラー表示を確認
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Username is required');
  });

  test('P2: パスワードのみ未入力でログイン試行時にエラーが表示されること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login(CREDENTIALS.standard.username, '');

    // パスワード未入力時のバリデーションエラー表示を確認
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Password is required');
  });

  test('P3: 存在しない無効なユーザー情報でエラーが表示されること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAs(CREDENTIALS.invalid);

    // 認証失敗時のエラーメッセージを表示を確認
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Username and password do not match');
  });

  test('P4: 凍結（ロックアウト）されたユーザーでエラーが表示されること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAs(CREDENTIALS.lockedOut);

    // ロックアウトユーザー専用のエラーメッセージを確認
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Sorry, this user has been locked out');
  });

  test('P5: ユーザー名の前後に余白が含まれている場合、自動トリムされずログインエラーになること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // SauceDemoは余白の自動トリムを行わない仕様のため認証失敗となることを検証
    await loginPage.login(` ${CREDENTIALS.standard.username} `, CREDENTIALS.standard.password);

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Username and password do not match any user in this service');
  });

  test('P6: 未ログイン状態で商品ページへ直リンク移動した場合、ログイン画面へリダイレクトされること', async ({ page }) => {
    const inventoryPage = new InventoryPage(page);
    await inventoryPage.goto();

    const loginPage = new LoginPage(page);
    await expect(loginPage.errorMessage).toBeVisible();
    
    // 未認証アクセス拒否用のメッセージ文言を検証
    await expect(loginPage.errorMessage).toContainText("You can only access '/inventory.html' when you are logged in");
  });

  test('P7: ログアウト操作後にブラウザの「戻る」ボタンを押しても認証保護されること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAs(CREDENTIALS.standard);
    
    // サイドバーメニューからログアウトを実行
    await page.click('#react-burger-menu-btn');
    await page.click('#logout_sidebar_link');

    // ブラウザバックしても商品ページに戻れず保護されているか確認
    await page.goBack();
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('P8: パスワード入力欄がマスク処理（type="password"）されていること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // パスワード入力フィールドの属性を検証
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });

  test('P9: 商品を追加するとカートバッジが1件になり、同じ商品を二重に追加できないこと（ボタンが Remove に変わる）', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAs(CREDENTIALS.standard);

    const inventoryPage = new InventoryPage(page);
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');

    // カートバッジの件数が 1 であることを確認
    await expect(inventoryPage.cartBadge).toHaveText('1');

    // 「Add to cart」ボタンが消え、「Remove」ボタンに切り替わる（＝同じ商品を再度追加する操作ができない）
    await expect(page.locator('[data-test="add-to-cart-sauce-labs-backpack"]')).toHaveCount(0);
    await expect(page.locator('[data-test="remove-sauce-labs-backpack"]')).toBeVisible();
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });

  test('P10: 商品一覧のソート機能（価格の安い順）が正しく並び変わること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAs(CREDENTIALS.standard);

    const inventoryPage = new InventoryPage(page);
    await inventoryPage.selectSortOption('lohi');

    // 表示価格を取得して昇順にソートされていることを検証
    const prices = await page.locator('.inventory_item_price').allTextContents();
    const numericPrices = prices.map(p => parseFloat(p.replace('$', '')));
    const sortedPrices = [...numericPrices].sort((a, b) => a - b);
    expect(numericPrices).toEqual(sortedPrices);
  });

  test('P11: チェックアウト画面で未入力のまま送信した場合、フォームバリデーションエラーが出ること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.loginAs(CREDENTIALS.standard);

    await page.goto('https://www.saucedemo.com/checkout-step-one.html');
    await page.click('[data-test="continue"]');

    // チェックアウトフォームのバリデーションエラーを確認
    await expect(page.locator('[data-test="error"]')).toBeVisible();
    await expect(page.locator('[data-test="error"]')).toContainText('First Name is required');
  });

  test('P12: セッション切れや無効なパラメータでの注文完了画面直リンクを防止できること', async ({ page }) => {
    // 完了画面への不正直リンクアクセス時の拒否状態を確認
    await page.goto('https://www.saucedemo.com/checkout-complete.html');
    const loginPage = new LoginPage(page);

    // ログイン画面へ戻され、未認証アクセスを拒否するメッセージが表示されること
    await expect(page).toHaveURL('https://www.saucedemo.com/');
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText("You can only access '/checkout-complete.html' when you are logged in");
  });
});