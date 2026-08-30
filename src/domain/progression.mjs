/** Pure progression policy facade for development-side consumers. */
export function createProgressionDomain({ academyTotal = 20, trainingStart = 20, trainingTotal = 27 } = {}) {
  const modes = Object.freeze(['tutorial', 'stage', 'mastery', 'satori', 'speed', 'free', 'custom']);
  const normalizeNavigation = (value = {}) => Object.freeze({
    mode: modes.includes(value.mode) ? value.mode : 'stage',
    lap: value.lap === 2 ? 2 : 1,
    stageIndex: Number.isInteger(value.stageIndex) && value.stageIndex >= 0 ? value.stageIndex : 0,
    masteryIndex: Number.isInteger(value.masteryIndex) && value.masteryIndex >= 0 ? value.masteryIndex : 0,
    satoriIndex: Number.isInteger(value.satoriIndex) && value.satoriIndex >= 0 ? value.satoriIndex : 0,
    tutorialStep: Number.isInteger(value.tutorialStep) && value.tutorialStep >= 0 ? value.tutorialStep : 0
  });
  const indexFor = (navigation = {}) => {
    const current = normalizeNavigation(navigation);
    return current.mode === 'tutorial' ? current.tutorialStep
      : current.mode === 'mastery' ? current.masteryIndex
        : current.mode === 'satori' ? current.satoriIndex : current.stageIndex;
  };
  const uiPolicy = ({ mode, stageIndex = 0 } = {}) => {
    if (mode === 'tutorial') return Object.freeze({ id: 'tutorial', assisted: true });
    if (mode !== 'stage') return Object.freeze({ id: 'standard' });
    if (stageIndex < academyTotal) return Object.freeze({ id: 'academy', assisted: true });
    if (stageIndex < trainingStart + trainingTotal) return Object.freeze({ id: 'training' });
    return Object.freeze({ id: 'standard' });
  };
  return Object.freeze({ modes, normalizeNavigation, indexFor, uiPolicy });
}
