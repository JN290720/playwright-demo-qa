import { expect } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * アクセシビリティ（a11y）の検査に使うルール。WCAG 2.1 の Level A / AA。
 * WCAG = Web Content Accessibility Guidelines。障害のある人や高齢の人でも Web を使えるようにするための国際的な基準。
 */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * axe（a11y の自動検査ツール）で現在の画面を検査し、違反が 0 件であることを確認する。
 * 違反があれば、詳細（どの要素が、どのルールに違反したか）を JSON でレポートに添付する。
 *
 * @param opts.disableRules 除外するルール。除外は、サイト側の不備が原因のものに限り、
 *   理由を docs/a11y-known-issues.md に書くこと（サイトが直っても気づけなくなるため）。
 */
export async function expectNoA11yViolations(page: Page, testInfo: TestInfo, opts: { disableRules?: string[] } = {}) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (opts.disableRules?.length) builder = builder.disableRules(opts.disableRules);
  const results = await builder.analyze();
  if (results.violations.length > 0) {
    await testInfo.attach('a11y-violations.json', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });
  }
  expect(results.violations).toEqual([]);
}
