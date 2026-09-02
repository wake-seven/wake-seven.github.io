// 公開バンドルへ含める開発ソースの唯一の一覧。
// 公開バンドルへ含めるスクリプトを暗黙に拾わず、ここで明示的に管理する。
export const stateModuleFiles = ['state/game-state.js'];
export const progressionPolicyFiles = ['state/progression-policy.js'];
export const applicationModuleFiles = [
  'domain/board-domain.js', 'data/clear-content.js', 'data/core-data.js', 'data/satori.js',
  'data/ui-text.js', 'data/board-quiz.js', 'data/assets.js', 'runtime/settings.js',
  'runtime/audio.js', 'runtime/progression-runtime.js', 'runtime/runtime.js', 'app/app-context.js', 'runtime/speed.js',
  'ui/board-animation.js', 'ui/board-geometry.js', 'ui/board-interaction.js', 'ui/tutorial-animation.js', 'ui/board-ui.js', 'ui/board-render.js', 'ui/ui-context.js', 'ui/progression-academy-support.js', 'commands/board-commands.js', 'commands/settings-commands.js', 'commands/progression-commands.js', 'commands/speed-commands.js', 'commands/speed-record-commands.js', 'commands/tutorial-commands.js',
  'ui/quiz.js', 'ui/clear-flow.js', 'ui/message.js', 'ui/progression-render.js', 'ui/progression-dialogs.js',
  'ui/master-dialog.js', 'ui/progression-insights.js', 'ui/progression-ui.js', 'ui/progression-hud.js', 'ui/progression-quiz.js', 'ui/progression-roadmap.js', 'ui/progression-hints.js', 'ui/progression-clear-flow.js', 'ui/progression-navigation.js', 'ui/rank.js', 'ui/svg.js', 'ui/render.js',
  'runtime/event-bindings.js', 'runtime/app-events.js', 'runtime/app-bootstrap.js', 'runtime/namespace.js', 'ui/dom.js', 'ui/template.js'
];

export const publishedSourceFiles = Object.freeze([
  ...stateModuleFiles,
  ...progressionPolicyFiles,
  ...applicationModuleFiles
]);

// 開発用ESM入口からのみ参照されるモジュール。公開版へは直接連結しない。
export const developmentSourceFiles = [
  'main.mjs', 'domain/board-domain.mjs', 'domain/progression-domain.mjs',
  'runtime/settings.mjs', 'runtime/audio.mjs', 'runtime/progression-runtime.mjs', 'runtime/session.mjs', 'runtime/environment.mjs', 'runtime/application.mjs',
  'state/store.mjs', 'state/persistence.mjs',
  'data/messages-data.mjs', 'data/satori.mjs', 'data/board-quiz.mjs',
  'commands/board-commands.mjs', 'commands/progression-commands.mjs',
  'ui/board-view.mjs', 'ui/messages-ui.mjs', 'ui/navigation.mjs', 'ui/render.mjs', 'ui/events.mjs', 'ui/lifecycle.mjs', 'ui/state-view.mjs', 'ui/view-models.mjs'
];

export const trackedSourceFiles = Object.freeze([...publishedSourceFiles, ...developmentSourceFiles]);
