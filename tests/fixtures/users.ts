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
} as const satisfies Record<string, Credentials>;

/** 購入手続き（チェックアウト）で入力する購入者情報 */
export const SHIPPING_INFO = {
  firstName: 'Taro',
  lastName: 'Yamada',
  postalCode: '123-4567',
} as const;
