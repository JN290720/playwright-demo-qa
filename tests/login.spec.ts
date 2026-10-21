import { test, expect } from './fixtures/test';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { TodoPage } from './pages/TodoPage';
import { CREDENTIALS } from './fixtures/users';

// =================================================================
// パターン 1: Todoアプリの基本操作（リストへの追加・完了チェック・削除）
// =================================================================
test.describe('パターン1: Todoアプリの操作', () => {
  test('新しいTodoを追加して、完了状態にできること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // Playwright公式のTodoデモサイトへ移動
    await todoPage.goto();

    // 1. テキストボックスにアイテムを入力して Enter キーを押す
    await todoPage.addTodo('Playwrightのテストを書く');
    await todoPage.addTodo('GitHub ActionsでCIを回す');

    // 2. リストに2件追加されたことを検証（アサーション）
    await expect(todoPage.todoTitles).toHaveCount(2);
    await expect(todoPage.todoTitles.first()).toHaveText('Playwrightのテストを書く');

    // 3. 1つ目のTodoのチェックボックスをクリックして完了にする
    await todoPage.toggleTodo(0);

    // 4. 完了状態（打私し線スタイルのクラスがついたか）を検証
    await expect(todoPage.todoItems.first()).toHaveClass(/completed/);
  });
});

// =================================================================
// パターン 2: Eコマースサイトのログイン〜カート追加（ユーザーフロー）
// =================================================================
test.describe('パターン2: ログインとショッピングカート操作', { tag: ['@prd', '@safari-pr'] }, () => {
  test('ログインして商品をカートに追加できること', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const inventoryPage = new InventoryPage(page);

    // Eコマースの自動テスト練習用サイト SauceDemo への移動 & ログイン実行
    await loginPage.goto();
    await loginPage.loginAs(CREDENTIALS.standard);

    // 2. 商品一覧ページへ遷移したか確認
    await expect(page).toHaveURL('https://www.saucedemo.com/inventory.html');

    // 3. 最初の商品の「Add to cart」ボタンをクリック（InventoryPage のメソッドを使用）
    await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');

    // 4. カートアイコンのバッジ数字が「1」になったか検証（InventoryPage の Locator を使用）
    await expect(inventoryPage.cartBadge).toHaveText('1');
  });
});

// =================================================================
// パターン 3: フォームバリデーション（エラーメッセージの表示確認）
// =================================================================
test.describe('パターン3: フォームのエラーハンドリング', () => {
  test('不正なログイン情報で明確なエラーメッセージが表示されること', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // ロックアウトされたユーザー情報でログインを試みる
    await loginPage.loginAs(CREDENTIALS.lockedOut);

    // エラーメッセージ要素が表示され、特定のテキストを含んでいるか検証
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Sorry, this user has been locked out.');
  });
});

// =================================================================
// パターン 4: モバイル画面（レスポンシブ）のレイアウト検証
// =================================================================
test.describe('パターン4: スマホ表示のテスト', () => {
  // このテストだけビューポート（画面サイズ）をiPhoneサイズに変更
  test.use({ viewport: { width: 390, height: 844 } });

  test('スマホ表示でハンバーガーメニューが表示されること', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();

    // ログイン
    await loginPage.loginAs(CREDENTIALS.standard);

    // モバイルサイズ時に左上のメニューボタン（ハンバーガーアイコン）が存在するか検証
    await expect(loginPage.menuButton).toBeVisible();

    // クリックしてサイドナビが開くか確認
    await loginPage.openSideMenu();
    await expect(loginPage.sideMenu).toBeVisible();
  });
});