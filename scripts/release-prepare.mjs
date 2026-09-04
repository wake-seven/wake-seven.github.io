import { execFileSync, spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 公開前の最終組み立て入口。バージョン更新と公開HTML生成はここだけで行う。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sessionPath = join(root, 'tmp', 'change-session.json');
let session;
try { session = JSON.parse(await readFile(sessionPath, 'utf8')); } catch { session = null; }
if (!session?.feature || !session?.baseRevision) throw new Error('先に npm run change:start -- <feature> を実行してください。');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (session.baseRevision !== head) throw new Error('改修セッションが古くなっています。change:startを再実行してください。');
const runtimePath = join(root, 'src/runtime/runtime.js');
const runtime = await readFile(runtimePath, 'utf8');
const parts = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
const version = `${value.year}.${value.month}.${value.day}-${value.hour}:${value.minute}`;
const nextRuntime = runtime.replace(/const APP_VERSION='[^']+';/, `const APP_VERSION='${version}';`);
if (nextRuntime === runtime) throw new Error('runtime.jsのAPP_VERSIONを見つけられません。');
await writeFile(runtimePath, nextRuntime);
session.releasePrepared = { version, preparedAt: new Date().toISOString(), command: 'release:prepare' };
await writeFile(sessionPath, JSON.stringify(session, null, 2) + '\n');
const result = spawnSync(process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm',
  process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run build'] : ['run', 'build'], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`公開版の最終準備が完了しました。バージョン: ${version}`);
