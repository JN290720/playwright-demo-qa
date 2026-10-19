import { defineConfig } from '@playwright/test';

// Android エミュレータ上の Chrome で、`@prd` タグ付きの主要機能テストを実行する設定（#85）。
// テストは tests/ を共用する（tests/fixtures/test.ts が、ANDROID=1 のとき page を Android に差し替える）。
// エミュレータの起動・接続は android-test.yml が行う。
process.env.ANDROID = '1';

export default defineConfig({
  testDir: '../tests',
  grep: /@prd/,
  workers: 1, // 端末が 1 台のため
  timeout: 60_000,
  expect: { timeout: 15_000 },
  // 外部サイト（TodoMVC）への接続が一時的に遅れて 1 件失敗した実績があるため、リトライを 1 回だけ許可する。
  // リトライで通ったテストは、Job Summary に flaky として表示される（見逃さない。#37）
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: '../playwright-report-android', open: 'never' }], ['json', { outputFile: '../reports/android-results.json' }]],
});
