import { Page, Locator } from '@playwright/test';

/**
 * SauceDemo の商品詳細ページ（一覧の商品名をクリックした先の画面）を操作・検証するための Page Object クラス
 * 💡 一覧と詳細で data-test が重複するものがあるため、詳細ページ専用のクラス（inventory_details_*）で特定する
 */
export class ProductDetailPage {
  // Playwright の Page インスタンス（ブラウザ操作用）
  readonly page: Page;

  // 画面上の主要な UI パーツ（要素）を保持するプロパティ宣言
  readonly container: Locator;        // 商品詳細の枠（表示されているかの確認に使用）
  readonly name: Locator;             // 商品名
  readonly price: Locator;            // 価格
  readonly image: Locator;            // 商品画像（alt 属性の確認に使用）
  readonly addToCartButton: Locator;  // 「Add to cart（カートに追加）」ボタン

  /**
   * コンストラクタ：ページ上の各要素を特定するためのロケータ（セレクター）を定義
   * @param page Playwright から渡される Page オブジェクト
   */
  constructor(page: Page) {
    this.page = page;

    this.container = page.locator('.inventory_details_container');
    this.name = page.locator('.inventory_details_name');
    this.price = page.locator('.inventory_details_price');
    this.image = page.locator('img.inventory_details_img');
    this.addToCartButton = page.locator('[data-test="add-to-cart"]');
  }
}
