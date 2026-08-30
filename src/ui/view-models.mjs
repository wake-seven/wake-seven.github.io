/** Stable view-model contracts for classic-compatible renderer adapters. */
export const createStagePickerModel = ({ title = '', page = 0, total = 0, items = [], stages = items, selectedIndex = -1 } = {}) => Object.freeze({ kind: 'stage-picker', title, page, total, items: Object.freeze([...items]), stages: Object.freeze([...stages]), selectedIndex });
export const createClearMessageViewModel = ({ title = '', body = '', tip = null, quiz = null, art = '', nextAction = null, canContinue = false } = {}) => Object.freeze({ kind: 'clear-message', title, body, tip, quiz, art, nextAction, canContinue });
export const createSpeedRunModel = ({ variant = '', index = 0, total = 0, elapsedMs = 0, bestMs = 0 } = {}) => Object.freeze({ kind: 'speed-run', variant, index, total, elapsedMs, bestMs });
export const createGuideModel = ({ index = 0, total = 0, caption = '', text = '', boards = [] } = {}) => Object.freeze({ kind: 'guide', index, total, caption, text, boards: Object.freeze([...boards]) });
export const createStagePickerViewModel = createStagePickerModel;
export const createSpeedViewModel = createSpeedRunModel;
