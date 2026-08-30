// 公開バンドルへ含める開発ソースの唯一の一覧。
// 移行途中のclassicスクリプトも、暗黙に拾わずここで明示的に管理する。
export const stateModuleFiles = ['state/game-state.js'];
export const progressionPolicyFiles = ['state/progression-policy.js'];
export const applicationModuleFiles = [
  'domain/board.js', 'data/clear-content.js', 'data/core-data.js', 'data/satori.js',
  'data/ui-text.js', 'data/board-quiz.js', 'data/assets.js', 'runtime/settings.js',
  'runtime/audio.js', 'runtime/progression.js', 'runtime/runtime.js', 'runtime/speed.js',
  'ui/board-animation.js', 'ui/board-geometry.js', 'ui/board.js', 'commands/board.js', 'commands/progression.js',
  'ui/quiz.js', 'ui/clear-flow.js', 'ui/message.js', 'ui/progression-render.js',
  'ui/master-dialog.js', 'ui/progression.js', 'ui/progression-navigation.js', 'ui/rank.js', 'ui/render.js',
  'runtime/app-events.js', 'runtime/namespace.js'
];

export const publishedSourceFiles = Object.freeze([
  ...stateModuleFiles,
  ...progressionPolicyFiles,
  ...applicationModuleFiles
]);

// 開発用ESM入口からのみ参照されるモジュール。公開版へは直接連結しない。
export const developmentSourceFiles = [
  'main.mjs', 'domain/board.mjs', 'domain/progression.mjs',
  'runtime/settings.mjs', 'runtime/audio.mjs', 'runtime/progression.mjs', 'runtime/session.mjs', 'runtime/environment.mjs',
  'state/store.mjs', 'state/persistence.mjs',
  'data/messages.mjs', 'data/satori.mjs', 'data/board-quiz.mjs',
  'commands/board-commands.mjs', 'commands/progression-commands.mjs',
  'ui/board.mjs', 'ui/messages.mjs', 'ui/navigation.mjs', 'ui/render.mjs', 'ui/events.mjs', 'ui/lifecycle.mjs', 'ui/state-view.mjs'
];

export const trackedSourceFiles = Object.freeze([...publishedSourceFiles, ...developmentSourceFiles]);
