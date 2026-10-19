import { test, expect } from '@playwright/test';
import { TodoPage } from './pages/TodoPage';

test.describe('TodoApp 基本機能テスト（正常系）', { tag: '@prd' }, () => {
  test.beforeEach(async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
  });

  test('1. 新しい Todo アイテムを登録できること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.addTodo('買い物に行く');

    await expect(todoPage.todoItems).toHaveCount(1);
    await expect(todoPage.todoTitles.first()).toHaveText('買い物に行く');
  });

  test('2. Todo の完了状態をチェックボックスで切り替えられること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.addTodo('部屋の掃除');
    await todoPage.toggleTodo(0);

    // 完了状態（completed クラスが付与）になっているか確認
    await expect(todoPage.todoItems.first()).toHaveClass(/completed/);
  });

  test('3. Todo のタイトルをダブルクリックで編集・保存できること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.addTodo('編集前のタスク');

    // ダブルクリックで編集モードにして更新
    await todoPage.todoTitles.first().dblclick();
    const editInput = page.locator('.editing .edit');
    await editInput.fill('編集後のタスク');
    await editInput.press('Enter');

    await expect(todoPage.todoTitles.first()).toHaveText('編集後のタスク');
  });

  test('4. Todo をホバーして削除ボタン（×）で削除できること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.addTodo('削除予定のタスク');

    // ホバーして削除ボタンを表示させてクリック
    await todoPage.todoItems.first().hover();
    await todoPage.todoItems.first().getByRole('button', { name: 'Delete' }).click();

    await expect(todoPage.todoItems).toHaveCount(0);
  });

  test('5. フィルター（All / Active / Completed）で絞り込めること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.addTodo('未完了タスク');
    await todoPage.addTodo('完了タスク');
    await todoPage.toggleTodo(1);

    // Completed フィルター
    await page.getByRole('link', { name: 'Completed' }).click();
    await expect(todoPage.todoItems).toHaveCount(1);
    await expect(todoPage.todoTitles.first()).toHaveText('完了タスク');

    // Active フィルター
    await page.getByRole('link', { name: 'Active' }).click();
    await expect(todoPage.todoItems).toHaveCount(1);
    await expect(todoPage.todoTitles.first()).toHaveText('未完了タスク');
  });

  test('6. 「Clear completed」ボタンで完了済みタスクを一括削除できること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.addTodo('残すタスク');
    await todoPage.addTodo('消すタスク');
    await todoPage.toggleTodo(1);

    // 完了済み一括削除ボタンを押下
    await page.getByRole('button', { name: 'Clear completed' }).click();

    await expect(todoPage.todoItems).toHaveCount(1);
    await expect(todoPage.todoTitles.first()).toHaveText('残すタスク');
  });
});