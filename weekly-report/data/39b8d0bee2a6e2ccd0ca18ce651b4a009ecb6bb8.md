# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saucedemo-cart-checkout.spec.ts >> カート・購入手続きの異常系・やり直し >> C4: ページを再読み込みしても、カートの中身（バッジと「Remove」の表示）が保たれること
- Location: tests/saucedemo-cart-checkout.spec.ts:73:7

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=12744
[pid=12744][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=12744
  - [pid=12744][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=12744] <gracefully close start>
  - [pid=12744] <kill>
  - [pid=12744] <will force kill>
  - [pid=12744] exception while trying to kill process: Error: kill ESRCH
  - [pid=12744] <process did exit: exitCode=127, signal=null>
  - [pid=12744] starting temporary directories cleanup
  - [pid=12744] finished temporary directories cleanup
  - [pid=12744] <gracefully close end>

```