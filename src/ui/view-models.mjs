// 開発側UIへ渡す読み取り専用view model。DOMやイベント登録を持たない。
const freezeModel=model=>Object.freeze({...model});
export function createStagePickerViewModel({ title='', stages=[], selectedIndex=0, canClose=true }={}) { return freezeModel({ kind:'stage-picker', title, stages:[...stages], selectedIndex, canClose }); }
export function createClearMessageViewModel({ heading='', context='', nextLabel='', canContinue=false }={}) { return freezeModel({ kind:'clear-message', heading, context, nextLabel, canContinue }); }
export function createSpeedViewModel({ variant='', current=0, total=0, elapsedMs=0, paused=false }={}) { return freezeModel({ kind:'speed', variant, current, total, elapsedMs, paused }); }
