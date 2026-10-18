import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// ENV の取得（デフォルトは prod）
const env = process.env.ENV || 'prod';

// 💡 process.cwd() でプロジェクトルートの .env.<ENV> を確実に参照
dotenv.config({
  path: path.join(process.cwd(), `.env.${env}`),
  override: true,
});

console.log(`[Playwright Config] 読み込んだ環境: .env.${env} / ENV_NAME=${process.env.ENV_NAME}`);

// 💡 CI環境かどうか、およびイベント種別（PRかmainマージか）を判定
const isCI = !!process.env.CI;
const isPR = process.env.GITHUB_EVENT_NAME === 'pull_request';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  /* 💡 CIでの並列実行ワーカー数：PC＋スマホの並列処理のため 2 ワーカーを指定 */
  workers: isCI ? 4 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* 💡 環境ファイル内の BASE_URL を使用（未設定なら http://localhost:3000 にフォールバック） */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* 失敗時の自動証拠収集設定 */
    trace: 'on-first-retry', // 失敗してリトライした時に詳細な操作ログ（Trace Viewer）を保存
    screenshot: 'only-on-failure', // テスト失敗時のみ画面キャプチャを自動取得
    video: 'retain-on-failure',   // テスト失敗時のみ動画（MP4）を自動保存
  },

  projects: [
    // =========================================================================
    // 💡 1. PR時 & mainマージ時 の両方で実行するコア環境（PC & スマホ）
    // PR時でも画面幅に起因するレイアウト崩れや操作不可バグを高速に検知します。
    // =========================================================================
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },

    // =========================================================================
    // 💡 2. mainマージ時（Push時）のみ追加で動かす検証環境（Safari / WebKit）
    // PR作成・更新時はスキップして開発スピードを優先し、
    // mainマージ後に WebKit 固有の表示・動作崩れを最終チェックします。
    // =========================================================================
    ...(isPR
      ? [] // PR時はスキップ（上記2プロジェクトのみで高速完走）
      : [
          {
            name: 'desktop-safari',
            use: { ...devices['Desktop Safari'] },
          },
        ]),
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});