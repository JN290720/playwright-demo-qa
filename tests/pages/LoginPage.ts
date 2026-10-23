import { Page, Locator } from '@playwright/test';
import type { Credentials } from '../fixtures/users';

/**
 * SauceDemo のログイン画面（https://www.saucedemo.com/）を操作・検証するための Page Object クラス
 */
export class LoginPage {
  // Playwright の Page インスタンス（ブラウザ操作用）
  readonly page: Page;

  // 画面上の各要素（UIパーツ）を保持するプロパティ
  readonly usernameInput: Locator; // ユーザー名入力欄
  readonly passwordInput: Locator; // パスワード入力欄
  readonly loginButton: Locator;   // ログインボタン
  readonly errorMessage: Locator;  // エラーメッセージ表示エリア
  readonly menuButton: Locator;    // 左上のハンバーガーメニューボタン（スマホ表示時など）
  readonly sideMenu: Locator;      // 開いたサイドナビゲーションメニュー
  readonly logoutLink: Locator;    // サイドメニュー内の「Logout」リンク

  /**
   * コンストラクタ：ページ上の各要素の識別子（ロケータ）を定義
   * @param page Playwright から渡される Page オブジェクト
   */
  constructor(page: Page) {
    this.page = page;

    // data-test 属性や ID、クラス名を使って各画面要素を特定する定義
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');
    this.loginButton = page.locator('[data-test="login-button"]');
    this.errorMessage = page.locator('[data-test="error"]');
    this.menuButton = page.locator('#react-burger-menu-btn');
    this.sideMenu = page.locator('.bm-menu-wrap');
    this.logoutLink = page.locator('#logout_sidebar_link');
  }

  /**
   * ログインページへ移動する
   */
  async goto() {
    await this.page.goto('/');
  }

  /**
   * 指定したユーザー名とパスワードを入力してログインを実行する一連のアクション
   * @param username ログインユーザー名
   * @param password パスワード
   */
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * ユーザー情報（tests/fixtures/users.ts の CREDENTIALS）を使ってログインする
   * @param user ユーザー名とパスワードのセット
   */
  async loginAs(user: Credentials) {
    await this.login(user.username, user.password);
  }

  /**
   * 左上のハンバーガーメニューをクリックしてサイドメニューを開く
   */
  async openSideMenu() {
    await this.menuButton.click();
  }
}