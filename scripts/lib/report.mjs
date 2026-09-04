import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function sourceRevision(root) {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root });
    return stdout.trim() || 'working-tree';
  } catch {
    return 'working-tree';
  }
}

export async function createReport(root, { name, summary = {}, warnings = [], errors = [], ...extra }) {
  return {
    name,
    status: errors.length ? 'failed' : 'passed',
    summary,
    warnings,
    errors,
    generatedAt: new Date().toISOString(),
    sourceRevision: await sourceRevision(root),
    ...extra
  };
}

export async function writeReport(path, report) {
  await mkdir(dirname(path), { recursive: true });
  // 内容が同じで実行時刻だけが変わった監査レポートは書き換えない。
  // 実質的な差分を残しつつ、毎回のゲート実行による時刻ノイズを抑える。
  try {
    const previous = JSON.parse(await readFile(path, 'utf8'));
    const volatile = new Set(['generatedAt', 'startedAt', 'finishedAt', 'durationMs', 'wallTimeMs', 'elapsedMs', 'runtime']);
    const comparable = value => {
      if (Array.isArray(value)) return value.map(comparable);
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(Object.entries(value)
        .filter(([key]) => !volatile.has(key))
        .map(([key, item]) => [key, comparable(item)]));
    };
    if (JSON.stringify(comparable(previous)) === JSON.stringify(comparable(report))) return;
  } catch { /* 初回生成または旧形式は通常どおり書き込む */ }
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

export async function readReport(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export function validateReport(report, file = 'report') {
  const required = ['name', 'status', 'summary', 'warnings', 'errors', 'generatedAt', 'sourceRevision'];
  const missing = required.filter(key => !(key in report));
  if (missing.length) throw new Error(`${file}: missing common report fields: ${missing.join(', ')}`);
  if (!['passed', 'failed', 'warning', 'incomplete'].includes(report.status)) throw new Error(`${file}: invalid status`);
  if (!report.summary || typeof report.summary !== 'object' || Array.isArray(report.summary)) throw new Error(`${file}: summary must be an object`);
  if (!Array.isArray(report.warnings) || !Array.isArray(report.errors)) throw new Error(`${file}: warnings/errors must be arrays`);
  if (!report.sourceRevision || !Number.isFinite(Date.parse(report.generatedAt))) throw new Error(`${file}: invalid provenance`);
  return report;
}
