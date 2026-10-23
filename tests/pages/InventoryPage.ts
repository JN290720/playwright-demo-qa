import { Page, Locator } from '@playwright/test';

/**
 * SauceDemo の商品一覧・カート画面（https://www.saucedemo.com/inventory.html）を操作・検証するための Page Object クラス
 */
export class InventoryPage {
  // Playwright の Page インスタンス（ブラウザ操作用）
  readonly page: Page;

  // 画面上の主要な UI パーツ（要素）を保持するプロパティ宣言
  readonly title: Locator;             // 画面ヘッダータイトルの「Products」テキスト
  readonly productItems: Locator;      // 画面上に並んでいる商品カード要素一覧
  readonly sortDropdown: Locator;      // 商品並び替え（ソート）セレクトボックス
  readonly cartBadge: Locator;         // カートアイコン右上にある購入件数の赤いバッジ
  readonly cartLink: Locator;          // ショッピングカートアイコンのリンク
  readonly itemNames: Locator;         // 商品名の一覧（並び順の検証に使用）
  readonly itemPrices: Locator;        // 商品価格の一覧（並び順の検証に使用）
  readonly itemButtons: Locator;       // 各商品の「Add to cart / Remove」ボタンの一覧（カートの状態の検証に使用）

  /**
   * コンストラクタ：ページ上の各要素を特定するためのロケータ（セレクター）を定義
   * @param page Playwright から渡される Page オブジェクト
   */
  constructor(page: Page) {
    this.page = page;

    // クラス名や data-test 属性を使って各画面要素を特定する定義
    this.title = page.locator('.title');
    this.productItems = page.locator('.inventory_item');
    this.sortDropdown = page.locator('[data-test="product-sort-container"]');
    this.cartBadge = page.locator('.shopping_cart_badge');
    this.cartLink = page.locator('.shopping_cart_link');
    this.itemNames = page.locator('.inventory_item_name');
    this.itemPrices = page.locator('.inventory_item_price');
    this.itemButtons = page.locator('.inventory_item button');
  }

  /**
   * 商品一覧ページへ直接アクセスする（ログイン済みセッション等を想定）
   */
  async goto() {
    await this.page.goto('/inventory.html');
  }

  /**
   * 指定した商品の「Add to cart（カートに追加）」ボタンをクリックする
   * @param itemDataTest 例: 'add-to-cart-sauce-labs-backpack' などの data-test 識別子
   */
  async addItemToCart(itemDataTest: string) {
    await this.dataTestLocator(itemDataTest).click();
  }

  /**
   * 指定した data-test 属性の要素（商品のボタン・商品名のリンクなど）を返す
   * @param dataTest 例: 'add-to-cart-sauce-labs-backpack' / 'remove-sauce-labs-backpack' / 'item-4-title-link'
   */
  dataTestLocator(dataTest: string): Locator {
    return this.page.locator(`[data-test="${dataTest}"]`);
  }

  /**
   * 商品名のリンクをクリックして、商品詳細ページを開く
   * @param itemTitleLinkDataTest 例: 'item-4-title-link'
   */
  async openItemDetail(itemTitleLinkDataTest: string) {
    await this.dataTestLocator(itemTitleLinkDataTest).click();
  }

  /**
   * 商品名のリンクの data-test で特定される、一覧の 1 商品の行を返す
   * @param itemTitleLinkDataTest 例: 'item-4-title-link'
   */
  productRow(itemTitleLinkDataTest: string): Locator {
    return this.productItems.filter({ has: this.dataTestLocator(itemTitleLinkDataTest) });
  }

  /**
   * 一覧の 1 商品の、商品名・価格・説明の表示を返す（詳細ページの表示と比べるための値）
   * @param itemTitleLinkDataTest 例: 'item-4-title-link'
   */
  productInfo(itemTitleLinkDataTest: string) {
    const row = this.productRow(itemTitleLinkDataTest);
    return {
      name: row.locator('.inventory_item_name'),
      price: row.locator('.inventory_item_price'),
      description: row.locator('.inventory_item_desc'),
    };
  }

  /**
   * 商品の並び順（ソート）を変更する
   * @param option 'az' (AtoZ) | 'za' (ZtoA) | 'lohi' (価格の安い順) | 'hilo' (価格の高い順)
   */
  async selectSortOption(option: string) {
    await this.sortDropdown.selectOption(option);
  }
}