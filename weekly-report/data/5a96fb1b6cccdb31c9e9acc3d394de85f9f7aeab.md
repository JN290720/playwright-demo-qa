# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saucedemo-accessibility.spec.ts >> SauceDemo Accessibility (a11y) Tests >> キーボード操作 >> K2: ログイン画面で、パスワード入力欄で Enter を押すと送信できること
- Location: tests/saucedemo-accessibility.spec.ts:166:9

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=12137
[pid=12137][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=12137
  - [pid=12137][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=12137] <gracefully close start>
  - [pid=12137] <kill>
  - [pid=12137] <will force kill>
  - [pid=12137] <process did exit: exitCode=127, signal=null>
  - [pid=12137] starting temporary directories cleanup
  - [pid=12137] finished temporary directories cleanup
  - [pid=12137] <gracefully close end>

```