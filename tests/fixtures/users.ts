/**
 * テストで使うユーザー情報・入力データを一か所に集約する（#18）。
 *
 * SauceDemo（https://www.saucedemo.com）が公開しているデモ用のユーザーで、機微な情報ではない。
 * 他のサイトへ適用する場合や、値が変わった場合に、ここだけを直せばよいようにしている。
 * 機微な値（実運用のパスワードなど）は、ここに書かず、GitHub Secrets から環境変数で渡すこと。
 */

/** 全ユーザー共通のパスワード（デモサイトの公開値）。環境変数 SAUCEDEMO_PASSWORD で上書きできる */
const PASSWORD = process.env.SAUCEDEMO_PASSWORD ?? 'secret_sauce';

export type Credentials = { username: string; password: string };

export const CREDENTIALS = {
  /** 通常のユーザー（正常系の既定） */
  standard: { username: 'standard_user', password: PASSWORD },
  /** ロックアウトされたユーザー（ログインできない） */
  lockedOut: { username: 'locked_out_user', password: PASSWORD },
  /** 存在しないユーザー（認証失敗の確認用） */
  invalid: { username: 'invalid_user', password: 'wrong_password' },
  /** 意図的に遅延が入るユーザー（ログインに約 5 秒かかる。タイムアウトの妥当性の確認用） */
  performanceGlitch: { username: 'performance_glitch_user', password: PASSWORD },
  /** 意図的に不具合があるユーザー（画像が全て同じ・並び替えが効かない・一部のボタンが効かない・入力が別の欄に入る） */
  problem: { username: 'problem_user', password: PASSWORD },
  /** 操作時にエラーが起きるユーザー（並び替え・一部のカート追加・購入の完了が失敗する） */
  error: { username: 'error_user', password: PASSWORD },
  /** 見た目が崩れるユーザー（価格が標準と異なる値になる等。VRT の確認用） */
  visual: { username: 'visual_user', password: PASSWORD },
} as const satisfies Record<string, Credentials>;

/** 標準ユーザーに表示される、商品ごとの価格（円ではなくドル）。特殊ユーザーとの比較に使う */
export const STANDARD_PRICES = {
  'Sauce Labs Backpack': 29.99,
  'Sauce Labs Bike Light': 9.99,
  'Sauce Labs Bolt T-Shirt': 15.99,
  'Sauce Labs Fleece Jacket': 49.99,
  'Sauce Labs Onesie': 7.99,
  'Test.allTheThings() T-Shirt (Red)': 15.99,
} as const;

/** 購入手続き（チェックアウト）で入力する購入者情報 */
export const SHIPPING_INFO = {
  firstName: 'Taro',
  lastName: 'Yamada',
  postalCode: '123-4567',
} as const;
