# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saucedemo-user-types.spec.ts >> ユーザー種別: problem_user（意図的な不具合） >> [既知の不具合] 「価格の安い順」で並び替えられること
- Location: tests/saucedemo-user-types.spec.ts:49:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 3
+ Received  + 3

  Array [
-   7.99,
+   29.99,
    9.99,
-   15.99,
    15.99,
-   29.99,
    49.99,
+   7.99,
+   15.99,
  ]
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - banner [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - button "Open Menu" [ref=e8] [cursor=pointer]
          - img "Open Menu" [ref=e9]
        - generic [ref=e10]: Swag Labs
        - button "Cart, empty" [ref=e13]
      - generic [ref=e14]:
        - generic [ref=e15]: Products
        - combobox "Sort products" [ref=e18]:
          - option "Name (A to Z)" [selected]
          - option "Name (Z to A)"
          - option "Price (low to high)"
          - option "Price (high to low)"
    - main [ref=e19]:
      - generic [ref=e22]:
        - generic [ref=e23]:
          - button "View details for Sauce Labs Backpack" [ref=e25] [cursor=pointer]:
            - img "Sauce Labs Backpack" [ref=e26]
          - generic [ref=e27]:
            - generic [ref=e28]:
              - button "View details for Sauce Labs Backpack" [ref=e29] [cursor=pointer]:
                - generic [ref=e30]: Sauce Labs Backpack
              - generic [ref=e31]: carry.allTheThings() with the sleek, streamlined Sly Pack that melds uncompromising style with unequaled laptop and tablet protection.
            - generic [ref=e32]:
              - generic [ref=e33]: $29.99
              - button "Add to cart" [ref=e34] [cursor=pointer]
        - generic [ref=e35]:
          - button "View details for Sauce Labs Bike Light" [ref=e37] [cursor=pointer]:
            - img "Sauce Labs Bike Light" [ref=e38]
          - generic [ref=e39]:
            - generic [ref=e40]:
              - button "View details for Sauce Labs Bike Light" [ref=e41] [cursor=pointer]:
                - generic [ref=e42]: Sauce Labs Bike Light
              - generic [ref=e43]: A red light isn't the desired state in testing but it sure helps when riding your bike at night. Water-resistant with 3 lighting modes, 1 AAA battery included.
            - generic [ref=e44]:
              - generic [ref=e45]: $9.99
              - button "Add to cart" [ref=e46] [cursor=pointer]
        - generic [ref=e47]:
          - button "View details for Sauce Labs Bolt T-Shirt" [ref=e49] [cursor=pointer]:
            - img "Sauce Labs Bolt T-Shirt" [ref=e50]
          - generic [ref=e51]:
            - generic [ref=e52]:
              - button "View details for Sauce Labs Bolt T-Shirt" [ref=e53] [cursor=pointer]:
                - generic [ref=e54]: Sauce Labs Bolt T-Shirt
              - generic [ref=e55]: Get your testing superhero on with the Sauce Labs bolt T-shirt. From American Apparel, 100% ringspun combed cotton, heather gray with red bolt.
            - generic [ref=e56]:
              - generic [ref=e57]: $15.99
              - button "Add to cart" [ref=e58] [cursor=pointer]
        - generic [ref=e59]:
          - button "View details for Sauce Labs Fleece Jacket" [ref=e61] [cursor=pointer]:
            - img "Sauce Labs Fleece Jacket" [ref=e62]
          - generic [ref=e63]:
            - generic [ref=e64]:
              - button "View details for Sauce Labs Fleece Jacket" [ref=e65] [cursor=pointer]:
                - generic [ref=e66]: Sauce Labs Fleece Jacket
              - generic [ref=e67]: It's not every day that you come across a midweight quarter-zip fleece jacket capable of handling everything from a relaxing day outdoors to a busy day at the office.
            - generic [ref=e68]:
              - generic [ref=e69]: $49.99
              - button "Add to cart" [ref=e70] [cursor=pointer]
        - generic [ref=e71]:
          - button "View details for Sauce Labs Onesie" [ref=e73] [cursor=pointer]:
            - img "Sauce Labs Onesie" [ref=e74]
          - generic [ref=e75]:
            - generic [ref=e76]:
              - button "View details for Sauce Labs Onesie" [ref=e77] [cursor=pointer]:
                - generic [ref=e78]: Sauce Labs Onesie
              - generic [ref=e79]: Rib snap infant onesie for the junior automation engineer in development. Reinforced 3-snap bottom closure, two-needle hemmed sleeved and bottom won't unravel.
            - generic [ref=e80]:
              - generic [ref=e81]: $7.99
              - button "Add to cart" [ref=e82] [cursor=pointer]
        - generic [ref=e83]:
          - button "View details for Test.allTheThings() T-Shirt (Red)" [ref=e85] [cursor=pointer]:
            - img "Test.allTheThings() T-Shirt (Red)" [ref=e86]
          - generic [ref=e87]:
            - generic [ref=e88]:
              - button "View details for Test.allTheThings() T-Shirt (Red)" [ref=e89] [cursor=pointer]:
                - generic [ref=e90]: Test.allTheThings() T-Shirt (Red)
              - generic [ref=e91]: This classic Sauce Labs t-shirt is perfect to wear when cozying up to your keyboard to automate a few tests. Super-soft and comfy ringspun combed cotton.
            - generic [ref=e92]:
              - generic [ref=e93]: $15.99
              - button "Add to cart" [ref=e94] [cursor=pointer]
  - contentinfo [ref=e95]:
    - list [ref=e96]:
      - listitem [ref=e97]:
        - link "X" [ref=e98] [cursor=pointer]:
          - /url: https://x.com/saucelabs
      - listitem [ref=e99]:
        - link "Facebook" [ref=e100] [cursor=pointer]:
          - /url: https://www.facebook.com/saucelabs
      - listitem [ref=e101]:
        - link "LinkedIn" [ref=e102] [cursor=pointer]:
          - /url: https://www.linkedin.com/company/sauce-labs/
    - generic [ref=e103]: © 2026 Sauce Labs. All Rights Reserved. Terms of Service | Privacy Policy
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { CheckoutPage } from './pages/CheckoutPage';
  3   | import { loginAndShowInventory } from './helpers/login';
  4   | import { CREDENTIALS, SHIPPING_INFO, STANDARD_PRICES } from './fixtures/users';
  5   | import { TIMEOUTS } from './helpers/timeouts';
  6   | 
  7   | /**
  8   |  * ユーザー種別ごとの挙動のテスト（#15）。
  9   |  *
  10  |  * SauceDemo には、標準ユーザー以外に、意図的に遅延や不具合を再現するユーザーが用意されている。
  11  |  * - performance_glitch_user: ログインに遅延がある（それでも使えること）
  12  |  * - problem_user / error_user / visual_user: 不具合がある（下の「既知の不具合」）
  13  |  *
  14  |  * 💡 既知の不具合の扱い（ユーザー判断 #15）:
  15  |  *   「正しい挙動」を期待するテストを書き、test.fail()（= 失敗することを期待する）を付ける。
  16  |  *   - 今は不具合があるので、テストは「失敗」し、期待どおりとして成功扱いになる（CI は赤くならない）
  17  |  *   - サイトが直って成功すると、テストが失敗して気づける → その時は test.fail() を外す
  18  |  *   一覧と確認日は docs/known-site-issues.md を参照。
  19  |  */
  20  | 
  21  | // ログイン後、一覧の表示を待つ時間。遅延があるユーザー（performance_glitch_user）に合わせ、全ユーザーで共通にしている
  22  | const INVENTORY_TIMEOUT = { timeout: TIMEOUTS.SLOW_USER };
  23  | 
  24  | test.describe('ユーザー種別: performance_glitch_user（遅延がある）', () => {
  25  |   test('ログインに遅延があっても、ログインでき、購入完了まで行えること', async ({ page }) => {
  26  |     // ログインに約 5 秒かかる。テストのタイムアウト（30 秒）の範囲で完了できること（タイムアウトの妥当性の確認）
  27  |     const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.performanceGlitch, INVENTORY_TIMEOUT);
  28  | 
  29  |     await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
  30  |     await expect(inventoryPage.cartBadge).toHaveText('1');
  31  |     await inventoryPage.cartLink.click();
  32  | 
  33  |     const checkoutPage = new CheckoutPage(page);
  34  |     await checkoutPage.checkoutButton.click();
  35  |     await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
  36  |     await checkoutPage.finishButton.click();
  37  |     await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
  38  |   });
  39  | });
  40  | 
  41  | test.describe('ユーザー種別: problem_user（意図的な不具合）', () => {
  42  |   test('[既知の不具合] 商品画像が、商品ごとに異なること', async ({ page }) => {
  43  |     test.fail(true, 'problem_user は、全商品の画像が同じになる（docs/known-site-issues.md）');
  44  |     await loginAndShowInventory(page, CREDENTIALS.problem, INVENTORY_TIMEOUT);
  45  |     const sources = await page.locator('.inventory_item_img img').evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')));
  46  |     expect(new Set(sources).size).toBe(sources.length);
  47  |   });
  48  | 
  49  |   test('[既知の不具合] 「価格の安い順」で並び替えられること', async ({ page }) => {
  50  |     test.fail(true, 'problem_user は、並び替えが効かない（docs/known-site-issues.md）');
  51  |     const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.problem, INVENTORY_TIMEOUT);
  52  |     await inventoryPage.selectSortOption('lohi');
  53  |     const prices = (await inventoryPage.itemPrices.allTextContents()).map((text) => parseFloat(text.replace('$', '')));
> 54  |     expect(prices).toEqual([...prices].sort((a, b) => a - b));
      |                    ^ Error: expect(received).toEqual(expected) // deep equality
  55  |   });
  56  | 
  57  |   test('[既知の不具合] 6 件すべてを、カートに入れられること', async ({ page }) => {
  58  |     test.fail(true, 'problem_user は、一部の商品の「Add to cart」が効かない（docs/known-site-issues.md）');
  59  |     const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.problem, INVENTORY_TIMEOUT);
  60  |     const buttons = page.locator('[data-test^="add-to-cart"]');
  61  |     const count = await buttons.count();
  62  |     for (let i = 0; i < count; i++) {
  63  |       await buttons.nth(0).click(); // 押すたびに、次の「Add to cart」が先頭に来る（押せたものは Remove に変わる）
  64  |     }
  65  |     await expect(inventoryPage.cartBadge).toHaveText(String(count));
  66  |   });
  67  | 
  68  |   test('[既知の不具合] 購入者情報の「姓」の入力が、姓の欄に保持されること', async ({ page }) => {
  69  |     test.fail(true, 'problem_user は、姓の入力が名の欄に入る（docs/known-site-issues.md）');
  70  |     const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.problem, INVENTORY_TIMEOUT);
  71  |     await inventoryPage.cartLink.click();
  72  |     const checkoutPage = new CheckoutPage(page);
  73  |     await checkoutPage.checkoutButton.click();
  74  |     await checkoutPage.firstNameInput.fill(SHIPPING_INFO.firstName);
  75  |     await checkoutPage.lastNameInput.fill(SHIPPING_INFO.lastName);
  76  |     await expect(checkoutPage.lastNameInput).toHaveValue(SHIPPING_INFO.lastName);
  77  |   });
  78  | });
  79  | 
  80  | test.describe('ユーザー種別: error_user（操作時にエラーが起きる）', () => {
  81  |   test('[既知の不具合] 「価格の安い順」で並び替えられること', async ({ page }) => {
  82  |     test.fail(true, 'error_user は、並び替えが効かない（docs/known-site-issues.md）');
  83  |     const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.error, INVENTORY_TIMEOUT);
  84  |     await inventoryPage.selectSortOption('lohi');
  85  |     const prices = (await inventoryPage.itemPrices.allTextContents()).map((text) => parseFloat(text.replace('$', '')));
  86  |     expect(prices).toEqual([...prices].sort((a, b) => a - b));
  87  |   });
  88  | 
  89  |   test('[既知の不具合] 6 件すべてを、カートに入れられること', async ({ page }) => {
  90  |     test.fail(true, 'error_user は、一部の商品の「Add to cart」が効かない（docs/known-site-issues.md）');
  91  |     const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.error, INVENTORY_TIMEOUT);
  92  |     const buttons = page.locator('[data-test^="add-to-cart"]');
  93  |     const count = await buttons.count();
  94  |     for (let i = 0; i < count; i++) {
  95  |       await buttons.nth(0).click();
  96  |     }
  97  |     await expect(inventoryPage.cartBadge).toHaveText(String(count));
  98  |   });
  99  | 
  100 |   test('[既知の不具合] 購入を完了できること', async ({ page }) => {
  101 |     test.fail(true, 'error_user は、購入情報の入力・確定でエラーになり、完了できない（docs/known-site-issues.md）');
  102 |     const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.error, INVENTORY_TIMEOUT);
  103 |     await inventoryPage.addItemToCart('add-to-cart-sauce-labs-backpack');
  104 |     await inventoryPage.cartLink.click();
  105 |     const checkoutPage = new CheckoutPage(page);
  106 |     await checkoutPage.checkoutButton.click();
  107 |     await checkoutPage.fillShippingInfo(SHIPPING_INFO.firstName, SHIPPING_INFO.lastName, SHIPPING_INFO.postalCode);
  108 |     await checkoutPage.finishButton.click();
  109 |     await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!', { timeout: TIMEOUTS.PASS });
  110 |   });
  111 | });
  112 | 
  113 | test.describe('ユーザー種別: visual_user（見た目・表示が崩れる）', () => {
  114 |   test('[既知の不具合] 商品の価格が、標準ユーザーと同じであること', async ({ page }) => {
  115 |     test.fail(true, 'visual_user は、価格が標準と異なる値で表示される（docs/known-site-issues.md）');
  116 |     const { inventoryPage } = await loginAndShowInventory(page, CREDENTIALS.visual, INVENTORY_TIMEOUT);
  117 |     const names = await inventoryPage.itemNames.allTextContents();
  118 |     const prices = (await inventoryPage.itemPrices.allTextContents()).map((text) => parseFloat(text.replace('$', '')));
  119 |     const actual = Object.fromEntries(names.map((name, i) => [name, prices[i]]));
  120 |     expect(actual).toEqual(STANDARD_PRICES);
  121 |   });
  122 | });
  123 | 
```