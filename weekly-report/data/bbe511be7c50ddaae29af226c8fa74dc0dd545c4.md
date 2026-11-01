# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saucedemo-accessibility.spec.ts >> SauceDemo Accessibility (a11y) Tests >> ログイン後の全主要ページ監査 >> P8: サイドメニュー展開時が WCAG 基準を満たしていること
- Location: tests/saucedemo-accessibility.spec.ts:105:9

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=11799
[pid=11799][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=11799
  - [pid=11799][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=11799] <gracefully close start>
  - [pid=11799] <kill>
  - [pid=11799] <will force kill>
  - [pid=11799] <process did exit: exitCode=127, signal=null>
  - [pid=11799] starting temporary directories cleanup
  - [pid=11799] finished temporary directories cleanup
  - [pid=11799] <gracefully close end>

```