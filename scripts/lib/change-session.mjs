import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function readChangeSession(root) {
  try { return JSON.parse(await readFile(join(root, 'tmp', 'change-session.json'), 'utf8')); }
  catch { return null; }
}

export async function assertChangeSession(root) {
  const raw = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: root, encoding: 'utf8' });
  const files = raw.split('\0').filter(Boolean).map(entry => entry.slice(3).replaceAll('\\', '/'))
    .filter(file => !file.startsWith('build/report/'));
  if (!files.length) return { session: await readChangeSession(root), files };
  const session = await readChangeSession(root);
  if (!session?.feature || !session?.baseRevision) {
    throw new Error('改修セッションがありません。最初に npm run change:start -- <feature> を実行してください。');
  }
  const headRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (session.baseRevision !== headRevision) {
    throw new Error('改修セッションの基準コミットが古くなっています。change:startを再実行してください。');
  }
  return { session, files };
}
