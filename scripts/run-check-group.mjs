import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// 利用者向け4領域の入口から、対応する内部検査を順番に実行する。
// 個別検査の判定は変更せず、失敗した検査名をそのまま返す。
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, 'scripts', 'check-entry-groups.json'), 'utf8'));
const group = process.argv[2];
const entry = manifest.publicEntries.find(candidate => candidate.name === `check:${group}`);
if (!entry) throw new Error(`未知の検査領域です: ${group || '(未指定)'}`);
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const missing = entry.checks.filter(name => !packageJson.scripts?.[name]);
if (missing.length) throw new Error(`内部検査が package.json にありません: ${missing.join(', ')}`);

const run = name => new Promise(resolve => {
  const command = packageJson.scripts[name];
  const child = spawn(process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'sh',
    process.platform === 'win32' ? ['/d', '/s', '/c', command] : ['-c', command],
    { cwd: root, stdio: 'inherit' });
  child.on('close', code => resolve(code ?? 1));
  child.on('error', () => resolve(1));
});

for (const name of entry.checks) {
  const code = await run(name);
  if (code !== 0) {
    console.error(`検査領域「${entry.label}」が失敗しました: ${name}`);
    process.exitCode = code;
    break;
  }
}
if (!process.exitCode) console.log(`検査領域「${entry.label}」が完了しました: ${entry.checks.length}件`);
