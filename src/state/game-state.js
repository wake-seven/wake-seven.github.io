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
  // 分野別の参照口。平坦な STORAGE_KEYS は既存モジュールとの互換用に維持する。
  const STORAGE_KEY_GROUPS = Object.freeze({
    settings: Object.freeze({ language: STORAGE_KEYS.language, sound: STORAGE_KEYS.sound, boardTheme: STORAGE_KEYS.boardTheme, boardThemeChosen: STORAGE_KEYS.boardThemeChosen, boardLayout: STORAGE_KEYS.boardLayout, boardLayoutChosen: STORAGE_KEYS.boardLayoutChosen, darumaColor: STORAGE_KEYS.darumaColor, darumaColorChosen: STORAGE_KEYS.darumaColorChosen }),
    progression: Object.freeze({ cleared: STORAGE_KEYS.cleared, extraCleared: STORAGE_KEYS.extraCleared, satoriCleared: STORAGE_KEYS.satoriCleared, currentStage: STORAGE_KEYS.currentStage, activeSession: STORAGE_KEYS.activeSession, activeLap: STORAGE_KEYS.activeLap, secondLapActive: STORAGE_KEYS.secondLapActive, secondLapUnlocked: STORAGE_KEYS.secondLapUnlocked, stagesLayoutVersion: STORAGE_KEYS.stagesLayoutVersion, satoriOrderVersion: STORAGE_KEYS.satoriOrderVersion }),
    rewards: Object.freeze({ masterGoldGranted: STORAGE_KEYS.masterGoldGranted, satoriDesignGranted: STORAGE_KEYS.satoriDesignGranted, rainbowDarumaGranted: STORAGE_KEYS.rainbowDarumaGranted, awakenedGranted: STORAGE_KEYS.awakenedGranted, threeDUnlocked: STORAGE_KEYS.threeDUnlocked }),
    speed: Object.freeze({ session: STORAGE_KEYS.speedSession, activeVariant: STORAGE_KEYS.speedActiveVariant, bestMs: STORAGE_KEYS.speedBestMs, history: STORAGE_KEYS.speedHistory, unlocked: STORAGE_KEYS.speedUnlocked, trainingUnlocked: STORAGE_KEYS.speedTrainingUnlocked, intermediateUnlocked: STORAGE_KEYS.speedIntermediateUnlocked, masteryUnlocked: STORAGE_KEYS.speedMasteryUnlocked, satoriUnlocked: STORAGE_KEYS.speedSatoriUnlocked, unlockModelVersion: STORAGE_KEYS.speedUnlockModelVersion, trainingTrialCleared: STORAGE_KEYS.speedTrainingTrialCleared, intermediateTrialCleared: STORAGE_KEYS.speedIntermediateTrialCleared, masteryTrialCleared: STORAGE_KEYS.speedMasteryTrialCleared, trialModelVersion: STORAGE_KEYS.speedTrialModelVersion, lastTab: STORAGE_KEYS.speedLastTab, newTab: STORAGE_KEYS.speedNewTab })
  });
  // 旧版からの移行でだけ読むキー。現行処理の保存先とは分けておき、
  // 互換キーを誤って新機能から参照しないようにする。
  const LEGACY_STORAGE_KEYS = Object.freeze({
    activeSession: 'wake7-active-session', activeLap: 'wake7-active-lap',
    language: 'wake7-language', sound: 'wake7-sound',
    boardTheme: 'wake7-board-theme', boardLayout: 'wake7-board-layout', darumaColor: 'wake7-daruma-color',
    cleared: 'wake7-cleared', extraCleared: 'wake7-extra-cleared', satoriCleared: 'wake7-satori-cleared',
    lap1PrimaryCleared: 'wake7-lap1-primary-cleared', lap1ExtraCleared: 'wake7-lap1-extra-cleared', lap1SatoriCleared: 'wake7-lap1-satori-cleared',
    lap2PrimaryCleared: 'wake7-lap2-primary-cleared', lap2ExtraCleared: 'wake7-lap2-extra-cleared', lap2SatoriCleared: 'wake7-lap2-satori-cleared',
    secondLapUnlocked: 'wake7-second-lap-unlocked',
    awakenedGranted: 'wake7-awakened-granted', threeDUnlocked: 'wake7-3d-unlocked',
    masterGoldGranted: 'wake7-master-gold-granted', satoriDesignGranted: 'wake7-satori-design-granted', rainbowDarumaGranted: 'wake7-rainbow-daruma-granted',
    speedActiveVariant: 'wake7-speed-active-variant', speedTrainingUnlocked: 'wake7-speed-training-unlocked', speedIntermediateUnlocked: 'wake7-speed-intermediate-unlocked',
    speedMasteryUnlocked: 'wake7-speed-mastery-unlocked', speedSatoriUnlocked: 'wake7-speed-satori-unlocked',
    speedTrainingTrialCleared: 'wake7-speed-training-trial-cleared', speedIntermediateTrialCleared: 'wake7-speed-intermediate-trial-cleared', speedMasteryTrialCleared: 'wake7-speed-mastery-trial-cleared'
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
  // 状態ストアの購読は軽量な通知だけに留め、描画や保存の責務は呼び出し側へ委譲する。
  const subscribers = new WeakMap();

  function notify(state, change = {}) {
    const listeners = subscribers.get(state);
    if (!listeners) return state;
    listeners.forEach(listener => {
      try { listener(state, change); } catch (_) { /* 購読側の失敗でゲームを止めない */ }
    });
    return state;
  }

  function subscribe(state, listener) {
    if (!state || typeof listener !== 'function') return () => {};
    let listeners = subscribers.get(state);
    if (!listeners) { listeners = new Set(); subscribers.set(state, listeners); }
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

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
    const session = readJson(storage, LEGACY_STORAGE_KEYS.activeSession);
    const activeLap = Number(storage.getItem(LEGACY_STORAGE_KEYS.activeLap)) === 2 ? 2 : 1;
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
          primary: readJson(storage, LEGACY_STORAGE_KEYS.lap1PrimaryCleared).length ? readJson(storage, LEGACY_STORAGE_KEYS.lap1PrimaryCleared) : readJson(storage, LEGACY_STORAGE_KEYS.cleared),
          mastery: readJson(storage, LEGACY_STORAGE_KEYS.lap1ExtraCleared).length ? readJson(storage, LEGACY_STORAGE_KEYS.lap1ExtraCleared) : readJson(storage, LEGACY_STORAGE_KEYS.extraCleared),
          satori: readJson(storage, LEGACY_STORAGE_KEYS.lap1SatoriCleared).length ? readJson(storage, LEGACY_STORAGE_KEYS.lap1SatoriCleared) : readJson(storage, LEGACY_STORAGE_KEYS.satoriCleared)
        },
        lap2: {
          primary: readJson(storage, LEGACY_STORAGE_KEYS.lap2PrimaryCleared),
          mastery: readJson(storage, LEGACY_STORAGE_KEYS.lap2ExtraCleared),
          satori: readJson(storage, LEGACY_STORAGE_KEYS.lap2SatoriCleared)
        }
      },
      settings: {
        language: storage.getItem(LEGACY_STORAGE_KEYS.language) || 'ja',
        sound: storage.getItem(LEGACY_STORAGE_KEYS.sound) !== 'off',
        boardTheme: storage.getItem(LEGACY_STORAGE_KEYS.boardTheme) || 'default',
        boardLayout: storage.getItem(LEGACY_STORAGE_KEYS.boardLayout) || 'normal',
        darumaColor: storage.getItem(LEGACY_STORAGE_KEYS.darumaColor) || 'red'
      },
      unlocks: {
        secondLap: storage.getItem(LEGACY_STORAGE_KEYS.secondLapUnlocked) === '1',
        awakened: storage.getItem(LEGACY_STORAGE_KEYS.awakenedGranted) === '1',
        threeD: storage.getItem(LEGACY_STORAGE_KEYS.threeDUnlocked) === '1',
        masterGoldGranted: storage.getItem(LEGACY_STORAGE_KEYS.masterGoldGranted) === '1',
        satoriDesignGranted: storage.getItem(LEGACY_STORAGE_KEYS.satoriDesignGranted) === '1',
        rainbowDarumaGranted: storage.getItem(LEGACY_STORAGE_KEYS.rainbowDarumaGranted) === '1',
        speedTraining: storage.getItem(LEGACY_STORAGE_KEYS.speedTrainingUnlocked) === '1',
        speedIntermediate: storage.getItem(LEGACY_STORAGE_KEYS.speedIntermediateUnlocked) === '1',
        speedMastery: storage.getItem(LEGACY_STORAGE_KEYS.speedMasteryUnlocked) === '1',
        speedSatori: storage.getItem(LEGACY_STORAGE_KEYS.speedSatoriUnlocked) === '1',
        speedTrainingTrialCleared: storage.getItem(LEGACY_STORAGE_KEYS.speedTrainingTrialCleared) === '1',
        speedIntermediateTrialCleared: storage.getItem(LEGACY_STORAGE_KEYS.speedIntermediateTrialCleared) === '1',
        speedMasteryTrialCleared: storage.getItem(LEGACY_STORAGE_KEYS.speedMasteryTrialCleared) === '1'
      },
      speed: { activeVariant: ({mastery15:'training18',mastery24:'mastery27'}[storage.getItem(LEGACY_STORAGE_KEYS.speedActiveVariant)] || storage.getItem(LEGACY_STORAGE_KEYS.speedActiveVariant) || 'training9') },
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
    notify(state, { section: 'navigation', patch: clone(patch) });
    return state.navigation;
  }

  // 実行側が保存形式のオブジェクトへ直接依存しないための読み取り境界。
  // 返却値は読み取り専用として扱い、変更は update* API 経由で行う。
  function sectionView(state, section) {
    const value = state?.[section];
    return value && typeof value === 'object' ? value : {};
  }

  function updateBoard(state, next) {
    if (!state || typeof state !== 'object') return null;
    state.board = next && typeof next === 'object' ? clone(next) : next ?? null;
    notify(state, { section: 'board' });
    return state.board;
  }

  function updateUnlocks(state, patch = {}) {
    if (!state || typeof state !== 'object') return null;
    const next = patch && typeof patch === 'object' ? patch : {};
    state.unlocks = { ...(state.unlocks && typeof state.unlocks === 'object' ? state.unlocks : {}), ...clone(next) };
    notify(state, { section: 'unlocks', patch: clone(next) });
    return state.unlocks;
  }

  function updateSettings(state, patch = {}) {
    if (!state || typeof state !== 'object') return null;
    const next = patch && typeof patch === 'object' ? patch : {};
    state.settings = { ...(state.settings && typeof state.settings === 'object' ? state.settings : {}), ...clone(next) };
    notify(state, { section: 'settings', patch: clone(next) });
    return state.settings;
  }

  function updateProgress(state, patch = {}) {
    if (!state || typeof state !== 'object') return null;
    const next = patch && typeof patch === 'object' ? patch : {};
    state.progress = {
      lap1: normalizeProgress(next.lap1 || state.progress?.lap1),
      lap2: normalizeProgress(next.lap2 || state.progress?.lap2)
    };
    notify(state, { section: 'progress' });
    return state.progress;
  }

  global.WakeSevenState = Object.freeze({
    STORAGE_KEY,
    STORAGE_KEYS,
    STORAGE_KEY_GROUPS,
    LEGACY_STORAGE_KEYS,
    VERSION,
    MODES,
    storage,
    create,
    read,
    write,
    migrateLegacy,
    navigationView,
    navigationIndex,
    sectionView,
    updateNavigation,
    updateBoard,
    updateUnlocks,
    updateSettings,
    updateProgress,
    subscribe,
    notify
  });
})(window);
// 公開native moduleの構文境界。
export {};
