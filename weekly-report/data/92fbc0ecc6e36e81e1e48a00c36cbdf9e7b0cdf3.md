# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: saucedemo-network-mocking.spec.ts >> SauceDemo Network Mocking & Resilience Tests >> P5: 外部サイトのリソース（Google Fonts など）が読み込めなくても、主要な操作が行えること
- Location: tests/saucedemo-network-mocking.spec.ts:117:7

# Error details

```
Error: browserType.launch: Target page, context or browser has been closed
Browser logs:

<launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
<launched> pid=14642
[pid=14642][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
Call log:
  - <launching> /home/runner/.cache/ms-playwright/webkit-2359/pw_run.sh --inspector-pipe --headless --no-startup-window
  - <launched> pid=14642
  - [pid=14642][err] /home/runner/.cache/ms-playwright/webkit-2359/minibrowser-wpe/bin/MiniBrowser: error while loading shared libraries: libicudata.so.74: cannot open shared object file: No such file or directory
  - [pid=14642] <gracefully close start>
  - [pid=14642] <kill>
  - [pid=14642] <will force kill>
  - [pid=14642] <process did exit: exitCode=127, signal=null>
  - [pid=14642] starting temporary directories cleanup
  - [pid=14642] finished temporary directories cleanup
  - [pid=14642] <gracefully close end>

```