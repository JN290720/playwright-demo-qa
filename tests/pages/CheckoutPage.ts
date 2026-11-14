import { Page, Locator } from '@playwright/test';

/**
 * SauceDemo のカート〜購入完了までの画面（cart / checkout-step-one / checkout-step-two / checkout-complete）を
 * 操作・検証するための Page Object クラス
 */
export class CheckoutPage {
  // Playwright の Page インスタンス（ブラウザ操作用）
  readonly page: Page;

  // カート画面
  readonly cartList: Locator;        // カート一覧の枠（商品が 0 件でも出る）
  readonly cartItems: Locator;       // カート内の商品行
  readonly cartBadge: Locator;       // カートアイコンのバッジ（件数が 0 のときは出ない）
  readonly checkoutButton: Locator;  // 「Checkout」ボタン
  readonly cancelButton: Locator;    // 「Cancel」ボタン（購入手続きの途中で、前の画面に戻る）

  // 購入情報入力画面
  readonly firstNameInput: Locator;   // 名
  readonly lastNameInput: Locator;    // 姓
  readonly postalCodeInput: Locator;  // 郵便番号
  readonly continueButton: Locator;   // 「Continue」ボタン
  readonly errorMessage: Locator;     // 入力エラーのメッセージ

  // 購入確認画面
  readonly summaryItemPrices: Locator; // 確認画面の各商品の価格
  readonly subtotalLabel: Locator;     // 小計
  readonly taxLabel: Locator;          // 税
  readonly totalLabel: Locator;        // 合計
  readonly finishButton: Locator;      // 「Finish」ボタン

  // 購入完了画面
  readonly completeHeader: Locator;    // 完了メッセージ
  readonly backHomeButton: Locator;    // 「Back Home」ボタン（商品一覧に戻る）

  /**
   * コンストラクタ：ページ上の各要素を特定するためのロケータ（セレクター）を定義
   * @param page Playwright から渡される Page オブジェクト
   */
  constructor(page: Page) {
    this.page = page;

    this.cartList = page.locator('.cart_list');
    this.cartItems = page.locator('.cart_item');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.checkoutButton = page.locator('[data-test="checkout"]');
    this.cancelButton = page.locator('[data-test="cancel"]');

    this.firstNameInput = page.locator('[data-test="firstName"]');
    this.lastNameInput = page.locator('[data-test="lastName"]');
    this.postalCodeInput = page.locator('[data-test="postalCode"]');
    this.continueButton = page.locator('[data-test="continue"]');
    this.errorMessage = page.locator('[data-test="error"]');

    this.summaryItemPrices = page.locator('.inventory_item_price');
    this.subtotalLabel = page.locator('[data-test="subtotal-label"]');
    this.taxLabel = page.locator('[data-test="tax-label"]');
    this.totalLabel = page.locator('[data-test="total-label"]');
    this.finishButton = page.locator('[data-test="finish"]');

    this.completeHeader = page.locator('[data-test="complete-header"]');
    this.backHomeButton = page.locator('[data-test="back-to-products"]');
  }

  /**
   * ブラウザの保存（localStorage の `cart-contents`）を、指定した文字列に書き換える（カートの書き換えテスト用）。
   * 書き換えたあとは、`/cart.html` を新しく開くこと（再読み込みでは、サイトが保存を書き戻すことがある）
   */
  async rewriteCartContents(raw: string) {
    await this.page.evaluate((value) => localStorage.setItem('cart-contents', value), raw);
  }

  /**
   * バッジの件数を数える（バッジが無ければ 0）。バッジの出現は待たない（呼ぶ前に、描画の完了を別の要素で待つこと）
   */
  async readBadgeCount(): Promise<number> {
    if ((await this.cartBadge.count()) === 0) return 0;
    return Number(await this.cartBadge.first().innerText());
  }

  /**
   * 購入者情報を入力して「Continue」を押す
   */
  async fillShippingInfo(firstName: string, lastName: string, postalCode: string) {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.postalCodeInput.fill(postalCode);
    await this.continueButton.click();
  }

  /**
   * 「$29.99」「Item total: $39.98」「Tax: $3.20」のような表示文字列から金額（数値）を取り出す
   */
  static parseAmount(text: string): number {
    const match = text.match(/\$([0-9]+(?:\.[0-9]+)?)/);
    if (!match) {
      throw new Error(`金額を読み取れませんでした: "${text}"`);
    }
    return parseFloat(match[1]);
  }
}
