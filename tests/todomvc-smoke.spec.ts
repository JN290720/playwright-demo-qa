import { test, expect } from './fixtures/test';
import { TodoPage } from './pages/TodoPage';

test.describe('TodoMVC アプリの基本機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
  });

  test('新しいタスクを追加できること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    // タスクを2件追加
    await todoPage.addTodo('Playwrightの学習');
    await todoPage.addTodo('CI/CDパイプラインの構築');

    // 2件追加されたことを検証
    await expect(todoPage.todoTitles).toHaveCount(2);
    await expect(todoPage.todoTitles.nth(0)).toHaveText('Playwrightの学習');
    await expect(todoPage.todoTitles.nth(1)).toHaveText('CI/CDパイプラインの構築');
  });

  test('タスクを完了状態（チェック済み）にできること', async ({ page }) => {
    const todoPage = new TodoPage(page);

    await todoPage.addTodo('完了テスト用タスク');

    // 1件目のタスクを完了状態にする
    await todoPage.toggleTodo(0);

    // 完了マーク（completed クラス）が付与されたか検証
    await expect(todoPage.todoItems.first()).toHaveClass(/completed/);
  });
});