import { createBoardDomain } from './domain/board.mjs';
import { createProgressionDomain } from './domain/progression.mjs';
import { createGameStore } from './state/store.mjs';
import { createPersistence } from './state/persistence.mjs';
import { createBoardQuizCatalog } from './data/board-quiz.mjs';
import { createMessageCatalog } from './data/messages.mjs';
import { createSatoriCatalog } from './data/satori.mjs';
import { createBoardCommands } from './commands/board-commands.mjs';
import { createProgressionCommands } from './commands/progression-commands.mjs';
import { createBoardView } from './ui/board.mjs';
import { createMessagePresenter } from './ui/messages.mjs';
import { createRuntimeSettings } from './runtime/settings.mjs';
import { createAudioService } from './runtime/audio.mjs';
import { createNavigationController } from './ui/navigation.mjs';
import { createRenderCoordinator } from './ui/render.mjs';
import { createSpeedUnlockService } from './runtime/progression.mjs';

/** Development ESM entry point. The published build still uses index.html. */
export function createDevelopmentRuntime({ cellCount = 7, triangles = [], data = {}, commands = {}, ui = {} } = {}) {
  const store = createGameStore({ navigation: { mode: 'stage', lap: 1 } });
  const board = createBoardDomain({ cellCount, triangles });
  const progression = createProgressionDomain();
  const navigation = createNavigationController({
    store,
    normalize: progression.normalizeNavigation
  });
  const persistence = createPersistence({
    storage: globalThis.localStorage,
    create: value => value
  });
  const settings = createRuntimeSettings({ state: store.state, storage: globalThis.localStorage });
  const audio = createAudioService({ enabled: store.state.settings?.sound });
  const speedUnlocks = createSpeedUnlockService({ storage: globalThis.localStorage });
  const commandApi = Object.freeze({
    board: createBoardCommands(commands.board),
    progression: createProgressionCommands({ navigate: navigation.go, ...commands.progression })
  });
  const uiApi = Object.freeze({
    board: options => createBoardView(options),
    navigation,
    render: options => createRenderCoordinator({ store, ...options }),
    messages: options => createMessagePresenter({ catalog: createMessageCatalog(data.clearContent), ...ui.messages, ...options })
  });
  return Object.freeze({ board, progression, store, persistence, settings, audio, speedUnlocks, commands: commandApi, ui: uiApi, data: Object.freeze({
    messages: createMessageCatalog(data.clearContent),
    satori: createSatoriCatalog(data.satoriStages),
    boardQuiz: createBoardQuizCatalog(data.boardQuizCopy)
  }) });
}
