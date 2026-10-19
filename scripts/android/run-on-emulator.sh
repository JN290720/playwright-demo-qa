#!/usr/bin/env bash
# エミュレータ起動後に実行する（android-emulator-runner の script から呼ぶ）。#85 の調査用。
# まず環境の事実（Chrome の有無・root 可否）を出力し、その後で Playwright のテストを試す。
set -u
echo "== device =="
adb devices
echo "ro.build.type=$(adb shell getprop ro.build.type | tr -d '\r')  ro.debuggable=$(adb shell getprop ro.debuggable | tr -d '\r')  sdk=$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
echo "== chrome / webview packages =="
adb shell pm list packages | grep -Ei 'chrome|webview' || echo "(none)"
adb shell dumpsys package com.android.chrome | grep -m1 versionName || echo "chrome: not installed"
echo "== adb root =="
adb root || true
sleep 3
adb wait-for-device
adb shell id | tr -d '\r'

if ! adb shell pm list packages | grep -q com.android.chrome; then
  echo "::warning::このイメージには Chrome が入っていません。テストは実行しません"
  exit 0
fi

# Chrome の初回起動ダイアログが出ないようにする
adb shell 'settings put global window_animation_scale 0; settings put global transition_animation_scale 0; settings put global animator_duration_scale 0'

echo "== playwright test =="
# REPEAT: 同じテストを繰り返して、安定性（flaky の有無）を確認する
UPDATE_ARG=""
if [ "${UPDATE_SNAPSHOTS:-0}" = "1" ]; then UPDATE_ARG="--update-snapshots=all"; echo "基準画像を撮り直します（--update-snapshots）"; fi
timeout 900 npx playwright test -c tests-android/playwright.config.ts --repeat-each="${REPEAT:-1}" $UPDATE_ARG
code=$?
echo "playwright exit code: $code"
echo "== screen at the end =="
adb shell dumpsys window | grep -m1 mCurrentFocus || true
adb exec-out screencap -p > android-final-screen.png || true
exit $code
