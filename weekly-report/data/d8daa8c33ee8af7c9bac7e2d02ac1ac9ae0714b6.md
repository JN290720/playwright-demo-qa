# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saucedemo-inventory-cart.spec.ts >> SauceDemo 商品一覧（ソート）とカート操作 >> ソート: 名前（Z → A） で商品名が正しく並び変わること
- Location: tests/saucedemo-inventory-cart.spec.ts:22:9

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=13830
[pid=13830][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=13830
  - [pid=13830][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=13830] <gracefully close start>
  - [pid=13830] <kill>
  - [pid=13830] <will force kill>
  - [pid=13830] <process did exit: exitCode=127, signal=null>
  - [pid=13830] starting temporary directories cleanup
  - [pid=13830] finished temporary directories cleanup
  - [pid=13830] <gracefully close end>

```