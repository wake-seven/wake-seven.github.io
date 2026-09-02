// ===== クリア後の状態遷移 =====
// クリア演出の表示と、次の問題/コースへの遷移を進行UI本体から分離する。
// clearShown は保存・進行用の状態なので、表示予約の重複防止には使わない。
// 演出とタイマーの段階を名前で持ち、同じクリアに対する再描画が
// 「演出を再生し直す」「ダイアログを前倒しする」ことを防ぐ。
const CLEAR_FLOW_PHASE=Object.freeze({idle:'idle',celebrating:'celebrating',dialogPending:'dialog-pending',dialog:'dialog'});
let clearFlowPhase=CLEAR_FLOW_PHASE.idle;
// クリア周期を識別する世代番号。表示予約がキャンセルされても、古い
// callback が後から実行された場合に現在の盤面へ作用しないようにする。
let clearFlowCycle=1;
function resetClearFlow(){
  clearFlowCycle++;
  clearFlowPhase=CLEAR_FLOW_PHASE.idle;
  clearUiEffectTimers('clear-transition');
}
function beginClearFlow(){
  if(clearFlowPhase!==CLEAR_FLOW_PHASE.idle)return false;
  clearFlowPhase=CLEAR_FLOW_PHASE.celebrating;
  return clearFlowCycle;
}
function scheduleClearFlowDialog(callback,delay,cycle=clearFlowCycle){
  if(clearFlowPhase!==CLEAR_FLOW_PHASE.celebrating)return false;
  clearFlowPhase=CLEAR_FLOW_PHASE.dialogPending;
  setUiEffectTimer('clear-transition','show-dialog',()=>{
    if(cycle!==clearFlowCycle||clearFlowPhase!==CLEAR_FLOW_PHASE.dialogPending)return;
    callback();
  },delay);
  return true;
}
function finishClearFlowDialog(){clearFlowPhase=CLEAR_FLOW_PHASE.dialog;}
function advanceAfterClear(){
  makerButtonBlockedUntil=performance.now()+600;
  clearUiEffectTimers('maker-reveal');
  setUiEffectTimer('maker-reveal','unlock',()=>{makerButtonBlockedUntil=0;renderStageNav();},600);
  if(isMode('free')) startFree();
  else if(isMode('custom')){setPosition(currentInitialState,currentInitialPar);renderStageNav();}
  else if(isMode('satori')){if(satoriIndex<SATORI_STAGES.length-1)loadSatoriStage(satoriIndex+1);else openSatoriPicker();}
  else if(isMode('mastery')){if(extraIndex===EXTRA_STAGES.length-1)restoreFreeSession();else loadExtraStage(extraIndex+1);}
  else if(stageIndex===ACADEMY_STAGE_COUNT-1&&academyCleared()) showMasterDialog('primary');
  else if(stageIndex===STAGES.length-1&&allPrimaryCleared()) showMasterDialog('intermediate');
  else if(stageIndex===STAGES.length-1) restoreFreeSession();
  else{const before=clearContentBefore(false,stageIndex+1);if(before?.dialog){openChainedDialog(before.dialog);return;}loadStage(stageIndex+1);}
}
let returnToClearCard=false,twoMovePatternsReturnTarget=null,twoMoveDetailReturnTarget=null,guideHubReturn=false;
function returnToClearDialog(){
  returnToClearCard=false;$('clearDialogMessage').textContent=clearDialogHeading();renderClearStageContext();renderClearTip();renderClearQuiz();
  $('clearNext').disabled=false;
  try{renderBoardQuiz('boardQuiz',boardQuizConfigForCurrent(),{requireAnswer:true});}
  catch(error){console.error('clear board quiz render failed',error);$('boardQuiz').hidden=true;}
  $('clearNext').hidden=false;$('clearDialog').hidden=false;$('clearTipLink').focus();
}

// Keep this extracted fragment explicit in the source audit while it remains
// concatenated into the single published native-module script.
export {};
