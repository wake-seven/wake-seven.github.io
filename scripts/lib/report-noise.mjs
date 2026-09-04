import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const volatileKeys = new Set(['generatedAt', 'startedAt', 'finishedAt', 'durationMs', 'wallTimeMs', 'elapsedMs']);

function comparable(value) {
  if (Array.isArray(value)) return value.map(comparable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !volatileKeys.has(key))
    .map(([key, item]) => [key, comparable(item)]));
}

// 時刻と実行時間だけが変わった追跡レポートは、HEADの証跡を保持して差分ノイズを抑える。
export async function normalizeTrackedReports(root) {
  const { stdout } = await execFileAsync('git', ['ls-tree', '-r', '--name-only', 'HEAD', 'build/report'], { cwd: root });
  let normalized = 0;
  for (const relativePath of stdout.split(/\r?\n/).filter(path => path.endsWith('.json'))) {
    const path = `${root}/${relativePath}`;
    try {
      const current = JSON.parse(await readFile(path, 'utf8'));
      const { stdout: previousText } = await execFileAsync('git', ['show', `HEAD:${relativePath}`], { cwd: root, maxBuffer: 10 * 1024 * 1024 });
      const previous = JSON.parse(previousText);
      if (JSON.stringify(comparable(current)) === JSON.stringify(comparable(previous))) {
        await writeFile(path, previousText, 'utf8');
        normalized += 1;
      }
    } catch { /* 新規・一時・不正なレポートは各検査の出力を優先する */ }
  }
  return normalized;
}
