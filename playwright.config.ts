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

// 💡 テストの実行範囲（#45、ユーザー判断）: 対象のデモサイトは 1 つで、stg / prd は「テスト内容」で分ける。
//    stg = フルで検証 / prd = 必須の主要機能（@prd タグ付き）のみ。
//    各 spec に ENV_NAME のスキップ判定を書く代わりに、ここの grep で一括して絞る。
const isStaging = process.env.ENV_NAME === 'staging';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* stg（ENV=staging）は全テスト。prd（既定）は @prd タグ付きの主要機能のみ。新しいテストを prd でも動かす場合は、describe / test に { tag: '@prd' } を付ける */
  grep: isStaging ? undefined : /@prd/,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: isCI,
  /* Retry on CI only */
  retries: isCI ? 2 : 0,
  /* 💡 CIでの並列実行ワーカー数：PC＋スマホの並列処理のため 2 ワーカーを指定 */
  workers: isCI ? 4 : undefined,
  /* 💡 タイムアウト（#19、ユーザー承認済み）: 既定では actionTimeout / navigationTimeout が「無制限」で、
     ハングしても原因が分かりにくいため、明示して早く失敗させます。 */
  timeout: 30_000, // テスト 1 件の上限（既定値を明示）
  globalTimeout: isCI ? 10 * 60_000 : undefined, // CI 全体の上限（通常 約 2〜4 分の 2.5 倍以上）。Playwright 側で止まった場所をレポートに残して終了する
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  /* 💡 VRT（スクリーンショット比較）の共通設定。各 spec へ複製せず、ここに集約します（#23）。
     【方針（ユーザー判断 #23）】静的な要素は「完全一致」を前提とし、見える差異はテスト失敗として、ユーザーに知らせます。
       ・maxDiffPixels: 0 … 色の差が閾値を超えたピクセルを 1 つも許容しない（ピクセル数での許容はしない）
       ・threshold: 0.2 … **ピクセル単位の完全一致（0）は、現実には安定しない**ため、Playwright の既定値を明示します。
         ＜実測（#23、PR #68 の CI）＞ threshold: 0 にすると、文字のアンチエイリアスに由来する極小の差（62〜252 ピクセル、
         最大の色差 約 50/255）で、24 件中 3 画面が失敗した（リトライしても毎回）。
         一方、本物の UI 変更（本体 PR #49 のサイトのアイコン変更）は **620 ピクセル・最大の色差 220** で、既定値でも確実に検知できる。
         = 0.2 は、「描画ノイズ」と「見える変更」を分ける閾値として機能している。
     【動的な要素】日時・ランダム値など、実行ごとに変わる要素は「無視」する（mask で個別に隠し、理由をコメントに残す）。現状は該当なし。 */
  expect: {
    timeout: 10_000, // expect の自動待機の上限（既定 5 秒）。外部サイトの描画と、スクリーンショット比較を考慮して延ばす（#19）
    toHaveScreenshot: {
      animations: 'disabled', // CSS アニメーション・トランジションを停止して揺れを防ぐ（既定値と同じ）
      scale: 'css',           // デバイスピクセル比に依らず CSS ピクセルで比較する（既定値と同じ）
      caret: 'hide',          // 入力欄のカーソルの点滅を隠す（既定値と同じ）
      threshold: 0.2,         // 色の差の閾値（既定値。文字のアンチエイリアス程度の差は許容し、見える変更は検知する）
      maxDiffPixels: 0,       // 閾値を超えたピクセルは 1 つも許容しない（既定値。ピクセル数で緩めない）
    },
  },

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* 💡 対象サイトは 1 つ（SauceDemo）で、環境ごとに変えない（#45）。環境変数では上書きしない。テストは相対パス（/inventory.html など）で書く */
    baseURL: 'https://www.saucedemo.com',

    /* 💡 操作・ページ遷移のタイムアウト（既定は無制限）。外部サイトの遅延を考慮し、遷移は操作より長くする */
    actionTimeout: 10_000,
    navigationTimeout: 20_000,

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