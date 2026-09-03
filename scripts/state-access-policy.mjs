// 状態所有者と、移行途中に残る直接参照を明示するためのポリシー。
// 例外はファイル単位ではなく、現在存在する参照の指紋で管理する。
export const NAVIGATION_NAMES = Object.freeze([
  'activeMode', 'activeLap', 'stageIndex', 'extraIndex', 'satoriIndex',
  'tutorialStep', 'lastStageMode'
]);
export const DIALOG_NAMES = Object.freeze([
  'clearShown', 'nextStageAttention', 'masterDialogKind',
  'rankDialogReturn', 'messageDialogReturn'
]);
export const STATE_OWNER_FILES = Object.freeze([
  'runtime/runtime.js', 'runtime/progression-runtime.js',
  'state/game-state.js', 'app/app-context.js'
]);
export const POLICY_PATH = 'scripts/state-access-exceptions.json';

// 例外は「なぜ残っているか」まで機械的に記録する。新しい例外を追加した
// ときに理由が空欄のまま増えないよう、検査側はこの分類を必ず要求する。
export const STATE_EXCEPTION_PURPOSES = Object.freeze([
  'navigation', 'dialog', 'progress', 'session', 'board', 'settings', 'animation'
]);

export function classifyStateException(ref) {
  const { file = '', name = '', source = '' } = ref || {};
  let purpose = 'session';
  if (DIALOG_NAMES.includes(name)) purpose = 'dialog';
  else if (NAVIGATION_NAMES.includes(name)) purpose = 'navigation';
  else if (/settings|language|sound|theme|layout|color/i.test(name + source)) purpose = 'settings';
  else if (/animation|animate|pointer|drag|tile/i.test(file + name + source)) purpose = 'animation';
  else if (/initialState|initialPar|ori|spin|board/i.test(name + source)) purpose = 'board';
  else if (/progress|clear|stage|mastery|satori|tutorial|unlock/i.test(name + source)) purpose = 'progress';
  const ownerOnly = STATE_OWNER_FILES.includes(file);
  const temporary = !ownerOnly;
  const migrationTarget = ownerOnly ? null : `gateway:${purpose}`;
  return Object.freeze({
    purpose,
    ownerOnly,
    temporary,
    priority: purpose === 'dialog' || purpose === 'navigation' ? 1 : purpose === 'progress' ? 2 : 3,
    migrationTarget,
    reason: ownerOnly
      ? '状態所有者の内部参照として保持する'
      : `既存の${purpose}処理。対応する入口とE2Eを確認してから移行する`
  });
}
