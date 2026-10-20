import { Page, Locator } from '@playwright/test';

/**
 * SauceDemo のカート〜購入完了までの画面（cart / checkout-step-one / checkout-step-two / checkout-complete）を
 * 操作・検証するための Page Object クラス
 */
export class CheckoutPage {
  // Playwright の Page インスタンス（ブラウザ操作用）
  readonly page: Page;

  // カート画面
  readonly cartItems: Locator;       // カート内の商品行
  readonly checkoutButton: Locator;  // 「Checkout」ボタン

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

  /**
   * コンストラクタ：ページ上の各要素を特定するためのロケータ（セレクター）を定義
   * @param page Playwright から渡される Page オブジェクト
   */
  constructor(page: Page) {
    this.page = page;

    this.cartItems = page.locator('.cart_item');
    this.checkoutButton = page.locator('[data-test="checkout"]');

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
