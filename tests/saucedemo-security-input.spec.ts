import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

// SauceDemo のログインフォームに対するセキュリティ・インジェクション攻撃テストスイート
test.describe('SauceDemo セキュリティ入力（インジェクション）検証', () => {
  // 各テスト実行前に Staging 環境かどうかを判定するフック処理
  test.beforeEach(({}, testInfo) => {
    // 環境変数 ENV_NAME が 'staging' でない場合はテスト実行を安全にスキップ
    if (process.env.ENV_NAME !== 'staging') {
      testInfo.skip(true, 'このテストは Staging 環境限定です');
    }
  });

  test('SQLインジェクション風文字列でログインを試みても認証をバイパスできないこと', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // ログイン画面を開く
    await loginPage.goto();

    // 代表的な SQL インジェクションの攻撃パターン (' OR '1'='1) を入力してログイン試行
    await loginPage.login("' OR '1'='1", "' OR '1'='1");

    // 【検証】認証をバイパスしてログイン成功せず、エラーメッセージが表示されていること
    await expect(loginPage.errorMessage).toBeVisible();
    // 【検証】認証失敗時の適切なエラー文言が含まれていること
    await expect(loginPage.errorMessage).toContainText('Username and password do not match');
  });

  test('XSS（スクリプト注入）風文字列を入力してもスクリプトが実行されないこと', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // スクリプトが実行されると alert ダイアログが発生するため、発生したダイアログを記録しておく
    const dialogMessages: string[] = [];
    page.on('dialog', async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.dismiss();
    });

    // ログイン画面を開く
    await loginPage.goto();

    // XSS 攻撃用ペイロード（<script>タグ）を入力してログイン試行
    const xssPayload = '<script>alert("xss")</script>';
    await loginPage.login(xssPayload, 'secret_sauce');

    // 【検証】画面クラッシュせず、認証失敗のエラーメッセージが表示されること
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Username and password do not match');

    // 【検証】入力した文字列が script 要素として画面に挿入されていないこと
    await expect(page.locator('[data-test="error"] script')).toHaveCount(0);

    // 【検証】スクリプトが実行されていない（alert ダイアログが一度も発生していない）こと
    expect(dialogMessages).toEqual([]);
  });
});