#!/usr/bin/env node
// VRT の基準画像（PC・スマホ用）を、S3 互換のストレージ（Cloudflare R2）に置くための部品（PWQA-6 の第 1 段 / PWQA-63）。
//
// 【目的】基準画像を Git から外し、Git には「どの画像が正か」の一覧（vrt-baseline.json）だけを置く。
//   画像は、内容のハッシュ（sha256）を名前にして `sha256/<ハッシュ>.png` に置く。同じ内容は 1 つだけ、上書きも削除もしない。
//
// 使い方:
//   node scripts/vrt-baseline.js pull [--dry-run] [--force]   一覧どおりに画像を取得して、snapshots の場所へ置く
//   node scripts/vrt-baseline.js push [--dry-run]             手元の画像のハッシュを計算し、ストレージに無いものだけを上げ、一覧を更新する
//   node scripts/vrt-baseline.js --help
//
// 対象（B1）: tests/ の下の `*-snapshots/*-linux.png`（PC・スマホ用の VRT）だけ。Android（tests-android/）は対象外。
// 接続: R2 の S3 互換 API。環境変数 R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY（値はログに出さない）。
//   バケット名は、環境変数 R2_BUCKET、無ければ既定（playwright-demo-qa-vrt。秘密の値ではない）。
// 手元（B2）: 画像がすでにあれば、それを使う。画像が無く、シークレットも無いときは、取得を飛ばして正常終了する（CI では失敗にする）。
// `--dry-run`: ストレージにも一覧にも書かない（何をするかだけを表示する）。
//
// 依存パッケージは追加しない（署名 V4 は node:crypto、通信は標準の fetch）。単体テスト: node --test scripts/
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_BUCKET = 'playwright-demo-qa-vrt';
const MANIFEST_NAME = 'vrt-baseline.json';
const REGION = 'auto';
const SERVICE = 's3';
const REQUIRED_ENV = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];

