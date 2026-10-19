import { defineConfig } from '@playwright/test';

// Android エミュレータ上の Chrome（実機の Chrome）で実行する設定（#85）。
//
// 【目的】PC の Chromium ではなく、Android 実機の Chrome での「見た目」の崩れ（VRT = 画面のスクリーンショットを
//   基準画像と比べて、見た目の変化を検知するテスト）を見つける。機能は PC のブラウザのテストで確認できているため、
//   Android では、見た目の確認（VRT）を主役にして、購入フロー 1 件を「全体が動いていること」の確認として残す。
//
// テストは tests/ を共用する（tests/fixtures/test.ts が、ANDROID=1 のとき page を Android に差し替える）。
// エミュレータの起動・接続は android-test.yml が行う。
process.env.ANDROID = '1';

export default defineConfig({
  testDir: '../tests',
  // Android で実行するのは、見た目の確認（VRT）と、購入フロー 1 件（動作確認）だけ
  testMatch: ['**/saucedemo-visual-regression.spec.ts', '**/saucedemo-e2e-purchase.spec.ts'],
  workers: 1, // 端末が 1 台のため
  timeout: 60_000,
  // 外部サイト（TodoMVC 等）への接続が一時的に遅れて 1 件失敗した実績があるため、リトライを 1 回だけ許可する。
  // リトライで通ったテストは、Job Summary に flaky として表示される（見逃さない。#37）
  retries: 1,

  // 基準画像は PC 用（tests/*-snapshots/）と分け、Android 専用の置き場所（tests-android/snapshots/）に置く。
  // 例: tests-android/snapshots/saucedemo-visual-regression.spec.ts/login-page-pc-android.png
  snapshotDir: './snapshots',
  snapshotPathTemplate: '{snapshotDir}/{testFileName}/{arg}-android{ext}',

  expect: {
    timeout: 15_000,
    // 基準は PC の VRT（playwright.config.ts）と同じ。ユーザーに影響しない 1 ピクセル単位の揺れは許容する（ユーザー判断 2026-10-19）
    toHaveScreenshot: { animations: 'disabled', scale: 'css', caret: 'hide', threshold: 0.2, maxDiffPixels: 0 },
  },
  reporter: [['list'], ['html', { outputFolder: '../playwright-report-android', open: 'never' }], ['json', { outputFile: '../reports/android-results.json' }]],
});
