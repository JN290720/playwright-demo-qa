# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saucedemo-product-detail-invalid-id.spec.ts >> SauceDemo 商品詳細ページ（不正な ID）検証 >> B-2: [既知の不具合] 数字で始まる ID（1.5・1<script>）で、一覧の商品を表示しないこと
- Location: tests/saucedemo-product-detail-invalid-id.spec.ts:142:7

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=15234
[pid=15234][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=15234
  - [pid=15234][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=15234] <gracefully close start>
  - [pid=15234] <kill>
  - [pid=15234] <will force kill>
  - [pid=15234] <process did exit: exitCode=127, signal=null>
  - [pid=15234] starting temporary directories cleanup
  - [pid=15234] finished temporary directories cleanup
  - [pid=15234] <gracefully close end>

```