/** Runtime settings service, independent from the classic global runtime. */
const THEMES = new Set(['default', 'gold', 'satori']);
const LAYOUTS = new Set(['normal', 'tilted']);
const COLORS = new Set(['red', 'rainbow']);
export const DEFAULT_SETTING_KEYS = Object.freeze({ boardTheme: 'wake7-board-theme', boardLayout: 'wake7-board-layout', darumaColor: 'wake7-daruma-color', boardThemeChosen: 'wake7-board-theme-chosen', boardLayoutChosen: 'wake7-board-layout-chosen', darumaColorChosen: 'wake7-daruma-color-chosen' });
export function createRuntimeSettings({ state = {}, storage, keys = DEFAULT_SETTING_KEYS } = {}) {
  let current = { sound: state.sound !== false, boardTheme: 'default', boardLayout: 'normal', darumaColor: 'red' };
  const read = key => { try { return storage?.getItem(key); } catch { return null; } };
  const initialize = nextState => {
    const settings = (nextState || state || {}).settings || nextState || state || {};
    current = { sound: settings.sound !== false, boardTheme: THEMES.has(settings.boardTheme) ? settings.boardTheme : 'default', boardLayout: settings.boardTheme === 'tilted' || settings.boardLayout === 'tilted' ? 'tilted' : 'normal', darumaColor: COLORS.has(settings.darumaColor) ? settings.darumaColor : 'red' };
    if (!settings.boardTheme || !settings.boardLayout) { const theme = read(keys.boardTheme); if (theme === 'tilted') current.boardLayout = 'tilted'; else if (THEMES.has(theme)) current.boardTheme = theme; const layout = read(keys.boardLayout); if (LAYOUTS.has(layout)) current.boardLayout = layout; }
    if (!settings.darumaColor) { const color = read(keys.darumaColor); if (COLORS.has(color)) current.darumaColor = color; else if (['indigo', 'gold', 'green'].includes(color)) current.darumaColor = 'rainbow'; }
    return snapshot();
  };
  const snapshot = () => Object.freeze({ ...current });
  return Object.freeze({ initialize, snapshot, get values() { return snapshot(); } });
}
