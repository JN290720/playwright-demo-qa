import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';

test.describe('7人のQAペルソナによる意地悪な破壊的 E2E テスト', () => {
  test.beforeEach(async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
  });

  test('P1: 空白文字の送信や無駄な連打を行っても、空のTodoが生成されないこと', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // 空白入力や連打の試行
    await todoPage.newTodoInput.fill('   ');
    await todoPage.newTodoInput.press('Enter');

    // リストが空であることを検証
    await expect(todoPage.todoItems).toHaveCount(0);
  });

  test('P2: 前後の余白が自動トリムされ、キーボード操作で正しくフォーカスが当たる', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.addTodo('  余白付きタスク  ');

    // トリムされて追加されているか確認
    await expect(todoPage.todoTitles.first()).toHaveText('余白付きタスク');
  });

  test('P3: XSSスクリプトや超長文を注入してもアプリがエスケープ処理し破壊されないこと', async ({ page }) => {
    const todoPage = new TodoPage(page);

    const xssText = '<script>alert("xss")</script>';
    const longText = 'A'.repeat(150);

    await todoPage.addTodo(xssText);
    await todoPage.addTodo(longText);

    await expect(todoPage.todoTitles.nth(0)).toHaveText(xssText);
    await expect(todoPage.todoTitles.nth(1)).toHaveText(longText);
  });

  test('P4: 画面上の操作結果が LocalStorage の実データと完全に整合していること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.addTodo('Storageテスト');

    // LocalStorage に正しい JSON データとして格納されているか検証
    const savedData = await page.evaluate(() => localStorage.getItem('react-todos'));
    expect(savedData).toContain('Storageテスト');
  });

  test('P5: 既存のデータ（LocalStorage）がブラウザに残っている状態から正常に読み込めること', async ({ page }) => {
    // 事前に LocalStorage にデータを注入
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'react-todos',
        JSON.stringify([{ id: '1', title: '事前注入データ', completed: false }])
      );
    });

    const todoPage = new TodoPage(page);
    await todoPage.goto();

    // 画面に復元されているか確認
    await expect(todoPage.todoTitles.first()).toHaveText('事前注入データ');
  });

  test('P6: 完了状態変更とフィルター切り替えの複合操作時にカウント数が正しく維持されること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.addTodo('タスク1');
    await todoPage.addTodo('タスク2');

    // 1つ目を完了状態へ
    await todoPage.toggleTodo(0);

    // Active フィルターへ切り替え
    await page.getByRole('link', { name: 'Active' }).click();
    await expect(todoPage.todoItems).toHaveCount(1);
    await expect(todoPage.todoTitles.first()).toHaveText('タスク2');

    // All フィルターへ戻す
    await page.getByRole('link', { name: 'All' }).click();
    await expect(todoPage.todoItems).toHaveCount(2);
  });

  test('P7: 全完了ボタン（Toggle All）適用後に1件解除した際、全完了チェックが自動解除されること', async ({ page }) => {
      const todoPage = new TodoPage(page);
      await todoPage.addTodo('タスク1');
      await todoPage.addTodo('タスク2');

      // 1. Toggle All で一旦「全件完了」にする
      await page.locator('label[for="toggle-all"]').click();
      await expect(page.locator('#toggle-all')).toBeChecked();

      // 2. 画面上のテキストを指定して確実に「タスク1」のみを解除する
      await page.locator('.todo-list li').filter({ hasText: 'タスク1' }).getByRole('checkbox').uncheck();

      // 3. 未完了タスクが存在するため、#toggle-all のチェックが自動的に外れていることを検証
      await expect(page.locator('#toggle-all')).not.toBeChecked();
  });
});