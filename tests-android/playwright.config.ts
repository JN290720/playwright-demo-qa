import { defineConfig } from '@playwright/test';

// Android エミュレータ上の Chrome で実行する実験用の設定（#85）。
// 端末が 1 台のため workers は 1。エミュレータの起動・接続は android-test.yml が行う。
export default defineConfig({
  testDir: '.',
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: '../playwright-report-android', open: 'never' }]],
});
