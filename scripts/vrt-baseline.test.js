// scripts/vrt-baseline.js の単体テスト（ネットワークなし。fetch は差し替える）。実行: node --test scripts/
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const v = require('./vrt-baseline.js');

const SNAP = 'tests/sample.spec.ts-snapshots';
const makeRoot = (files = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vrt-baseline-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), content);
  }
  return root;
};
const ENV = { R2_ENDPOINT: 'https://example.invalid', R2_ACCESS_KEY_ID: 'AKID', R2_SECRET_ACCESS_KEY: 'SECRET' };

// 偽のストレージ（メモリ上）。呼ばれた回数を記録する
const fakeFetch = (store = new Map()) => {
  const calls = [];
  const impl = async (url, init) => {
    const key = new URL(url).pathname.replace(/^\/[^/]+\//, '');
    calls.push(`${init.method} ${key}`);
    if (init.method === 'HEAD') return { status: store.has(key) ? 200 : 404 };
    if (init.method === 'PUT') { store.set(key, Buffer.from(init.body)); return { status: 200 }; }
    if (init.method === 'GET') {
      return store.has(key) ? { status: 200, arrayBuffer: async () => store.get(key) } : { status: 404 };
    }
    return { status: 405 };
  };
  return { impl, calls, store };
};
const logger = () => { const lines = []; return { log: (m) => lines.push(m), lines }; };

test('署名 V4: AWS 公式ドキュメントの例（GET Object）と同じ署名になる', () => {
  const r = v.signV4({
    method: 'GET',
    pathname: '/test.txt',
    headers: {
      Host: 'examplebucket.s3.amazonaws.com',
      Range: 'bytes=0-9',
      'x-amz-content-sha256': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'x-amz-date': '20130524T000000Z',
    },
    payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    amzDate: '20130524T000000Z',
    region: 'us-east-1',
  });
  assert.equal(r.signature, 'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
});

test('ハッシュ: sha256 の既知の値', () => {
  assert.equal(v.sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(v.objectKey('a'.repeat(64)), `sha256/${'a'.repeat(64)}.png`);
});

test('対象の画像: *-snapshots の *-linux.png だけ（win32・Android・ほかの場所は対象外）', () => {
  const root = makeRoot({
    [`${SNAP}/a-linux.png`]: 'a',
    [`${SNAP}/b-win32.png`]: 'b',
    'tests/other/c-linux.png': 'c',
    'tests-android/snapshots/x.spec.ts/d-linux.png': 'd',
  });
  assert.deepEqual(v.scanImages(root), [`${SNAP}/a-linux.png`]);
});

test('一覧の差分: 手元に無い・手元が違う・一致・一覧に無い', () => {
  const d = v.diffManifest({ a: '1', b: '2', c: '3' }, { b: '2', c: 'x', d: '4' });
  assert.deepEqual(d, { missing: ['a'], different: ['c'], same: ['b'], untracked: ['d'] });
});

test('一覧の検査: 対象外のパス・不正なハッシュ・形式違いを拒否する', () => {
  const ok = `${SNAP}/a-linux.png`;
  const h = 'a'.repeat(64);
  assert.doesNotThrow(() => v.validateManifest({ version: 1, images: { [ok]: h } }));
  assert.throws(() => v.validateManifest({ version: 1, images: { '../evil-linux.png': h } }), /対象外のパス/);
  assert.throws(() => v.validateManifest({ version: 1, images: { 'tests/../x-snapshots/a-linux.png': h } }), /対象外のパス/);
  assert.throws(() => v.validateManifest({ version: 1, images: { [ok]: 'zz' } }), /不正なハッシュ/);
  assert.throws(() => v.validateManifest({ version: 2, images: {} }), /形式/);
});

test('push --dry-run: ストレージにも一覧にも書かない（設定ありでも HEAD のみ）', async () => {
  const root = makeRoot({ [`${SNAP}/a-linux.png`]: 'A' });
  const f = fakeFetch(); const l = logger();
  const code = await v.run(['push', '--dry-run'], { root, env: ENV, fetchImpl: f.impl, log: l.log });
  assert.equal(code, 0);
  assert.deepEqual(f.calls.filter((c) => !c.startsWith('HEAD')), []);
  assert.equal(f.store.size, 0);
  assert.equal(fs.existsSync(path.join(root, v.MANIFEST_NAME)), false);
});

test('push --dry-run: 設定が無くても成功する（存在確認はしない）', async () => {
  const root = makeRoot({ [`${SNAP}/a-linux.png`]: 'A' });
  const f = fakeFetch(); const l = logger();
  assert.equal(await v.run(['push', '--dry-run'], { root, env: {}, fetchImpl: f.impl, log: l.log }), 0);
  assert.equal(f.calls.length, 0);
});

test('push: 設定が無ければ失敗する', async () => {
  const root = makeRoot({ [`${SNAP}/a-linux.png`]: 'A' });
  const l = logger();
  assert.equal(await v.run(['push'], { root, env: {}, fetchImpl: fakeFetch().impl, log: l.log }), 1);
});

test('push: 無い画像だけを上げ、同じ内容は 1 回だけ、一覧を更新する（上書き・削除なし）', async () => {
  const root = makeRoot({ [`${SNAP}/a-linux.png`]: 'A', [`${SNAP}/b-linux.png`]: 'A', [`${SNAP}/c-linux.png`]: 'C' });
  const existing = v.sha256Hex('C');
  const f = fakeFetch(new Map([[v.objectKey(existing), Buffer.from('C')]])); const l = logger();
  assert.equal(await v.run(['push'], { root, env: ENV, fetchImpl: f.impl, log: l.log }), 0);
  assert.deepEqual(f.calls.filter((c) => c.startsWith('PUT')), [`PUT ${v.objectKey(v.sha256Hex('A'))}`]);
  assert.equal(f.calls.some((c) => c.startsWith('DELETE')), false);
  const m = JSON.parse(fs.readFileSync(path.join(root, v.MANIFEST_NAME), 'utf8'));
  assert.deepEqual(m.images, { [`${SNAP}/a-linux.png`]: v.sha256Hex('A'), [`${SNAP}/b-linux.png`]: v.sha256Hex('A'), [`${SNAP}/c-linux.png`]: existing });
});

test('push: 上げるのに失敗したら、一覧を書き換えない', async () => {
  const root = makeRoot({ [`${SNAP}/a-linux.png`]: 'A' });
  const l = logger();
  const failing = async (url, init) => ({ status: init.method === 'HEAD' ? 404 : 500 });
  assert.equal(await v.run(['push'], { root, env: ENV, fetchImpl: failing, log: l.log }), 1);
  assert.equal(fs.existsSync(path.join(root, v.MANIFEST_NAME)), false);
});

test('pull: 手元に無い画像を取得して、一覧のハッシュと照合して置く', async () => {
  const hash = v.sha256Hex('A');
  const root = makeRoot({ [v.MANIFEST_NAME]: JSON.stringify({ version: 1, images: { [`${SNAP}/a-linux.png`]: hash } }) });
  const f = fakeFetch(new Map([[v.objectKey(hash), Buffer.from('A')]])); const l = logger();
  assert.equal(await v.run(['pull'], { root, env: ENV, fetchImpl: f.impl, log: l.log }), 0);
  assert.equal(fs.readFileSync(path.join(root, SNAP, 'a-linux.png'), 'utf8'), 'A');
});

test('pull: 取得した内容のハッシュが違えば、置かずに失敗する', async () => {
  const hash = v.sha256Hex('A');
  const root = makeRoot({ [v.MANIFEST_NAME]: JSON.stringify({ version: 1, images: { [`${SNAP}/a-linux.png`]: hash } }) });
  const f = fakeFetch(new Map([[v.objectKey(hash), Buffer.from('壊れた内容')]])); const l = logger();
  assert.equal(await v.run(['pull'], { root, env: ENV, fetchImpl: f.impl, log: l.log }), 1);
  assert.equal(fs.existsSync(path.join(root, SNAP, 'a-linux.png')), false);
});

test('pull: 手元に画像があれば使う（通信しない）。違っていても --force なしでは上書きしない', async () => {
  const root = makeRoot({
    [`${SNAP}/a-linux.png`]: 'LOCAL',
    [v.MANIFEST_NAME]: JSON.stringify({ version: 1, images: { [`${SNAP}/a-linux.png`]: v.sha256Hex('A') } }),
  });
  const f = fakeFetch(); const l = logger();
  assert.equal(await v.run(['pull'], { root, env: ENV, fetchImpl: f.impl, log: l.log }), 0);
  assert.equal(f.calls.length, 0);
  assert.equal(fs.readFileSync(path.join(root, SNAP, 'a-linux.png'), 'utf8'), 'LOCAL');
});

test('pull: 手元で設定が無く画像も無ければ、飛ばして正常終了（B2）。CI では失敗', async () => {
  const mk = () => makeRoot({ [v.MANIFEST_NAME]: JSON.stringify({ version: 1, images: { [`${SNAP}/a-linux.png`]: v.sha256Hex('A') } }) });
  const l1 = logger();
  assert.equal(await v.run(['pull'], { root: mk(), env: {}, fetchImpl: fakeFetch().impl, log: l1.log }), 0);
  assert.match(l1.lines.join('\n'), /飛ばしました/);
  const l2 = logger();
  assert.equal(await v.run(['pull'], { root: mk(), env: { CI: 'true' }, fetchImpl: fakeFetch().impl, log: l2.log }), 1);
});

test('pull --dry-run: 何も書かない', async () => {
  const hash = v.sha256Hex('A');
  const root = makeRoot({ [v.MANIFEST_NAME]: JSON.stringify({ version: 1, images: { [`${SNAP}/a-linux.png`]: hash } }) });
  const f = fakeFetch(new Map([[v.objectKey(hash), Buffer.from('A')]])); const l = logger();
  assert.equal(await v.run(['pull', '--dry-run'], { root, env: ENV, fetchImpl: f.impl, log: l.log }), 0);
  assert.equal(f.calls.length, 0);
  assert.equal(fs.existsSync(path.join(root, SNAP, 'a-linux.png')), false);
});

test('引数: 不明なコマンド・指定・push の --force は失敗。ログに秘密の値を出さない', async () => {
  const root = makeRoot();
  for (const argv of [['nope'], ['pull', '--x'], ['push', '--force']]) {
    assert.equal(await v.run(argv, { root, env: ENV, fetchImpl: fakeFetch().impl, log: () => {} }), 1);
  }
  const l = logger();
  const boom = async () => { throw new Error('connect https://secret-account.example.invalid/bucket failed'); };
  const hash = v.sha256Hex('A');
  const r2 = makeRoot({ [v.MANIFEST_NAME]: JSON.stringify({ version: 1, images: { [`${SNAP}/a-linux.png`]: hash } }) });
  await v.run(['pull'], { root: r2, env: { ...ENV, R2_SECRET_ACCESS_KEY: 'TOPSECRET' }, fetchImpl: boom, log: l.log });
  const out = l.lines.join('\n');
  assert.doesNotMatch(out, /TOPSECRET|secret-account/);
});
