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
import { createMessagePresenter, createClearMessageModel } from './ui/messages.mjs';
import { createRuntimeSettings, DEFAULT_SETTING_KEYS } from './runtime/settings.mjs';
import { createAudioService } from './runtime/audio.mjs';
import { createSessionService } from './runtime/session.mjs';
import { createNavigationController } from './ui/navigation.mjs';
import { createRenderCoordinator } from './ui/render.mjs';
import { createEventBinder } from './ui/events.mjs';
import { createStagePickerViewModel, createClearMessageViewModel, createSpeedViewModel } from './ui/view-models.mjs';
import { createUiLifecycle } from './ui/lifecycle.mjs';
import { createUiStateView } from './ui/state-view.mjs';
import { createSpeedUnlockService, DEFAULT_SPEED_UNLOCK_KEYS } from './runtime/progression.mjs';
import { createRuntimeEnvironment } from './runtime/environment.mjs';
import { createApplicationController } from './runtime/application.mjs';

/** Development ESM entry point. The published build still uses index.html. */
export function createDevelopmentRuntime({ cellCount = 7, triangles = [], data = {}, commands = {}, ui = {}, environment = {} } = {}) {
  const store = createGameStore({ navigation: { mode: 'stage', lap: 1 } });
  const board = createBoardDomain({ cellCount, triangles });
  const progression = createProgressionDomain();
  const navigation = createNavigationController({
    store,
    normalize: progression.normalizeNavigation
  });
  const host = createRuntimeEnvironment(environment);
  const browserWindow = host.windowRef;
  const browserDocument = host.documentRef;
  const browserStorage = host.storage;
  const persistence = createPersistence({
    storage: browserStorage,
    create: value => value
  });
  const settings = createRuntimeSettings({ state: store.state, storage: browserStorage, keys: DEFAULT_SETTING_KEYS });
  const audio = createAudioService({ enabled: store.state.settings?.sound, documentRef: browserDocument, windowRef: browserWindow });
  const session = createSessionService({ persistence });
  const speedUnlocks = createSpeedUnlockService({ storage: browserStorage, storageKeys: DEFAULT_SPEED_UNLOCK_KEYS });
  const application = createApplicationController({ store, session });
  const commandApi = Object.freeze({
    board: createBoardCommands(commands.board),
    progression: createProgressionCommands({ navigate: navigation.go, ...commands.progression })
  });
  const uiApi = Object.freeze({
    board: options => createBoardView({ document: browserDocument, ...options }),
    events: options => createEventBinder(options),
    lifecycle: options => createUiLifecycle(options),
    stateView: options => createUiStateView({ store, ...options }),
    navigation,
    viewModels: Object.freeze({ createStagePickerViewModel, createClearMessageViewModel, createSpeedViewModel }),
    render: options => createRenderCoordinator({ store, ...options }),
    messages: options => createMessagePresenter({ catalog: createMessageCatalog(data.clearContent), ...ui.messages, ...options }),
    messageModel: createClearMessageModel
  });
  return Object.freeze({ board, progression, store, persistence, session, settings, audio, speedUnlocks, application, commands: commandApi, ui: uiApi, data: Object.freeze({
    messages: createMessageCatalog(data.clearContent),
    satori: createSatoriCatalog(data.satoriStages),
    boardQuiz: createBoardQuizCatalog(data.boardQuizCopy)
  }) });
}
