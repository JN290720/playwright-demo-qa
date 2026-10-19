// ESLint の設定（#21、ユーザー承認済み）。原則すべて error。no-networkidle のみ warn（待機方法を変えると VRT の安定性に影響しうるため）。
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
      // networkidle は非推奨だが、VRT の待機に使っている。置き換えは VRT の安定性に影響しうるため、別 Issue で扱う。それまでは warn
      'playwright/no-networkidle': 'warn',
    },
  },
);