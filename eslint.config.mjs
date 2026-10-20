// ESLint の設定（#21、ユーザー承認済み）。すべて error（warn のルールも error に引き上げる）。#81 で networkidle の使用をやめ、例外は無くなった。
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

// プラグインの推奨設定には warn のルールがある。「原則すべて error」の方針に合わせて、warn を error に引き上げる
const toError = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, value]) => {
      if (value === 'warn' || value === 1) return [name, 'error'];
      if (Array.isArray(value) && (value[0] === 'warn' || value[0] === 1)) return [name, ['error', ...value.slice(1)]];
      return [name, value];
    }),
  );

export default tseslint.config(
  // 生成物・依存・公開用の静的ファイル・Node スクリプトは対象外
  { ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'blob-report/', 'reports/', 'public/', 'scripts/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Playwright のテストコード
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.ts'],
    rules: {
      ...toError(playwright.configs['flat/recommended'].rules),
      // 「見た目の確認」の共通関数（内部で toHaveScreenshot を呼ぶ）を、アサーションとして扱う
      'playwright/expect-expect': ['error', { assertFunctionNames: ['expectPageScreenshot', 'expectNoA11yViolations'] }],
    },
  },
);