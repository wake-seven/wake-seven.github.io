/*
 * WAKE SEVEN 統合状態の基盤。
 *
 * The public build in index.html is intentionally self-contained.  This file
 * is injected as an inline script by scripts/build-index.mjs so it remains
 * ビルドなしでGitHub Pagesから利用できるよう、公開版へインライン埋め込みする。
 */
(function attachWakeSevenState(global) {
  'use strict';

  const STORAGE_KEY = 'wake7-state-vnext';
  const VERSION = 1;
  const MODES = Object.freeze(['tutorial', 'stage', 'mastery', 'satori', 'speed', 'free', 'custom']);
  const STORAGE_KEYS = Object.freeze({
    language: 'wake7-language', sound: 'wake7-sound',
    boardTheme: 'wake7-board-theme', boardThemeChosen: 'wake7-board-theme-chosen',
    boardLayout: 'wake7-board-layout', boardLayoutChosen: 'wake7-board-layout-chosen',
    darumaColor: 'wake7-daruma-color', darumaColorChosen: 'wake7-daruma-color-chosen',
    cleared: 'wake7-cleared', extraCleared: 'wake7-extra-cleared', satoriCleared: 'wake7-satori-cleared',
    currentStage: 'wake7-current-stage', activeSession: 'wake7-active-session', activeLap: 'wake7-active-lap',
    introSeen: 'wake7-intro-seen', tutorialComplete: 'wake7-tutorial-complete', tutorialStep: 'wake7-tutorial-step',
    messageReview: 'wake7-message-review', messageReviewLast: 'wake7-message-review-last-clear',
    speedSession: 'wake7-speed-session', speedActiveVariant: 'wake7-speed-active-variant', speedBestMs: 'wake7-speed-best-ms', speedHistory: 'wake7-speed-history',
    speedUnlocked: 'wake7-speed-unlocked', speedTrainingUnlocked: 'wake7-speed-training-unlocked', speedIntermediateUnlocked: 'wake7-speed-intermediate-unlocked',
    speedMasteryUnlocked: 'wake7-speed-mastery-unlocked', speedSatoriUnlocked: 'wake7-speed-satori-unlocked', speedUnlockModelVersion: 'wake7-speed-unlock-model-version',
    speedTrainingTrialCleared: 'wake7-speed-training-trial-cleared', speedIntermediateTrialCleared: 'wake7-speed-intermediate-trial-cleared',
    speedMasteryTrialCleared: 'wake7-speed-mastery-trial-cleared', speedTrialModelVersion: 'wake7-speed-trial-model-version',
    stagesLayoutVersion: 'wake7-stages-layout-version', threeDUnlocked: 'wake7-3d-unlocked',
    masterGoldGranted: 'wake7-master-gold-granted', satoriDesignGranted: 'wake7-satori-design-granted',
    secondLapActive: 'wake7-second-lap-active', secondLapUnlocked: 'wake7-second-lap-unlocked',
    rainbowDarumaGranted: 'wake7-rainbow-daruma-granted', awakenedGranted: 'wake7-awakened-granted',
    satoriOrderVersion: 'wake7-satori-order-version', speedLastTab: 'wake7-speed-last-tab', speedNewTab: 'wake7-speed-new-tab',
    fourthChecks: 'wake7-fourth-checks'
  });
  const storage = {
    get(key, fallback = null) { try { const value = global.localStorage.getItem(key); return value === null ? fallback : value; } catch (_) { return fallback; } },
    set(key, value) { try { global.localStorage.setItem(key, value); return true; } catch (_) { return false; } },
    remove(key) { try { global.localStorage.removeItem(key); return true; } catch (_) { return false; } },
    json(key, fallback = null) { try { const raw = global.localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (_) { return fallback; } },
    setJson(key, value) { try { global.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } }
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const asArray = value => Array.isArray(value) ? value : [];
  const asIndex = value => Number.isInteger(value) && value >= 0 ? value : 0;
  const asLap = value => value === 2 ? 2 : 1;

  function create(seed = {}) {
    const state = {
      version: VERSION,
      navigation: {
        mode: MODES.includes(seed.navigation?.mode) ? seed.navigation.mode : 'stage',
        lap: asLap(seed.navigation?.lap),
        stageIndex: asIndex(seed.navigation?.stageIndex),
        masteryIndex: asIndex(seed.navigation?.masteryIndex),
        satoriIndex: asIndex(seed.navigation?.satoriIndex),
        tutorialStep: asIndex(seed.navigation?.tutorialStep)
      },
      board: seed.board && typeof seed.board === 'object' ? clone(seed.board) : null,
      progress: {
        lap1: normalizeProgress(seed.progress?.lap1),
        lap2: normalizeProgress(seed.progress?.lap2)
      },
      unlocks: seed.unlocks && typeof seed.unlocks === 'object' ? clone(seed.unlocks) : {},
      settings: seed.settings && typeof seed.settings === 'object' ? clone(seed.settings) : {},
      speed: {
        activeVariant: typeof seed.speed?.activeVariant === 'string' ? seed.speed.activeVariant : 'training9',
        sessions: seed.speed?.sessions && typeof seed.speed.sessions === 'object' ? clone(seed.speed.sessions) : {}
      },
      ui: seed.ui && typeof seed.ui === 'object' ? clone(seed.ui) : {},
      // 旧データを保持しておくことで、段階移行中も旧版へ戻せるようにする。
      legacySession: seed.legacySession && typeof seed.legacySession === 'object' ? clone(seed.legacySession) : null
    };
    return state;
  }

  function normalizeProgress(value) {
    return {
      primary: asArray(value?.primary),
      mastery: asArray(value?.mastery),
      satori: asArray(value?.satori)
    };
  }

  function read(storage = global.localStorage) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.version === VERSION ? create(parsed) : null;
    } catch (_) {
      return null;
    }
  }

  function write(state, storage = global.localStorage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(create(state)));
      return true;
    } catch (_) {
      return false;
    }
  }

  function readJson(storage, key) {
    try { return JSON.parse(storage.getItem(key) || '[]'); } catch (_) { return []; }
  }

  function migrateLegacy(storage = global.localStorage) {
    const existing = read(storage);
    if (existing) return existing;
    const session = readJson(storage, 'wake7-active-session');
    const activeLap = Number(storage.getItem('wake7-active-lap')) === 2 ? 2 : 1;
    const mode = typeof session?.mode === 'string' ? session.mode : 'stage';
    const state = create({
      navigation: {
        mode,
        lap: activeLap,
        stageIndex: session?.extra || session?.satori ? 0 : session?.index,
        masteryIndex: session?.extra ? session?.index : 0,
        satoriIndex: session?.satori ? session?.index : 0,
        tutorialStep: session?.step
      },
      board: session?.board || null,
      progress: {
        lap1: {
          primary: readJson(storage, 'wake7-lap1-primary-cleared').length ? readJson(storage, 'wake7-lap1-primary-cleared') : readJson(storage, 'wake7-cleared'),
          mastery: readJson(storage, 'wake7-lap1-extra-cleared').length ? readJson(storage, 'wake7-lap1-extra-cleared') : readJson(storage, 'wake7-extra-cleared'),
          satori: readJson(storage, 'wake7-lap1-satori-cleared').length ? readJson(storage, 'wake7-lap1-satori-cleared') : readJson(storage, 'wake7-satori-cleared')
        },
        lap2: {
          primary: readJson(storage, 'wake7-lap2-primary-cleared'),
          mastery: readJson(storage, 'wake7-lap2-extra-cleared'),
          satori: readJson(storage, 'wake7-lap2-satori-cleared')
        }
      },
      settings: {
        language: storage.getItem('wake7-language') || 'ja',
        sound: storage.getItem('wake7-sound') !== 'off',
        boardTheme: storage.getItem('wake7-board-theme') || 'default',
        boardLayout: storage.getItem('wake7-board-layout') || 'normal',
        darumaColor: storage.getItem('wake7-daruma-color') || 'red'
      },
      unlocks: {
        secondLap: storage.getItem('wake7-second-lap-unlocked') === '1',
        awakened: storage.getItem(STORAGE_KEYS.awakenedGranted) === '1',
        threeD: storage.getItem('wake7-3d-unlocked') === '1',
        masterGoldGranted: storage.getItem(STORAGE_KEYS.masterGoldGranted) === '1',
        satoriDesignGranted: storage.getItem(STORAGE_KEYS.satoriDesignGranted) === '1',
        rainbowDarumaGranted: storage.getItem(STORAGE_KEYS.rainbowDarumaGranted) === '1',
        speedTraining: storage.getItem('wake7-speed-training-unlocked') === '1',
        speedIntermediate: storage.getItem('wake7-speed-intermediate-unlocked') === '1',
        speedMastery: storage.getItem('wake7-speed-mastery-unlocked') === '1',
        speedSatori: storage.getItem('wake7-speed-satori-unlocked') === '1',
        speedTrainingTrialCleared: storage.getItem('wake7-speed-training-trial-cleared') === '1',
        speedIntermediateTrialCleared: storage.getItem('wake7-speed-intermediate-trial-cleared') === '1',
        speedMasteryTrialCleared: storage.getItem('wake7-speed-mastery-trial-cleared') === '1'
      },
      speed: { activeVariant: storage.getItem('wake7-speed-active-variant') || 'training9' },
      legacySession: session && typeof session === 'object' ? session : null
    });
    write(state, storage);
    return state;
  }

  // ナビゲーションは小さな読み取り専用ビューとして公開する。
  // 状態移行中は実行側が現在値を保持していても、利用側が保存形式を
  // 意識せずに済むようにする。
  function navigationView(state) {
    const navigation = state?.navigation || {};
    return {
      mode: MODES.includes(navigation.mode) ? navigation.mode : 'stage',
      lap: asLap(navigation.lap),
      stageIndex: asIndex(navigation.stageIndex),
      masteryIndex: asIndex(navigation.masteryIndex),
      satoriIndex: asIndex(navigation.satoriIndex),
      tutorialStep: asIndex(navigation.tutorialStep)
    };
  }

  function navigationIndex(navigation, mode = navigation?.mode) {
    const view = navigation?.navigation ? navigationView(navigation) : navigationView({ navigation });
    switch (mode) {
      case 'tutorial': return view.tutorialStep;
      case 'mastery': return view.masteryIndex;
      case 'satori': return view.satoriIndex;
      case 'stage': return view.stageIndex;
      default: return null;
    }
  }

  // 状態の読み取りと同じ境界で、書き込みも正規化して受け付ける。
  // 呼び出し側は保存形式や許容値を意識せず、変更したい項目だけ渡せる。
  function updateNavigation(state, patch = {}) {
    if (!state || typeof state !== 'object') return null;
    const current = navigationView(state);
    const next = { ...current, ...(patch && typeof patch === 'object' ? patch : {}) };
    state.navigation = {
      mode: MODES.includes(next.mode) ? next.mode : current.mode,
      lap: asLap(next.lap),
      stageIndex: asIndex(next.stageIndex),
      masteryIndex: asIndex(next.masteryIndex),
      satoriIndex: asIndex(next.satoriIndex),
      tutorialStep: asIndex(next.tutorialStep)
    };
    return state.navigation;
  }

  function updateSettings(state, patch = {}) {
    if (!state || typeof state !== 'object') return null;
    const next = patch && typeof patch === 'object' ? patch : {};
    state.settings = { ...(state.settings && typeof state.settings === 'object' ? state.settings : {}), ...clone(next) };
    return state.settings;
  }

  function updateProgress(state, patch = {}) {
    if (!state || typeof state !== 'object') return null;
    const next = patch && typeof patch === 'object' ? patch : {};
    state.progress = {
      lap1: normalizeProgress(next.lap1 || state.progress?.lap1),
      lap2: normalizeProgress(next.lap2 || state.progress?.lap2)
    };
    return state.progress;
  }

  global.WakeSevenState = Object.freeze({
    STORAGE_KEY,
    STORAGE_KEYS,
    VERSION,
    MODES,
    storage,
    create,
    read,
    write,
    migrateLegacy,
    navigationView,
    navigationIndex,
    updateNavigation,
    updateSettings,
    updateProgress
  });
})(window);
