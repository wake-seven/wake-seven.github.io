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
