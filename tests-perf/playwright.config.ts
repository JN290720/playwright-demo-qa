import { defineConfig, devices } from '@playwright/test';

// 性能（表示速度）の記録の設定（#136）。
//
// 【目的】外部の公開サイトの表示速度の推移を、後から見られるように、**記録だけ**を行う（ユーザー判断: 失敗にはしない）。
//   サイトは外部のもので、こちらでは改善できず、通信の状況で数値がぶれる。しきい値を設けて失敗にすると、不安定なテスト（flaky）が増えるだけのため。
//   本体 playwright-demo（自分たちのアプリ）に適用する段階で、しきい値つきのテストにするかを、あらためて検討する。
//
// - PR のテストには含めない（週次の全テストの「Record performance」ステップだけが、この設定で実行する）
// - ブラウザは PC の Chrome のみ（通信状況でぶれるため、複数ブラウザで記録しても、比較しにくい）
// - 同じ測定を複数回行い、中央値・最小・最大を記録する（1 回の値は、ぶれが大きい）
export default defineConfig({
  testDir: '.',
  workers: 1,
  retries: 0,
  // 💡 「失敗にしない」を守るための、長い待ち時間（レビューエージェントの指摘）: 既定の expect の待ち時間（5 秒）のままだと、
  //    遅い回で待ちきれず、そのテストが失敗し、**遅い回の値が記録されない**（実質のしきい値になる）。遅くても、測り切れるようにする
  timeout: 300_000,
  expect: { timeout: 120_000 },
  reporter: [['list']],
  projects: [{ name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], baseURL: 'https://www.saucedemo.com' } }], // 相対パス（pages の goto）の基準（#45）
});
