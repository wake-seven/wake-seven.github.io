import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const CHANGE_SESSION_PHASES = Object.freeze({
  editing: 'editing',
  milestone: 'milestone',
  release: 'release'
});

const phaseOrder = Object.values(CHANGE_SESSION_PHASES);
const sessionPath = root => join(root, 'tmp', 'change-session.json');

export async function readChangeSession(root) {
  try { return JSON.parse(await readFile(sessionPath(root), 'utf8')); }
  catch { return null; }
}

// 検査コマンドの成功時だけフェーズを進め、実行した検査を同じセッションへ記録する。
// release後に部分検査を実行しても、検証済み段階を後退させない。
export async function recordChangeSessionCheck(root, { phase, profile, command, checks = [] }) {
  if (!phaseOrder.includes(phase)) throw new Error(`不明な改修フェーズです: ${phase}`);
  const session = await readChangeSession(root);
  if (!session?.feature || !session?.baseRevision) return null;
  const currentIndex = phaseOrder.indexOf(session.phase || CHANGE_SESSION_PHASES.editing);
  const requestedIndex = phaseOrder.indexOf(phase);
  const completedAt = new Date().toISOString();
  const phaseChanged = requestedIndex > currentIndex;
  const next = {
    ...session,
    schemaVersion: Math.max(2, Number(session.schemaVersion) || 1),
    phase: phaseOrder[Math.max(currentIndex, requestedIndex)],
    lastCheck: { phase, profile, command, checks: [...new Set(checks)], completedAt },
    phaseHistory: phaseChanged
      ? [...(Array.isArray(session.phaseHistory) ? session.phaseHistory : []), { phase, profile, command, completedAt }]
      : (Array.isArray(session.phaseHistory) ? session.phaseHistory : [])
  };
  await mkdir(join(root, 'tmp'), { recursive: true });
  await writeFile(sessionPath(root), JSON.stringify(next, null, 2) + '\n');
  return next;
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
  if (!phaseOrder.includes(session.phase || CHANGE_SESSION_PHASES.editing)) {
    throw new Error(`改修セッションのphaseが不正です: ${session.phase}`);
  }
  const headRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (session.baseRevision !== headRevision) {
    throw new Error('改修セッションの基準コミットが古くなっています。change:startを再実行してください。');
  }
  return { session, files };
}