const sha256Hex = (data) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
const isHash = (v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
const objectKey = (hash) => `sha256/${hash}.png`;

// ---- 署名 V4（S3 互換 API 用）------------------------------------------------------------
// headers: 署名に含めるヘッダー（host を含める）。戻り値: Authorization ヘッダーの値と、署名の材料
function signV4({ method, pathname, query = '', headers, payloadHash, accessKeyId, secretAccessKey, amzDate, region = REGION, service = SERVICE }) {
  const dateStamp = amzDate.slice(0, 8);
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const names = Object.keys(lower).sort();
  const canonicalHeaders = names.map((n) => `${n}:${lower[n]}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalRequest = [method, pathname, query, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service), 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  return {
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    canonicalRequest,
    stringToSign,
    signature,
  };
}

// ---- ストレージ（R2）クライアント ---------------------------------------------------------
function createStorage({ endpoint, accessKeyId, secretAccessKey, bucket, fetchImpl = fetch, now = () => new Date() }) {
  const base = new URL(endpoint);
  const request = async (method, key, body) => {
    const amzDate = now().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const pathname = `/${bucket}/${key}`; // パス形式（キーは `sha256/<hex>.png` で、エンコードが要る文字を含まない）
    const payloadHash = sha256Hex(body || '');
    const headers = { host: base.host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
    const { authorization } = signV4({ method, pathname, headers, payloadHash, accessKeyId, secretAccessKey, amzDate });
    const url = new URL(pathname, base).toString();
    return fetchImpl(url, { method, headers: { ...headers, authorization }, body });
  };
  return {
    // 存在確認。404 は「無い」。それ以外のエラーは例外（認証の失敗などを「無い」と取り違えない）
    async exists(key) {
      const res = await request('HEAD', key);
      if (res.status === 200) return true;
      if (res.status === 404) return false;
      throw new Error(`HEAD に失敗しました（HTTP ${res.status}）`);
    },
    async get(key) {
      const res = await request('GET', key);
      if (res.status !== 200) throw new Error(`GET に失敗しました（HTTP ${res.status}）`);
      return Buffer.from(await res.arrayBuffer());
    },
    async put(key, body) {
      const res = await request('PUT', key, body);
      if (res.status !== 200) throw new Error(`PUT に失敗しました（HTTP ${res.status}）`);
    },
  };
}

// ---- 一覧（vrt-baseline.json）と、手元の画像 -----------------------------------------------
// 対象の画像（リポジトリのルートからの相対パス。区切りは `/`。並びは固定）
function scanImages(root) {
  const testsDir = path.join(root, 'tests');
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
      } else if (entry.name.endsWith('-linux.png') && path.basename(dir).endsWith('-snapshots')) {
        found.push(path.relative(root, full).split(path.sep).join('/'));
      }
    }
  };
  if (fs.existsSync(testsDir)) walk(testsDir);
  return found.sort();
}

function hashLocalImages(root, files) {
  return Object.fromEntries(files.map((f) => [f, sha256Hex(fs.readFileSync(path.join(root, f)))]));
}

function readManifest(root) {
  const file = path.join(root, MANIFEST_NAME);
  if (!fs.existsSync(file)) return { version: 1, images: {} };
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  validateManifest(data);
  return data;
}

// 一覧の検査。パスの脱出（`..`・絶対パス）や、不正なハッシュを受け付けない（一覧の内容でファイルを書くため）
function validateManifest(data) {
  if (!data || data.version !== 1 || typeof data.images !== 'object' || data.images === null || Array.isArray(data.images)) {
    throw new Error(`${MANIFEST_NAME} の形式が正しくありません（version: 1 と images が要ります）`);
  }
  for (const [file, hash] of Object.entries(data.images)) {
    const ok = /^tests\/[A-Za-z0-9._/-]+-snapshots\/[A-Za-z0-9._-]+-linux\.png$/.test(file) && !file.split('/').includes('..');
    if (!ok) throw new Error(`${MANIFEST_NAME} に、対象外のパスがあります: ${file.slice(0, 80)}`);
    if (!isHash(hash)) throw new Error(`${MANIFEST_NAME} に、不正なハッシュがあります: ${file.slice(0, 80)}`);
  }
}

function writeManifest(root, images) {
  const sorted = Object.fromEntries(Object.entries(images).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  fs.writeFileSync(path.join(root, MANIFEST_NAME), `${JSON.stringify({ version: 1, images: sorted }, null, 2)}\n`);
}

// 一覧と手元の差分: 取得が要るもの（手元に無い）・手元が違うもの・一覧に無い手元の画像
function diffManifest(manifestImages, localHashes) {
  const missing = [];
  const different = [];
  const same = [];
  for (const [file, hash] of Object.entries(manifestImages)) {
    if (!(file in localHashes)) missing.push(file);
    else if (localHashes[file] !== hash) different.push(file);
    else same.push(file);
  }
  const untracked = Object.keys(localHashes).filter((f) => !(f in manifestImages));
  return { missing, different, same, untracked };
}

// ログに出す例外の文面から、URL（エンドポイントのホスト名を含む）と、設定の値そのものを伏せる
function safeMessage(e, env = {}) {
  let m = String(e && e.message).replace(/https?:\/\/\S+/g, '<url>');
  for (const n of REQUIRED_ENV) if (env[n] && env[n].length >= 4) m = m.split(env[n]).join('***');
  return m;
}

// ---- コマンド -----------------------------------------------------------------------------
function resolveStorage(env, fetchImpl) {
  const missing = REQUIRED_ENV.filter((n) => !env[n]);
  if (missing.length > 0) return { storage: null, missing };
  return {
    storage: createStorage({
      endpoint: env.R2_ENDPOINT,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET || DEFAULT_BUCKET,
      fetchImpl,
    }),
    missing: [],
  };
}

async function pull({ root, env, flags, fetchImpl, log }) {
  const manifest = readManifest(root);
  const local = hashLocalImages(root, scanImages(root));
  const { missing, different, same } = diffManifest(manifest.images, local);
  const targets = flags.force ? [...missing, ...different] : missing;
  log(`一覧 ${Object.keys(manifest.images).length} 件: 手元と一致 ${same.length} / 手元に無い ${missing.length} / 手元が違う ${different.length}`);
  if (different.length > 0 && !flags.force) {
    log(`手元が一覧と違う画像は、上書きしません（${different.length} 件。上書きするときは --force）`);
  }
  if (targets.length === 0) return 0;

  const { storage, missing: missingEnv } = resolveStorage(env, fetchImpl);
  if (!storage) {
    // 手元（B2）: 秘密の値が無ければ、取得を飛ばす。CI では、画像が揃わないまま進めないように失敗にする
    if (env.CI === 'true') {
      log(`::error::取得に必要な設定がありません: ${missingEnv.join(', ')}`);
      return 1;
    }
    log(`取得を飛ばしました（手元に無い画像 ${targets.length} 件。設定が無いため: ${missingEnv.join(', ')}）。VRT は、画像の無いテストが失敗または新規作成になります`);
    return 0;
  }
  if (flags.dryRun) {
    log(`[dry-run] 取得する予定: ${targets.length} 件（書き込みはしません）`);
    for (const f of targets) log(`  ${f} <- ${objectKey(manifest.images[f])}`);
    return 0;
  }
  let failed = 0;
  for (const f of targets) {
    const hash = manifest.images[f];
    try {
      const data = await storage.get(objectKey(hash));
      if (sha256Hex(data) !== hash) throw new Error('取得した内容のハッシュが一覧と違います');
      const dest = path.join(root, f);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, data);
    } catch (e) {
      failed += 1;
      log(`::error::取得に失敗: ${f}（${safeMessage(e, env)}）`);
    }
  }
  log(`取得: ${targets.length - failed} 件成功 / ${failed} 件失敗`);
  return failed > 0 ? 1 : 0;
}

async function push({ root, env, flags, fetchImpl, log }) {
  const files = scanImages(root);
  const local = hashLocalImages(root, files);
  const hashes = [...new Set(Object.values(local))];
  const before = readManifest(root).images;
  const changed = Object.keys(local).filter((f) => before[f] !== local[f]);
  const removed = Object.keys(before).filter((f) => !(f in local));
  log(`手元の画像 ${files.length} 件（内容の種類 ${hashes.length}）。一覧との差: 変更・追加 ${changed.length} / 一覧にだけある ${removed.length}`);

  const { storage, missing: missingEnv } = resolveStorage(env, fetchImpl);
  if (!storage) {
    if (flags.dryRun) {
      log(`[dry-run] 設定が無いため、ストレージの存在確認はしません（${missingEnv.join(', ')}）。上げる候補: 内容の種類 ${hashes.length} 件`);
      return 0;
    }
    log(`::error::登録に必要な設定がありません: ${missingEnv.join(', ')}`);
    return 1;
  }

  const toUpload = [];
  for (const h of hashes) {
    if (!(await storage.exists(objectKey(h)))) toUpload.push(h);
  }
  log(`ストレージに無い画像: ${toUpload.length} 件（ある ${hashes.length - toUpload.length} 件は上げません。上書き・削除はしません）`);
  if (flags.dryRun) {
    for (const h of toUpload) log(`  [dry-run] 上げる予定: ${objectKey(h)}`);
    log(`[dry-run] ${MANIFEST_NAME} は ${changed.length + removed.length > 0 ? '更新される予定' : '変更なし'}（書き込みはしません）`);
    return 0;
  }
  const byHash = new Map(Object.entries(local).map(([f, h]) => [h, f]));
  for (const h of toUpload) {
    await storage.put(objectKey(h), fs.readFileSync(path.join(root, byHash.get(h))));
  }
  // 一覧は、上げるのが全部済んでから書く（途中で失敗したら、一覧は変わらない）
  writeManifest(root, local);
  log(`登録: ${toUpload.length} 件を上げて、${MANIFEST_NAME} を更新しました`);
  return 0;
}

const HELP = '使い方: node scripts/vrt-baseline.js <pull|push> [--dry-run] [--force（pull のみ）]';

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = { dryRun: false, force: false };
  for (const a of rest) {
    if (a === '--dry-run') flags.dryRun = true;
    else if (a === '--force') flags.force = true;
    else return { error: `不明な指定です: ${a.slice(0, 40)}` };
  }
  if (flags.force && command !== 'pull') return { error: '--force は pull だけで使えます' };
  return { command, flags };
}

// 戻り値は終了コード。root・env・fetchImpl・log は、単体テストで差し替える
async function run(argv, { root = path.resolve(__dirname, '..'), env = process.env, fetchImpl = fetch, log = console.log } = {}) {
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    log(HELP);
    return argv.length === 0 ? 1 : 0;
  }
  const { command, flags, error } = parseArgs(argv);
  if (error || !['pull', 'push'].includes(command)) {
    log(`${error || `不明なコマンドです: ${String(command).slice(0, 40)}`}\n${HELP}`);
    return 1;
  }
  try {
    return await (command === 'pull' ? pull : push)({ root, env, flags, fetchImpl, log });
  } catch (e) {
    // 例外の文面には、エンドポイントやキーの値を含めない（fetch のエラーの文面にホスト名が入ることがあるため、種類だけを出す）
    log(`::error::${command} に失敗しました（${e.name}: ${safeMessage(e, env)}）`);
    return 1;
  }
}

if (require.main === module) {
  run(process.argv.slice(2)).then((code) => process.exit(code));
}

module.exports = { signV4, createStorage, scanImages, hashLocalImages, readManifest, validateManifest, writeManifest, diffManifest, sha256Hex, objectKey, run, DEFAULT_BUCKET, MANIFEST_NAME };
